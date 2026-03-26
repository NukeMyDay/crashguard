/**
 * Signal Evaluator — Outcome Tracking
 *
 * Runs daily at 8am UTC. For each signal that expired the previous day,
 * fetches the current (exit) price and compares it to the entry price to
 * record a win/loss/neutral outcome.
 */
import { db } from "@marketpulse/db/client";
import { signals, signalOutcomes } from "@marketpulse/db/schema";
import { eq, and, gte, lt, isNotNull } from "drizzle-orm";

// ─── Price fetch ──────────────────────────────────────────────────────────────

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

    const pnlPercent =
      ((exitPrice - entryPrice) / entryPrice) * 100;

    const outcome = classifyOutcome(
      signal.direction as "long" | "short",
      pnlPercent
    );

    await db.insert(signalOutcomes).values({
      signalId: signal.id,
      symbol: signal.symbol,
      direction: signal.direction,
      entryPrice: String(entryPrice),
      exitPrice: String(exitPrice),
      pnlPercent: String(pnlPercent.toFixed(4)),
      outcome,
    });

    evaluated++;
    await new Promise((r) => setTimeout(r, 60));
  }

  console.log(`[signal-evaluator] Recorded ${evaluated} outcomes`);
}
