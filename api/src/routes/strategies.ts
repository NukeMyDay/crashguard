import { Hono } from "hono";
import { db } from "@marketpulse/db/client";
import { strategies, signals, signalOutcomes, strategyCalibrations } from "@marketpulse/db/schema";
import { eq, count, desc } from "drizzle-orm";

export const strategiesRouter = new Hono();

// GET /v1/strategies — all strategies (optionally only active)
strategiesRouter.get("/", async (c) => {
  const activeOnly = c.req.query("active") === "true";

  const rows = activeOnly
    ? await db.select().from(strategies).where(eq(strategies.isActive, true))
    : await db.select().from(strategies);

  return c.json(rows);
});

// GET /v1/strategies/calibration — latest calibration data per strategy
strategiesRouter.get("/calibration", async (c) => {
  const rows = await db
    .select()
    .from(strategyCalibrations)
    .orderBy(desc(strategyCalibrations.calibratedAt));

  // Return only the most recent calibration per strategy
  const latest = new Map<string, typeof rows[0]>();
  for (const row of rows) {
    if (!latest.has(row.strategyName)) latest.set(row.strategyName, row);
  }

  const result = [...latest.values()].map((r) => ({
    strategyName: r.strategyName,
    actualWinRate: r.actualWinRate !== null ? Number(r.actualWinRate) : null,
    statedConfidenceAvg: r.statedConfidenceAvg !== null ? Number(r.statedConfidenceAvg) : null,
    calibrationFactor: r.calibrationFactor !== null ? Number(r.calibrationFactor) : null,
    samplesN: r.samplesN,
    calibratedAt: r.calibratedAt,
  }));

  return c.json(result);
});

// GET /v1/strategies/performance — win rate, avg return, total signals per strategy
strategiesRouter.get("/performance", async (c) => {
  const allStrategies = await db.select().from(strategies);

  const results = await Promise.all(
    allStrategies.map(async (strategy) => {
      const [{ total }] = await db
        .select({ total: count() })
        .from(signals)
        .where(eq(signals.strategyId, strategy.id));

      const outcomeRows = await db
        .select({
          outcome: signalOutcomes.outcome,
          pnlPercent: signalOutcomes.pnlPercent,
        })
        .from(signalOutcomes)
        .innerJoin(signals, eq(signalOutcomes.signalId, signals.id))
        .where(eq(signals.strategyId, strategy.id));

      const totalEvaluated = outcomeRows.length;
      const wins = outcomeRows.filter((r) => r.outcome === "win").length;
      const losses = outcomeRows.filter((r) => r.outcome === "loss").length;
      const winRate =
        totalEvaluated > 0
          ? parseFloat(((wins / totalEvaluated) * 100).toFixed(2))
          : null;
      const avgReturnPct =
        totalEvaluated > 0
          ? parseFloat(
              (
                outcomeRows.reduce((sum, r) => sum + Number(r.pnlPercent), 0) /
                totalEvaluated
              ).toFixed(4)
            )
          : null;

      return {
        id: strategy.id,
        slug: strategy.slug,
        name: strategy.name,
        type: strategy.type,
        isActive: strategy.isActive,
        totalSignals: Number(total),
        totalEvaluated,
        wins,
        losses,
        winRate,
        avgReturnPct,
      };
    })
  );

  return c.json(results);
});
