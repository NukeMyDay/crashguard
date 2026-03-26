/**
 * Portfolio Tracker — Module 6
 *
 * Paper trading simulator. Tracks signal performance against a $100k model portfolio.
 * Routes:
 *   GET  /v1/portfolio           — holdings, unrealized P&L, current value
 *   POST /v1/portfolio/trade     — execute a paper trade
 *   GET  /v1/portfolio/performance — returns vs SPY benchmark as PerfPoint[]
 */
import { Hono } from "hono";
import { db } from "@marketpulse/db/client";
import { portfolios, trades, signals, marketRegimes, marketScores } from "@marketpulse/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { computeMomentumRankings } from "./momentum.js";

// ─── Stress Test Config ────────────────────────────────────────────────────────

type ScenarioKey = "crash_20" | "crash_40" | "2008" | "2020" | "2022" | "custom";

interface AssetMultipliers { equities: number; bonds: number; gold: number; cash: number }

const SCENARIOS: Record<Exclude<ScenarioKey, "custom">, AssetMultipliers> = {
  crash_20: { equities: -0.20, bonds: +0.05, gold: +0.08, cash: 0 },
  crash_40: { equities: -0.40, bonds: +0.10, gold: +0.15, cash: 0 },
  "2008":   { equities: -0.55, bonds: +0.12, gold: +0.05, cash: 0 },
  "2020":   { equities: -0.34, bonds: +0.08, gold: +0.05, cash: 0 },
  "2022":   { equities: -0.25, bonds: -0.15, gold: -0.02, cash: 0 },
};

const BOND_TICKERS = new Set(["TLT", "BND", "AGG", "IEF", "SHY"]);
const GOLD_TICKERS = new Set(["GLD", "IAU"]);
const CASH_TICKERS = new Set(["SHV", "BIL", "SGOV"]);

function classifyAsset(ticker: string): keyof AssetMultipliers {
  if (BOND_TICKERS.has(ticker)) return "bonds";
  if (GOLD_TICKERS.has(ticker)) return "gold";
  if (CASH_TICKERS.has(ticker)) return "cash";
  return "equities";
}

export const portfolioRouter = new Hono();

const INITIAL_CAPITAL = 100000;

// ─── Helper: fetch current price from Yahoo Finance ───────────────────────────

async function fetchCurrentPrice(symbol: string): Promise<number | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const res = await fetch(url, { headers: { "User-Agent": "MarketPulse/1.0" } });
    if (!res.ok) return null;
    const data = await res.json() as any;
    return data?.chart?.result?.[0]?.meta?.regularMarketPrice ?? null;
  } catch {
    return null;
  }
}

// ─── Helper: get or create default portfolio ──────────────────────────────────

async function getOrCreateDefaultPortfolio(): Promise<typeof portfolios.$inferSelect> {
  const existing = await db
    .select()
    .from(portfolios)
    .where(and(eq(portfolios.isActive, true), eq(portfolios.type, "paper")))
    .orderBy(portfolios.createdAt)
    .limit(1);

  if (existing[0]) return existing[0];

  const [created] = await db
    .insert(portfolios)
    .values({
      name: "Paper Portfolio",
      description: "Automated paper trading simulator tracking signal performance",
      type: "paper",
      initialCapital: String(INITIAL_CAPITAL),
      currentValue: String(INITIAL_CAPITAL),
      currency: "USD",
      isActive: true,
      config: {},
    })
    .returning();

  return created;
}

// ─── GET /v1/portfolio ────────────────────────────────────────────────────────
// Shape: { initialCapital, currentValue, totalReturn, holdings[], trades[] }
// holdings[]: { instrument, quantity, avgPrice, currentPrice, pnl, pnlPct }
// trades[]:   { id, date, instrument, action, quantity, price }

