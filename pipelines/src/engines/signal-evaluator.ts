/**
 * Signal Evaluator — Outcome Tracking
 *
 * Runs daily at 8am UTC. For each signal that expired the previous day,
 * fetches the current (exit) price and compares it to the entry price to
 * record a win/loss/neutral outcome, including price target accuracy,
 * target hit detection, and max favorable/adverse excursion.
 */
import { db } from "@marketpulse/db/client";
import { signals, signalOutcomes } from "@marketpulse/db/schema";
import { eq, and, gte, lt, isNotNull } from "drizzle-orm";

// ─── Price fetch (close) ──────────────────────────────────────────────────────

async function fetchCurrentPrice(symbol: string): Promise<number | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`;
    const res = await fetch(url, {
      headers: { "User-Agent": "MarketPulse/1.0" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as any;
    const closes: number[] = (
      data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? []
    ).filter((c: any) => c != null);
    return closes.length > 0 ? closes[closes.length - 1] : null;
  } catch {
    return null;
  }
}

// ─── OHLC fetch since entry ───────────────────────────────────────────────────

interface DayOHLC { high: number; low: number; close: number; timestamp: number }

async function fetchOHLCSinceEntry(
  symbol: string,
  entryTimestamp: number
): Promise<DayOHLC[]> {
  try {
    const period1 = Math.floor(entryTimestamp / 1000);
    const period2 = Math.floor(Date.now() / 1000);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&period1=${period1}&period2=${period2}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "MarketPulse/1.0" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as any;
    const result = data?.chart?.result?.[0];
    if (!result) return [];
    const timestamps: number[] = result.timestamp ?? [];
    const quote = result.indicators?.quote?.[0] ?? {};
    const highs: (number | null)[] = quote.high ?? [];
    const lows: (number | null)[] = quote.low ?? [];
    const closes: (number | null)[] = quote.close ?? [];
    const days: DayOHLC[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (highs[i] != null && lows[i] != null && closes[i] != null) {
        days.push({
          high: highs[i]!,
          low: lows[i]!,
          close: closes[i]!,
          timestamp: timestamps[i] * 1000,
        });
      }
    }
    return days;
  } catch {
    return [];
  }
}

// ─── Outcome classification ───────────────────────────────────────────────────

function classifyOutcome(
  direction: "long" | "short",
  pnlPercent: number
): "win" | "loss" | "neutral" {
  const threshold = 0.5; // 0.5% threshold for neutral
  if (direction === "long") {
    if (pnlPercent >= threshold) return "win";
    if (pnlPercent <= -threshold) return "loss";
    return "neutral";
  } else {
    // short: profit when price falls
    if (pnlPercent <= -threshold) return "win";
    if (pnlPercent >= threshold) return "loss";
    return "neutral";
  }
}

// ─── Main evaluator ───────────────────────────────────────────────────────────

export async function evaluateSignalOutcomes(): Promise<void> {
  // Yesterday's window: signals that expired between 24h and 48h ago
  const now = Date.now();
  const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now - 48 * 60 * 60 * 1000);

  // Find signals that expired yesterday and have a recorded entry price
  const expiredSignals = await db
    .select()
    .from(signals)
    .where(
      and(
        eq(signals.status, "expired"),
        gte(signals.expiresAt!, twoDaysAgo),
        lt(signals.expiresAt!, oneDayAgo),
        isNotNull(signals.price)
      )
    );

  if (expiredSignals.length === 0) {
    console.log("[signal-evaluator] No signals to evaluate");
    return;
  }

  console.log(`[signal-evaluator] Evaluating ${expiredSignals.length} expired signals`);

  // Check which signals already have outcomes
  const existingOutcomeSignalIds = new Set(
    (
      await db
        .select({ signalId: signalOutcomes.signalId })
        .from(signalOutcomes)
    ).map((r) => r.signalId)
  );

  let evaluated = 0;

  for (const signal of expiredSignals) {
    if (existingOutcomeSignalIds.has(signal.id)) continue;

    const entryPrice = Number(signal.price);
    if (!entryPrice || entryPrice <= 0) continue;

    const exitPrice = await fetchCurrentPrice(signal.symbol);
    if (!exitPrice) {
      console.warn(`[signal-evaluator] Could not fetch price for ${signal.symbol}`);
      continue;
    }

    const pnlPercent = ((exitPrice - entryPrice) / entryPrice) * 100;
    const outcome = classifyOutcome(
      signal.direction as "long" | "short",
      pnlPercent
    );

    // ── Target tracking ──────────────────────────────────────────────────
    const targetPrice = signal.targetPrice ? Number(signal.targetPrice) : null;
    const entryTimestamp = signal.generatedAt.getTime();

    let targetHit: boolean | null = null;
    let targetHitAt: Date | null = null;
    let targetAccuracy: number | null = null;
    let mfe: number | null = null;
    let mae: number | null = null;

    // Fetch daily OHLC since signal entry to compute MFE, MAE, target hit
    const ohlcDays = await fetchOHLCSinceEntry(signal.symbol, entryTimestamp);

    if (ohlcDays.length > 0) {
      const direction = signal.direction as "long" | "short";

      // MFE: best price reached relative to entry (positive = favorable)
      // MAE: worst price reached relative to entry (negative = adverse)
      let bestFavorable = 0;
      let worstAdverse = 0;

      for (const day of ohlcDays) {
        if (direction === "long") {
          const dayMFE = ((day.high - entryPrice) / entryPrice) * 100;
          const dayMAE = ((day.low - entryPrice) / entryPrice) * 100;
          if (dayMFE > bestFavorable) bestFavorable = dayMFE;
          if (dayMAE < worstAdverse) worstAdverse = dayMAE;

          // Check if target was hit (long: high >= target)
          if (targetPrice && !targetHit && day.high >= targetPrice) {
            targetHit = true;
            targetHitAt = new Date(day.timestamp);
          }
        } else {
          // short: favorable = price going down
          const dayMFE = ((entryPrice - day.low) / entryPrice) * 100;
          const dayMAE = ((entryPrice - day.high) / entryPrice) * 100;
          if (dayMFE > bestFavorable) bestFavorable = dayMFE;
          if (dayMAE < worstAdverse) worstAdverse = dayMAE;

          // Check if target was hit (short: low <= target)
          if (targetPrice && !targetHit && day.low <= targetPrice) {
            targetHit = true;
            targetHitAt = new Date(day.timestamp);
          }
        }
      }

      mfe = Math.round(bestFavorable * 10000) / 10000;
      mae = Math.round(worstAdverse * 10000) / 10000;

      if (targetHit === null) targetHit = false;

      // targetAccuracy: how far the actual move got toward the target (0-1)
      if (targetPrice) {
        const targetMove =
          direction === "long"
            ? ((targetPrice - entryPrice) / entryPrice) * 100
            : ((entryPrice - targetPrice) / entryPrice) * 100;
        if (targetMove > 0) {
          const actualMove = direction === "long" ? mfe : mfe; // both positive relative to direction
          targetAccuracy = Math.min(actualMove / targetMove, 1.0);
          targetAccuracy = Math.round(targetAccuracy * 10000) / 10000;
        }
      }
    }

    await db.insert(signalOutcomes).values({
      signalId: signal.id,
      symbol: signal.symbol,
      direction: signal.direction,
      entryPrice: String(entryPrice),
      exitPrice: String(exitPrice),
      pnlPercent: String(pnlPercent.toFixed(4)),
      outcome,
      targetAccuracy: targetAccuracy != null ? String(targetAccuracy) : null,
      targetHit,
      targetHitAt,
      maxFavorableExcursion: mfe != null ? String(mfe) : null,
      maxAdverseExcursion: mae != null ? String(mae) : null,
    });

    evaluated++;
    await new Promise((r) => setTimeout(r, 60));
  }

  console.log(`[signal-evaluator] Recorded ${evaluated} outcomes`);
}
