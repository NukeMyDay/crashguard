/**
 * Signal Confidence Calibration Engine
 *
 * Runs nightly at 11pm UTC. Queries signal_outcomes for the last 30 days,
 * groups by strategy name, computes actual win rate vs stated confidence,
 * and stores calibration factors in the strategy_calibrations table.
 *
 * The calibration factor is then applied in the signal generator to
 * adjust confidence scores before signals are emitted.
 */
import { db } from "@marketpulse/db/client";
import {
  signals,
  strategies,
  signalOutcomes,
  strategyCalibrations,
} from "@marketpulse/db/schema";
import { eq, and, gte, desc } from "drizzle-orm";

// ─── Main export ──────────────────────────────────────────────────────────────

export async function runConfidenceCalibration(): Promise<void> {
  console.log("[confidence-calibrator] Running nightly calibration...");

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Load all strategies
  const allStrategies = await db.select({ id: strategies.id, name: strategies.name }).from(strategies);

  let calibrated = 0;

  for (const strategy of allStrategies) {
    // Fetch signal outcomes for this strategy in the last 30 days
    const outcomeRows = await db
      .select({
        outcome: signalOutcomes.outcome,
        confidence: signals.confidenceScore,
      })
      .from(signalOutcomes)
      .innerJoin(signals, eq(signalOutcomes.signalId, signals.id))
      .where(
        and(
          eq(signals.strategyId, strategy.id),
          gte(signalOutcomes.evaluatedAt, thirtyDaysAgo)
        )
      );

    // Need at least a few samples to be meaningful
    const evaluated = outcomeRows.filter((r) => r.outcome !== "neutral");
    if (evaluated.length < 5) {
      console.log(`[confidence-calibrator] ${strategy.name}: insufficient samples (${evaluated.length}), skipping`);
      continue;
    }

    const wins = evaluated.filter((r) => r.outcome === "win").length;
    const losses = evaluated.filter((r) => r.outcome === "loss").length;

    const actualWinRate = wins / (wins + losses);

    // Average stated confidence (as 0-1)
    const confValues = outcomeRows
      .map((r) => (r.confidence !== null ? Number(r.confidence) / 100 : null))
      .filter((v): v is number => v !== null);

    const statedConfidenceAvg =
      confValues.length > 0
        ? confValues.reduce((a, b) => a + b, 0) / confValues.length
        : 0.5;

    // Calibration factor: if we're inflated, reduce; if conservative, increase
    const calibrationFactor =
      statedConfidenceAvg > 0 ? actualWinRate / statedConfidenceAvg : 1.0;

    if (calibrationFactor < 0.8) {
      console.log(`[confidence-calibrator] ${strategy.name}: inflated confidence (factor ${calibrationFactor.toFixed(3)}) — will reduce by 10%`);
    } else if (calibrationFactor > 1.2) {
      console.log(`[confidence-calibrator] ${strategy.name}: conservative confidence (factor ${calibrationFactor.toFixed(3)}) — will increase by 10%`);
    } else {
      console.log(`[confidence-calibrator] ${strategy.name}: calibration factor ${calibrationFactor.toFixed(3)} — within normal range`);
    }

    await db.insert(strategyCalibrations).values({
      strategyName: strategy.name,
      actualWinRate: String(actualWinRate.toFixed(4)),
      statedConfidenceAvg: String(statedConfidenceAvg.toFixed(4)),
      calibrationFactor: String(Math.min(2.0, Math.max(0.1, calibrationFactor)).toFixed(4)),
      samplesN: evaluated.length,
    });

    calibrated++;
  }

  console.log(`[confidence-calibrator] Calibrated ${calibrated} strategies`);
}

// ─── Lookup helper for signal generator ──────────────────────────────────────

const calibrationCache = new Map<string, number>();
let cacheLoadedAt: number | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function getCalibrationFactor(strategyName: string): Promise<number> {
  const now = Date.now();

  // Refresh cache hourly
  if (cacheLoadedAt === null || now - cacheLoadedAt > CACHE_TTL_MS) {
    calibrationCache.clear();

    const rows = await db
      .select({
        strategyName: strategyCalibrations.strategyName,
        calibrationFactor: strategyCalibrations.calibrationFactor,
      })
      .from(strategyCalibrations)
      .orderBy(desc(strategyCalibrations.calibratedAt));

    // Keep only the most recent calibration per strategy
    for (const row of rows) {
      if (!calibrationCache.has(row.strategyName) && row.calibrationFactor !== null) {
        calibrationCache.set(row.strategyName, Number(row.calibrationFactor));
      }
    }

    cacheLoadedAt = now;
  }

  return calibrationCache.get(strategyName) ?? 1.0;
}

// ─── Apply calibration to confidence score ────────────────────────────────────

export function applyCalibration(confidence: number, factor: number): number {
  // Apply factor with ±10% adjustment bounds as per spec
  let adjusted: number;
  if (factor < 0.8) {
    adjusted = confidence * 0.9; // reduce by 10%
  } else if (factor > 1.2) {
    adjusted = confidence * 1.1; // increase by 10%
  } else {
    adjusted = confidence * factor;
  }
  return Math.min(100, Math.max(0, Math.round(adjusted)));
}