portfolioRouter.get("/", async (c) => {
  const portfolio = await getOrCreateDefaultPortfolio();

  // Load all open trades
  const openTrades = await db
    .select()
    .from(trades)
    .where(and(eq(trades.portfolioId, portfolio.id), eq(trades.status, "open")))
    .orderBy(desc(trades.entryAt));

  // Group open trades into holdings by symbol+direction
  const grouped = new Map<string, { direction: string; totalQty: number; totalCost: number }>();
  for (const t of openTrades) {
    const key = t.symbol;
    const qty = Number(t.quantity);
    const price = Number(t.entryPrice);
    const existing = grouped.get(key);
    if (existing) {
      existing.totalQty += qty;
      existing.totalCost += qty * price;
    } else {
      grouped.set(key, { direction: t.direction, totalQty: qty, totalCost: qty * price });
    }
  }

  // Build holdings with live prices
  const holdings: Array<{
    instrument: string;
    quantity: number;
    avgPrice: number;
    currentPrice: number;
    pnl: number;
    pnlPct: number;
  }> = [];

  let totalUnrealizedPnl = 0;
  let cashUsed = 0;

  for (const [symbol, pos] of grouped.entries()) {
    const avgPrice = pos.totalCost / pos.totalQty;
    const currentPrice = (await fetchCurrentPrice(symbol)) ?? avgPrice;
    const pnl = pos.direction === "long"
      ? (currentPrice - avgPrice) * pos.totalQty
      : (avgPrice - currentPrice) * pos.totalQty;
    const pnlPct = (pnl / pos.totalCost) * 100;

    cashUsed += pos.totalCost;
    totalUnrealizedPnl += pnl;

    holdings.push({
      instrument: symbol,
      quantity: pos.totalQty,
      avgPrice: Math.round(avgPrice * 100) / 100,
      currentPrice: Math.round(currentPrice * 100) / 100,
      pnl: Math.round(pnl * 100) / 100,
      pnlPct: Math.round(pnlPct * 100) / 100,
    });
  }

  // Load recent closed trades for trade history
  const closedTrades = await db
    .select()
    .from(trades)
    .where(and(eq(trades.portfolioId, portfolio.id), eq(trades.status, "closed")))
    .orderBy(desc(trades.exitAt))
    .limit(50);

  const tradeHistory = closedTrades.map((t) => ({
    id: t.id,
    date: (t.exitAt ?? t.entryAt).toISOString(),
    instrument: t.symbol,
    action: t.direction === "long" ? "BUY" : "SHORT",
    quantity: Number(t.quantity),
    price: Number(t.exitPrice ?? t.entryPrice),
  }));

  const currentValue = Number(portfolio.initialCapital) - cashUsed + cashUsed + totalUnrealizedPnl;
  const totalReturn = ((currentValue - INITIAL_CAPITAL) / INITIAL_CAPITAL) * 100;

  // Update stored currentValue
  await db
    .update(portfolios)
    .set({ currentValue: String(Math.round(currentValue * 100) / 100) })
    .where(eq(portfolios.id, portfolio.id));

  return c.json({
    portfolioId: portfolio.id,
    name: portfolio.name,
    initialCapital: Number(portfolio.initialCapital),
    currentValue: Math.round(currentValue * 100) / 100,
    cashBalance: Math.round((Number(portfolio.initialCapital) - cashUsed) * 100) / 100,
    totalReturn: Math.round(totalReturn * 100) / 100,
    unrealizedPnl: Math.round(totalUnrealizedPnl * 100) / 100,
    holdings,
    trades: tradeHistory,
  });
});

// ─── POST /v1/portfolio/trade ─────────────────────────────────────────────────

