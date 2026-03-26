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
import { portfolios, trades, signals } from "@marketpulse/db/schema";
import { eq, and, desc } from "drizzle-orm";

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
