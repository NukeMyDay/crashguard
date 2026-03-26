/**
 * Strategy Engine — Module 2
 *
 * Reads the current market regime and activates/deactivates strategies accordingly.
 * Each strategy maps to one or more suitable regimes. The engine updates the
 * `strategies.isActive` flag and logs which strategies are live.
 */
import { db } from "@marketpulse/db/client";
import { strategies, marketRegimes } from "@marketpulse/db/schema";
import { eq, desc, isNull } from "drizzle-orm";

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

async function getCurrentGlobalRegime(): Promise<RegimeLabel | null> {
  const rows = await db
    .select({ regime: marketRegimes.regime })
    .from(marketRegimes)
    .where(eq(marketRegimes.market, "global"))
    .orderBy(desc(marketRegimes.detectedAt))
    .limit(1);

  return rows[0]?.regime ?? null;
}

export async function runStrategyEngine(): Promise<void> {
  const regime = await getCurrentGlobalRegime();

  if (!regime) {
    console.warn("[strategy-engine] No current regime detected, skipping");
    return;
  }

  const activeTypes = new Set<StrategyType>(REGIME_STRATEGY_MAP[regime] ?? []);
  const allStrategies = await db.select().from(strategies);

  for (const strategy of allStrategies) {
    const shouldBeActive = activeTypes.has(strategy.type as StrategyType);

    if (strategy.isActive !== shouldBeActive) {
      await db
        .update(strategies)
        .set({ isActive: shouldBeActive, updatedAt: new Date() })
        .where(eq(strategies.id, strategy.id));
    }
  }

  const activeNames = allStrategies
    .filter((s) => activeTypes.has(s.type as StrategyType))
    .map((s) => s.name);

  console.log(
    `[strategy-engine] Regime: ${regime} → active strategies: ${activeNames.join(", ") || "none"}`
  );
}