portfolioRouter.post("/trade", async (c) => {
  const body = await c.req.json() as {
    instrument: string;
    action: string; // "BUY" | "SELL" | "SHORT" | "CLOSE" (case-insensitive)
    quantity: number;
    price?: number;
    signalId?: string;
  };

  const { quantity, signalId } = body;
  const instrument = body.instrument?.toUpperCase();
  const action = body.action?.toUpperCase();

  if (!instrument || !action || !quantity || quantity <= 0) {
    return c.json({ error: "instrument, action, and quantity (> 0) are required" }, 400);
  }

  const validActions = ["BUY", "SELL", "SHORT", "CLOSE"];
  if (!validActions.includes(action)) {
    return c.json({ error: `Invalid action. Must be one of: ${validActions.join(", ")}` }, 400);
  }

  const portfolio = await getOrCreateDefaultPortfolio();

  // Fetch current price if not provided
  let price = body.price;
  if (!price) {
    const fetched = await fetchCurrentPrice(instrument);
    if (!fetched) {
      return c.json({ error: `Cannot fetch current price for ${instrument}` }, 422);
    }
    price = fetched;
  }

  const direction: "long" | "short" = (action === "BUY" || action === "CLOSE") ? "long" : "short";

  // For sells/closes: find and close open position
  if (action === "SELL" || action === "CLOSE") {
    const openPositions = await db
      .select()
      .from(trades)
      .where(
        and(
          eq(trades.portfolioId, portfolio.id),
          eq(trades.symbol, instrument),
          eq(trades.status, "open")
        )
      );

    if (openPositions.length === 0) {
      return c.json({ error: `No open position found for ${instrument}` }, 422);
    }

    for (const pos of openPositions) {
      const entryPrice = Number(pos.entryPrice);
      const qty = Number(pos.quantity);
      const pnl = pos.direction === "long"
        ? (price! - entryPrice) * qty
        : (entryPrice - price!) * qty;
      const pnlPct = (pnl / (entryPrice * qty)) * 100;

      await db
        .update(trades)
        .set({
          exitPrice: String(price),
          exitAt: new Date(),
          status: "closed",
          pnl: String(Math.round(pnl * 100) / 100),
          pnlPercent: String(Math.round(pnlPct * 100) / 100),
        })
        .where(eq(trades.id, pos.id));
    }

    return c.json({
      message: `Closed ${openPositions.length} position(s) for ${instrument} at $${price}`,
    });
  }

  // For buys: check cash available
  if (action === "BUY" || action === "SHORT") {
    const openTrades = await db
      .select()
      .from(trades)
      .where(and(eq(trades.portfolioId, portfolio.id), eq(trades.status, "open")));

    const cashUsed = openTrades.reduce(
      (sum, t) => sum + Number(t.entryPrice) * Number(t.quantity),
      0
    );
    const cashBalance = Number(portfolio.initialCapital) - cashUsed;
    const tradeValue = price! * quantity;

    if (action === "BUY" && tradeValue > cashBalance) {
      return c.json({
        error: `Insufficient cash. Need $${tradeValue.toFixed(2)}, available $${cashBalance.toFixed(2)}`,
      }, 422);
    }
  }

  const [newTrade] = await db
    .insert(trades)
    .values({
      portfolioId: portfolio.id,
      signalId: signalId ?? null,
      symbol: instrument,
      direction,
      entryPrice: String(price),
      quantity: String(quantity),
      entryAt: new Date(),
      status: "open",
      metadata: { action, executedVia: "paper" },
    })
    .returning();

  return c.json({
    message: `${action} ${quantity} ${instrument} @ $${price}`,
    tradeId: newTrade.id,
    symbol: instrument,
    direction,
    quantity,
    price,
    value: Math.round(price! * quantity * 100) / 100,
  });
});

// ─── GET /v1/portfolio/performance ────────────────────────────────────────────
// Shape: PerfPoint[] = { date, portfolioValue, spyValue? }[]

