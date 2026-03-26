/**
 * Strategy Engine — Module 2
 *
 * Reads the current market regime and activates/deactivates strategies accordingly.
 * Each strategy maps to one or more suitable regimes. The engine updates the
 * `strategies.isActive` flag and logs which strategies are live.
 */
import { db } from "@marketpulse/db/client";
import { strategies, marketRegimes, marketScores } from "@marketpulse/db/schema";
import { eq, desc } from "drizzle-orm";

type StrategyType =
  | "momentum"
  | "mean_reversion"
  | "sector_rotation"
  | "risk_off"
  | "short"
  | "penny";

type RegimeLabel = "bull" | "bear" | "sideways" | "crisis" | "recovery";

// Which strategies are suitable for each regime
const REGIME_STRATEGY_MAP: Record<RegimeLabel, StrategyType[]> = {
  bull:     ["momentum", "sector_rotation", "penny"],
  recovery: ["momentum", "mean_reversion", "sector_rotation"],
  sideways: ["mean_reversion", "sector_rotation"],
  bear:     ["mean_reversion", "risk_off", "short"],
  crisis:   ["risk_off", "short"],
};

async function getCurrentGlobalRegime(): Promise<{ regime: RegimeLabel; crashScore: number } | null> {
  const rows = await db
    .select({ regime: marketRegimes.regime })
    .from(marketRegimes)
    .where(eq(marketRegimes.market, "global"))
    .orderBy(desc(marketRegimes.detectedAt))
    .limit(1);

  if (!rows[0]) return null;

  const scoreRows = await db
    .select({ crashScore: marketScores.crashScore })
    .from(marketScores)
    .where(eq(marketScores.market, "global"))
    .orderBy(desc(marketScores.calculatedAt))
    .limit(1);

  const crashScore = scoreRows[0] ? Number(scoreRows[0].crashScore) : 0;
  return { regime: rows[0].regime, crashScore };
}

export async function runStrategyEngine(): Promise<void> {
  const current = await getCurrentGlobalRegime();

  if (!current) {
    console.warn("[strategy-engine] No current regime detected, skipping");
    return;
  }

  const { regime, crashScore } = current;
  const activeTypes = new Set<StrategyType>(REGIME_STRATEGY_MAP[regime] ?? []);
  const allStrategies = await db.select().from(strategies);

  let switched = false;
  for (const strategy of allStrategies) {
    const shouldBeActive = activeTypes.has(strategy.type as StrategyType);

    if (strategy.isActive !== shouldBeActive) {
      await db
        .update(strategies)
        .set({ isActive: shouldBeActive, updatedAt: new Date() })
        .where(eq(strategies.id, strategy.id));
      switched = true;
    }
  }

  const activeNames = allStrategies
    .filter((s) => activeTypes.has(s.type as StrategyType))
    .map((s) => s.name);

  if (switched) {
    console.log(
      `[strategy-engine] switching to ${regime} strategies — crash score: ${crashScore.toFixed(0)}`
    );
  }

  console.log(
    `[strategy-engine] Regime: ${regime} (score: ${crashScore.toFixed(0)}) → active strategies: ${activeNames.join(", ") || "none"}`
  );
}

export async function getActiveStrategyInfo(): Promise<{ currentRegime: string | null; activeStrategies: string[] }> {
  const current = await getCurrentGlobalRegime();
  if (!current) return { currentRegime: null, activeStrategies: [] };

  const { regime } = current;
  const activeTypes = new Set<StrategyType>(REGIME_STRATEGY_MAP[regime] ?? []);
  const allStrategies = await db.select({ name: strategies.name, type: strategies.type }).from(strategies);
  const activeStrategies = allStrategies
    .filter((s) => activeTypes.has(s.type as StrategyType))
    .map((s) => s.name);

  return { currentRegime: regime, activeStrategies };
}
