/**
 * Signal Generator — Module 3
 *
 * For each active strategy, generates concrete trade signals using current
 * indicator data and Yahoo Finance quotes. Signals are inserted into the DB
 * with entry price, rationale, and strength (0–100).
 */
import { db } from "@marketpulse/db/client";
import { strategies, signals, indicators, indicatorValues, marketRegimes } from "@marketpulse/db/schema";
import { eq, and, desc, gte, inArray } from "drizzle-orm";
import { getCalibrationFactor, applyCalibration } from "./confidence-calibrator.js";

type StrategyType = "momentum" | "mean_reversion" | "sector_rotation" | "risk_off" | "short" | "penny";

// ─── Yahoo Finance price + RSI fetch ─────────────────────────────────────────

interface QuoteData {
  symbol: string;
  price: number;
  rsi14: number | null;
  changePercent: number;
  volume: number;
  avgVolume30d: number | null;
}

async function fetchQuoteWithRSI(ticker: string): Promise<QuoteData | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=60d`;
    const res = await fetch(url, {
      headers: { "User-Agent": "MarketPulse/1.0" },
    });
    if (!res.ok) return null;
    const data = await res.json() as any;
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const closes: number[] = (result.indicators?.quote?.[0]?.close ?? []).filter((c: any) => c != null);
    const volumes: number[] = (result.indicators?.quote?.[0]?.volume ?? []).filter((v: any) => v != null);

    if (closes.length < 2) return null;

    const price = closes[closes.length - 1];
    const prevClose = closes[closes.length - 2];
    const changePercent = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;

    // Compute RSI-14
    const rsi14 = computeRSI(closes, 14);

    // 30-day average volume
    const avgVolume30d =
      volumes.length >= 30
        ? volumes.slice(-30).reduce((a, b) => a + b, 0) / 30
        : null;

    const volume = volumes[volumes.length - 1] ?? 0;

    return { symbol: ticker, price, rsi14, changePercent, volume, avgVolume30d };
  } catch {
    return null;
  }
}

function computeRSI(closes: number[], period: number): number | null {
  if (closes.length < period + 1) return null;

  let avgGain = 0;
  let avgLoss = 0;

  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) avgGain += diff;
    else avgLoss += Math.abs(diff);
  }

  avgGain /= period;
  avgLoss /= period;

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Math.round((100 - 100 / (1 + rs)) * 100) / 100;
}

// ─── Candidate instruments per strategy ──────────────────────────────────────

const MOMENTUM_CANDIDATES = ["QQQ", "SMH", "SOXX", "XLK", "NVDA", "MSFT", "AAPL", "META", "AMZN"];
const MEAN_REVERSION_CANDIDATES = ["SPY", "XLF", "XLE", "XLV", "BAC", "XOM", "CVX", "WFC"];
const SECTOR_ROTATION_CANDIDATES = ["XLK", "XLF", "XLE", "XLV", "XLI", "XLP", "XLU", "XLRE", "XLC", "XLY"];
const RISK_OFF_CANDIDATES = ["GLD", "TLT", "SHV", "BIL", "USMV", "SPLV"];
const SHORT_CANDIDATES = ["QQQ", "SPY", "XLK", "XLY", "ARKK", "HYG"];
const PENNY_CANDIDATES: string[] = []; // populated from scanner_results

// ─── Signal generation logic per strategy type ───────────────────────────────

interface GeneratedSignal {
  symbol: string;
  direction: "long" | "short";
  strength: number;
  price: number;
  stopLoss: number;
  targetPrice: number;
  confidenceScore: number;
  positionSizePct: number;
  riskFactors: string[];
  rationale: string;
  metadata: Record<string, unknown>;
}

// ─── Enhanced signal field helpers ───────────────────────────────────────────

function computeEnhancedFields(
  direction: "long" | "short",
  price: number,
  strength: number,
  indicatorMap: Map<string, number>
): {
  stopLoss: number;
  targetPrice: number;
  confidenceScore: number;
  positionSizePct: number;
  riskFactors: string[];
} {
  const vix = indicatorMap.get("vix") ?? 50;

  // Stop-loss: 5–8% from entry, wider when VIX is elevated
  const baseStop = 0.05 + (vix / 100) * 0.03; // 5–8%
  const stopDistance = price * baseStop;

  const stopLoss =
    direction === "long"
      ? parseFloat((price - stopDistance).toFixed(6))
      : parseFloat((price + stopDistance).toFixed(6));

  // Target: 1.5x–2.5x the stop distance (risk/reward)
  const rrRatio = 1.5 + (strength / 100) * 1.0; // 1.5–2.5
  const targetDistance = stopDistance * rrRatio;
  const targetPrice =
    direction === "long"
      ? parseFloat((price + targetDistance).toFixed(6))
      : parseFloat((price - targetDistance).toFixed(6));

  // Confidence: strength + bonus for regime alignment (using vix as proxy — lower vix = more bullish alignment for longs)
  const regimeBonus = direction === "long" ? Math.max(0, (100 - vix) / 4) : vix / 4;
  const confidenceScore = Math.min(100, Math.round(strength * 0.7 + regimeBonus));

  // Position size: Kelly approximation — max 5% per position
  const positionSizePct = parseFloat(
    Math.min(5, (strength / 100) * 0.1 * 100).toFixed(2)
  );

  // Risk factors
  const riskFactors: string[] = [];
  if (vix > 60) riskFactors.push("Extreme VIX environment");
  else if (vix > 40) riskFactors.push("Elevated VIX environment");

  const yieldCurve = indicatorMap.get("yield-curve-2y10y");
  if (yieldCurve !== undefined && yieldCurve > 60) riskFactors.push("Inverted yield curve");

  const creditSpreads = indicatorMap.get("credit-spreads-hy");
  if (creditSpreads !== undefined && creditSpreads > 65) riskFactors.push("Wide credit spreads");

  const fearGreed = indicatorMap.get("fear-greed-index");
  if (fearGreed !== undefined && fearGreed > 70) riskFactors.push("Extreme fear sentiment");

  return { stopLoss, targetPrice, confidenceScore, positionSizePct, riskFactors };
}

async function generateMomentumSignals(indicatorMap: Map<string, number>): Promise<GeneratedSignal[]> {
  const results: GeneratedSignal[] = [];

  for (const ticker of MOMENTUM_CANDIDATES) {
    const quote = await fetchQuoteWithRSI(ticker);
    if (!quote) continue;

    // Momentum: RSI between 50–70 (trending up, not overbought) + positive change
    if (quote.rsi14 !== null && quote.rsi14 >= 50 && quote.rsi14 <= 72 && quote.changePercent > 0) {
      const strength = Math.min(100, Math.round(((quote.rsi14 - 50) / 22) * 60 + quote.changePercent * 5));
      const enhanced = computeEnhancedFields("long", quote.price, strength, indicatorMap);
      results.push({
        symbol: ticker,
        direction: "long",
        strength,
        price: quote.price,
        ...enhanced,
        rationale: `Momentum: RSI ${quote.rsi14.toFixed(1)} in bullish zone, +${quote.changePercent.toFixed(2)}% today`,
        metadata: { rsi14: quote.rsi14, changePercent: quote.changePercent, strategy: "momentum" },
      });
    }
    await new Promise((r) => setTimeout(r, 40));
  }

  // Return top 3 by strength
  return results.sort((a, b) => b.strength - a.strength).slice(0, 3);
}

async function generateMeanReversionSignals(indicatorMap: Map<string, number>): Promise<GeneratedSignal[]> {
  const results: GeneratedSignal[] = [];

  for (const ticker of MEAN_REVERSION_CANDIDATES) {
    const quote = await fetchQuoteWithRSI(ticker);
    if (!quote) continue;

    // Mean reversion: RSI < 35 (oversold), price declined
    if (quote.rsi14 !== null && quote.rsi14 < 35) {
      const strength = Math.min(100, Math.round(((35 - quote.rsi14) / 35) * 80 + 20));
      const enhanced = computeEnhancedFields("long", quote.price, strength, indicatorMap);
      results.push({
        symbol: ticker,
        direction: "long",
        strength,
        price: quote.price,
        ...enhanced,
        rationale: `Mean Reversion: RSI ${quote.rsi14.toFixed(1)} oversold, bounce candidate`,
        metadata: { rsi14: quote.rsi14, changePercent: quote.changePercent, strategy: "mean_reversion" },
      });
    }
    await new Promise((r) => setTimeout(r, 40));
  }

  return results.sort((a, b) => b.strength - a.strength).slice(0, 3);
}

async function generateSectorRotationSignals(indicatorMap: Map<string, number>): Promise<GeneratedSignal[]> {
  const results: GeneratedSignal[] = [];
  const quotes: { ticker: string; quote: QuoteData }[] = [];

  for (const ticker of SECTOR_ROTATION_CANDIDATES) {
    const quote = await fetchQuoteWithRSI(ticker);
    if (quote) quotes.push({ ticker, quote });
    await new Promise((r) => setTimeout(r, 40));
  }

  if (quotes.length === 0) return [];

  // Sort by % change — top performers are the rotation targets
  const sorted = quotes.sort((a, b) => b.quote.changePercent - a.quote.changePercent);
  const top3 = sorted.slice(0, 3);
  const avgChange = sorted.reduce((s, q) => s + q.quote.changePercent, 0) / sorted.length;

  for (const { ticker, quote } of top3) {
    if (quote.changePercent > avgChange + 0.5) {
      const strength = Math.min(100, Math.round(60 + (quote.changePercent - avgChange) * 10));
      const enhanced = computeEnhancedFields("long", quote.price, strength, indicatorMap);
      results.push({
        symbol: ticker,
        direction: "long",
        strength,
        price: quote.price,
        ...enhanced,
        rationale: `Sector Rotation: ${ticker} outperforming peers by ${(quote.changePercent - avgChange).toFixed(2)}%`,
        metadata: { changePercent: quote.changePercent, avgSectorChange: avgChange, strategy: "sector_rotation" },
      });
    }
  }

  return results;
}

async function generateRiskOffSignals(indicatorMap: Map<string, number>): Promise<GeneratedSignal[]> {
  const results: GeneratedSignal[] = [];

  for (const ticker of RISK_OFF_CANDIDATES) {
    const quote = await fetchQuoteWithRSI(ticker);
    if (!quote) continue;

    // Risk-off: any safe haven moving up
    if (quote.changePercent > 0) {
      const strength = Math.min(100, Math.round(50 + quote.changePercent * 15));
      const enhanced = computeEnhancedFields("long", quote.price, strength, indicatorMap);
      results.push({
        symbol: ticker,
        direction: "long",
        strength,
        price: quote.price,
        ...enhanced,
        rationale: `Risk-Off: ${ticker} safe-haven gaining +${quote.changePercent.toFixed(2)}% in risk environment`,
        metadata: { changePercent: quote.changePercent, strategy: "risk_off" },
      });
    }
    await new Promise((r) => setTimeout(r, 40));
  }

  return results.sort((a, b) => b.strength - a.strength).slice(0, 3);
}

async function generateShortSignals(indicatorMap: Map<string, number>): Promise<GeneratedSignal[]> {
  const results: GeneratedSignal[] = [];

  for (const ticker of SHORT_CANDIDATES) {
    const quote = await fetchQuoteWithRSI(ticker);
    if (!quote) continue;

    // Short: RSI > 72 (overbought) or strong negative momentum
    if (quote.rsi14 !== null && quote.rsi14 > 72) {
      const strength = Math.min(100, Math.round(((quote.rsi14 - 72) / 28) * 70 + 30));
      const enhanced = computeEnhancedFields("short", quote.price, strength, indicatorMap);
      results.push({
        symbol: ticker,
        direction: "short",
        strength,
        price: quote.price,
        ...enhanced,
        rationale: `Short: RSI ${quote.rsi14.toFixed(1)} overbought, mean-reversion short opportunity`,
        metadata: { rsi14: quote.rsi14, changePercent: quote.changePercent, strategy: "short" },
      });
    }
    await new Promise((r) => setTimeout(r, 40));
  }

  return results.sort((a, b) => b.strength - a.strength).slice(0, 2);
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function generateSignals(): Promise<void> {
  // Load active strategies
  const activeStrategies = await db
    .select()
    .from(strategies)
    .where(eq(strategies.isActive, true));

  if (activeStrategies.length === 0) {
    console.log("[signal-generator] No active strategies, skipping signal generation");
    return;
  }

  // Expire signals older than 48h
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
  await db
    .update(signals)
    .set({ status: "expired" })
    .where(and(eq(signals.status, "active"), gte(signals.generatedAt, cutoff)));

  // Load latest indicator map
  const windowAgo = new Date(Date.now() - 26 * 60 * 60 * 1000);
  const indicatorRows = await db
    .select({ slug: indicators.slug, normalizedValue: indicatorValues.normalizedValue })
    .from(indicatorValues)
    .innerJoin(indicators, eq(indicatorValues.indicatorId, indicators.id))
    .where(and(eq(indicators.isActive, true), gte(indicatorValues.recordedAt, windowAgo)))
    .orderBy(desc(indicatorValues.recordedAt));

  const indicatorMap = new Map<string, number>();
  for (const row of indicatorRows) {
    if (!indicatorMap.has(row.slug)) indicatorMap.set(row.slug, Number(row.normalizedValue));
  }

  let totalInserted = 0;

  for (const strategy of activeStrategies) {
    let generated: GeneratedSignal[] = [];

    switch (strategy.type as StrategyType) {
      case "momentum":
        generated = await generateMomentumSignals(indicatorMap);
        break;
      case "mean_reversion":
        generated = await generateMeanReversionSignals(indicatorMap);
        break;
      case "sector_rotation":
        generated = await generateSectorRotationSignals(indicatorMap);
        break;
      case "risk_off":
        generated = await generateRiskOffSignals(indicatorMap);
        break;
      case "short":
        generated = await generateShortSignals(indicatorMap);
        break;
      case "penny":
        // Penny signals come from the scanner_results (handled by scanner module)
        console.log("[signal-generator] Penny strategy — signals generated by scanner");
        continue;
    }

    // Insert generated signals (with calibration applied to confidence)
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const calibrationFactor = await getCalibrationFactor(strategy.name);

    for (const sig of generated) {
      const calibratedConfidence = applyCalibration(sig.confidenceScore, calibrationFactor);
      await db.insert(signals).values({
        strategyId: strategy.id,
        symbol: sig.symbol,
        direction: sig.direction,
        strength: String(sig.strength),
        price: String(sig.price),
        stopLoss: String(sig.stopLoss),
        targetPrice: String(sig.targetPrice),
        confidenceScore: String(calibratedConfidence),
        positionSizePct: String(sig.positionSizePct),
        riskFactors: sig.riskFactors,
        rationale: sig.rationale,
        expiresAt,
        status: "active",
        metadata: { ...sig.metadata, calibrationFactor },
      });
      totalInserted++;
    }

    if (generated.length > 0) {
      console.log(
        `[signal-generator] ${strategy.name}: generated ${generated.length} signals (${generated.map((s) => `${s.symbol}/${s.direction}`).join(", ")})`
      );
    }
  }

  console.log(`[signal-generator] Total signals inserted: ${totalInserted}`);
}