portfolioRouter.get("/performance", async (c) => {
  const portfolio = await getOrCreateDefaultPortfolio();

  // All closed trades grouped by exit date for cumulative P&L chart
  const closedTrades = await db
    .select()
    .from(trades)
    .where(and(eq(trades.portfolioId, portfolio.id), eq(trades.status, "closed")))
    .orderBy(trades.exitAt);

  // Build daily cumulative portfolio value
  const dailyPnl = new Map<string, number>();
  for (const t of closedTrades) {
    const date = (t.exitAt ?? t.entryAt).toISOString().split("T")[0];
    dailyPnl.set(date, (dailyPnl.get(date) ?? 0) + Number(t.pnl ?? 0));
  }

  // Fetch SPY data over same period for benchmark
  let spyByDate = new Map<string, number>();
  try {
    const startTs = Math.floor(portfolio.createdAt.getTime() / 1000);
    const endTs = Math.floor(Date.now() / 1000);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/SPY?interval=1d&period1=${startTs}&period2=${endTs}`;
    const res = await fetch(url, { headers: { "User-Agent": "MarketPulse/1.0" } });
    if (res.ok) {
      const data = await res.json() as any;
      const result = data?.chart?.result?.[0];
      if (result) {
        const timestamps: number[] = result.timestamp ?? [];
        const closes: number[] = (result.indicators?.quote?.[0]?.close ?? []).filter((c: any) => c != null);
        const spyStart = closes[0];
        timestamps.forEach((ts, i) => {
          if (closes[i] != null && spyStart > 0) {
            const date = new Date(ts * 1000).toISOString().split("T")[0];
            spyByDate.set(date, INITIAL_CAPITAL * (closes[i] / spyStart));
          }
        });
      }
    }
  } catch {
    // SPY fetch failed — no benchmark
  }

  // Build chart data: one point per day with cumulative portfolio value
  const sortedDates = Array.from(new Set([...dailyPnl.keys(), ...spyByDate.keys()])).sort();
  let cumulativePnl = 0;
  const chartData = sortedDates.map((date) => {
    cumulativePnl += dailyPnl.get(date) ?? 0;
    return {
      date,
      portfolioValue: Math.round((INITIAL_CAPITAL + cumulativePnl) * 100) / 100,
      spyValue: spyByDate.has(date) ? Math.round(spyByDate.get(date)! * 100) / 100 : undefined,
    };
  });

  return c.json(chartData);
});

// ─── GET /v1/portfolio/metrics ────────────────────────────────────────────────
// Sharpe ratio, win rate, drawdown, and trade stats from closed paper trades

portfolioRouter.get("/metrics", async (c) => {
  const portfolio = await getOrCreateDefaultPortfolio();

  const closedTrades = await db
    .select()
    .from(trades)
    .where(and(eq(trades.portfolioId, portfolio.id), eq(trades.status, "closed")))
    .orderBy(trades.exitAt);

  if (closedTrades.length === 0) {
    return c.json({
      sharpe30d: null, sharpe90d: null, totalTrades: 0,
      winRate: null, avgReturnPct: null, maxDrawdownPct: null,
      bestTrade: null, worstTrade: null,
    });
  }

  const RISK_FREE_DAILY = 0.045 / 252;

  function sharpe(returns: number[]): number {
    if (returns.length < 2) return 0;
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length;
    const std = Math.sqrt(variance);
    return std === 0 ? 0 : ((mean - RISK_FREE_DAILY) / std) * Math.sqrt(252);
  }

  const now = Date.now();
  const ms30d = 30 * 24 * 60 * 60 * 1000;
  const ms90d = 90 * 24 * 60 * 60 * 1000;

  const returns30d: number[] = [];
  const returns90d: number[] = [];
  let wins = 0;
  let cumulativePnl = 0;
  let peakPnl = 0;
  let maxDrawdown = 0;

  let bestTrade: { ticker: string; returnPct: number } | null = null;
  let worstTrade: { ticker: string; returnPct: number } | null = null;

  for (const t of closedTrades) {
    const pnlPct = Number(t.pnlPercent ?? 0);
    const returnDecimal = pnlPct / 100;
    const exitTime = (t.exitAt ?? t.entryAt).getTime();

    if (now - exitTime <= ms30d) returns30d.push(returnDecimal);
    if (now - exitTime <= ms90d) returns90d.push(returnDecimal);

    if (pnlPct > 0) wins++;

    cumulativePnl += Number(t.pnl ?? 0);
    if (cumulativePnl > peakPnl) peakPnl = cumulativePnl;
    const drawdown = peakPnl > 0 ? ((peakPnl - cumulativePnl) / peakPnl) * 100 : 0;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;

    if (!bestTrade || pnlPct > bestTrade.returnPct) {
      bestTrade = { ticker: t.symbol, returnPct: Math.round(pnlPct * 100) / 100 };
    }
    if (!worstTrade || pnlPct < worstTrade.returnPct) {
      worstTrade = { ticker: t.symbol, returnPct: Math.round(pnlPct * 100) / 100 };
    }
  }

  const totalTrades = closedTrades.length;
  const allReturns = closedTrades.map((t) => Number(t.pnlPercent ?? 0) / 100);
  const avgReturnPct = allReturns.length > 0
    ? Math.round((allReturns.reduce((a, b) => a + b, 0) / allReturns.length) * 10000) / 100
    : null;

  return c.json({
    sharpe30d: returns30d.length >= 2 ? Math.round(sharpe(returns30d) * 100) / 100 : null,
    sharpe90d: returns90d.length >= 2 ? Math.round(sharpe(returns90d) * 100) / 100 : null,
    totalTrades,
    winRate: Math.round((wins / totalTrades) * 10000) / 10000,
    avgReturnPct,
    maxDrawdownPct: Math.round(-maxDrawdown * 100) / 100,
    bestTrade,
    worstTrade,
  });
});

// ─── POST /v1/portfolio/stress-test ───────────────────────────────────────────

portfolioRouter.post("/stress-test", async (c) => {
  const body = await c.req.json() as {
    scenario: ScenarioKey;
    customDrop?: number;
  };

  const { scenario } = body;
  const validScenarios: ScenarioKey[] = ["crash_20", "crash_40", "2008", "2020", "2022", "custom"];
  if (!scenario || !validScenarios.includes(scenario)) {
    return c.json({ error: `scenario must be one of: ${validScenarios.join(", ")}` }, 400);
  }

  if (scenario === "custom" && (body.customDrop == null || body.customDrop >= 0)) {
    return c.json({ error: "customDrop must be a negative number (e.g. -15)" }, 400);
  }

  let multipliers: AssetMultipliers;
  if (scenario === "custom") {
    const drop = body.customDrop! / 100;
    multipliers = { equities: drop, bonds: Math.abs(drop) * 0.2, gold: Math.abs(drop) * 0.1, cash: 0 };
  } else {
    multipliers = SCENARIOS[scenario];
  }

  const portfolio = await getOrCreateDefaultPortfolio();

  // Load open positions
  const openTrades = await db
    .select()
    .from(trades)
    .where(and(eq(trades.portfolioId, portfolio.id), eq(trades.status, "open")));

  // Group into holdings by symbol
  const grouped = new Map<string, { direction: string; totalQty: number; totalCost: number }>();
  for (const t of openTrades) {
    const key = t.symbol;
    const qty = Number(t.quantity);
    const price = Number(t.entryPrice);
    const existing = grouped.get(key);
    if (existing) {
      existing.totalQty += qty;
      existing.totalCost += qty * price;
    } else {
      grouped.set(key, { direction: t.direction, totalQty: qty, totalCost: qty * price });
    }
  }

  let totalValueBefore = 0;
  let totalValueAfter = 0;

  const positions: Array<{
    ticker: string;
    quantity: number;
    currentValue: number;
    stressedValue: number;
    loss: number;
    lossPct: number;
  }> = [];

  for (const [ticker, pos] of grouped.entries()) {
    const avgPrice = pos.totalCost / pos.totalQty;
    const currentPrice = (await fetchCurrentPrice(ticker)) ?? avgPrice;
    const currentValue = currentPrice * pos.totalQty;

    const assetClass = classifyAsset(ticker);
    const change = multipliers[assetClass];
    const stressedPrice = currentPrice * (1 + change);
    const stressedValue = stressedPrice * pos.totalQty;
    const loss = stressedValue - currentValue;
    const lossPct = (loss / currentValue) * 100;

    totalValueBefore += currentValue;
    totalValueAfter += stressedValue;

    positions.push({
      ticker,
      quantity: pos.totalQty,
      currentValue: Math.round(currentValue * 100) / 100,
      stressedValue: Math.round(stressedValue * 100) / 100,
      loss: Math.round(loss * 100) / 100,
      lossPct: Math.round(lossPct * 100) / 100,
    });
  }

  const totalLoss = totalValueAfter - totalValueBefore;
  const totalLossPct = totalValueBefore > 0 ? (totalLoss / totalValueBefore) * 100 : 0;

  // Identify worst position (biggest loss) and best hedge (biggest gain)
  const sorted = [...positions].sort((a, b) => a.loss - b.loss);
  const worstPosition = sorted[0]?.ticker ?? null;
  const bestHedge = sorted.findLast((p) => p.loss > 0)?.ticker ?? null;

  return c.json({
    scenario,
    totalValueBefore: Math.round(totalValueBefore * 100) / 100,
    totalValueAfter: Math.round(totalValueAfter * 100) / 100,
    totalLoss: Math.round(totalLoss * 100) / 100,
    totalLossPct: Math.round(totalLossPct * 100) / 100,
    positions,
    worstPosition,
    bestHedge,
  });
});

// ─── GET /v1/portfolio/rebalance-advice ────────────────────────────────────────
// Generates portfolio rebalancing advice based on momentum, regime, and crash score.

portfolioRouter.get("/rebalance-advice", async (c) => {
  const portfolio = await getOrCreateDefaultPortfolio();

  // 1. Current open positions grouped by symbol
  const openTrades = await db
    .select()
    .from(trades)
    .where(and(eq(trades.portfolioId, portfolio.id), eq(trades.status, "open")));

  const grouped = new Map<string, { direction: string; totalQty: number; totalCost: number }>();
  for (const t of openTrades) {
    const key = t.symbol;
    const qty = Number(t.quantity);
    const price = Number(t.entryPrice);
    const existing = grouped.get(key);
    if (existing) {
      existing.totalQty += qty;
      existing.totalCost += qty * price;
    } else {
      grouped.set(key, { direction: t.direction, totalQty: qty, totalCost: qty * price });
    }
  }

  if (grouped.size === 0) {
    return c.json({ advice: [], regime: null, crashScore: null, generatedAt: new Date().toISOString() });
  }

  // Build positions with live prices
  const positions: Array<{ ticker: string; value: number; weight: number }> = [];
  let totalValue = 0;

  for (const [symbol, pos] of grouped.entries()) {
    const currentPrice = (await fetchCurrentPrice(symbol)) ?? (pos.totalCost / pos.totalQty);
    const value = currentPrice * pos.totalQty;
    totalValue += value;
    positions.push({ ticker: symbol, value, weight: 0 });
  }

  for (const pos of positions) {
    pos.weight = totalValue > 0 ? pos.value / totalValue : 0;
  }

  // 2. Current regime (US market)
  const regimeRows = await db
    .select()
    .from(marketRegimes)
    .where(eq(marketRegimes.market, "us"))
    .orderBy(desc(marketRegimes.detectedAt))
    .limit(1);
  const regime = (regimeRows[0]?.regime as string | undefined) ?? null;

  // 3. Crash score (global)
  const scoreRows = await db
    .select()
    .from(marketScores)
    .where(eq(marketScores.market, "global"))
    .orderBy(desc(marketScores.calculatedAt))
    .limit(1);
  const crashScore = scoreRows[0] ? Number(scoreRows[0].crashScore) : null;

  // 4. Momentum rankings (cached)
  const momentumRankings = await computeMomentumRankings();

  // 5. Generate advice
  const advice: Array<{
    ticker: string;
    action: string;
    currentWeightPct: number;
    suggestedWeightPct: number;
    reason: string;
  }> = [];

  for (const pos of positions) {
    const momentum = momentumRankings.find((m) => m.ticker === pos.ticker);
    const weightPct = pos.weight * 100;

    // Overweight high momentum in bull regime
    if (regime === "bull" && momentum?.signal === "strong_buy" && weightPct < 15) {
      advice.push({
        ticker: pos.ticker,
        action: "increase",
        currentWeightPct: Math.round(weightPct * 100) / 100,
        suggestedWeightPct: 15,
        reason: "Strong momentum + bull regime",
      });
      continue;
    }

    // Reduce weak momentum in bear regime
    if (regime === "bear" && momentum?.signal === "avoid" && weightPct > 5) {
      advice.push({
        ticker: pos.ticker,
        action: "reduce",
        currentWeightPct: Math.round(weightPct * 100) / 100,
        suggestedWeightPct: 5,
        reason: "Weak momentum + bear regime",
      });
      continue;
    }

    // Trim to raise cash when crash risk is high
    if (crashScore != null && crashScore > 70 && pos.ticker !== "SHV" && weightPct > 10) {
      const suggestedWeightPct = Math.round(weightPct * 0.7 * 100) / 100;
      advice.push({
        ticker: pos.ticker,
        action: "trim",
        currentWeightPct: Math.round(weightPct * 100) / 100,
        suggestedWeightPct,
        reason: `High crash risk (${crashScore.toFixed(0)}) — raise cash buffer`,
      });
    }
  }

  return c.json({
    advice,
    regime,
    crashScore,
    generatedAt: new Date().toISOString(),
  });
});
