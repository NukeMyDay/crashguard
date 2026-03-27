import { Hono } from "hono";
import { db } from "@marketpulse/db/client";
import { indicators, indicatorValues, marketScores } from "@marketpulse/db/schema";
import { eq, desc, sql } from "drizzle-orm";

export const systemRouter = new Hono();

function isStale(lastRecordedAt: Date, frequency: string): boolean {
  const ageMin = (Date.now() - lastRecordedAt.getTime()) / 60000;
  if (frequency === "hourly") return ageMin > 90;
  if (frequency === "daily") return ageMin > 26 * 60;
  if (frequency === "weekly") return ageMin > 8 * 24 * 60;
  return false;
}

// GET /v1/system/health
systemRouter.get("/health", async (c) => {
  const startMs = Date.now();

  // Fetch all active indicators with their latest value
  const allIndicators = await db
    .select()
    .from(indicators)
    .where(eq(indicators.isActive, true));

  const staleSlugs: string[] = [];

  await Promise.all(
    allIndicators.map(async (ind) => {
      const latest = await db
        .select()
        .from(indicatorValues)
        .where(eq(indicatorValues.indicatorId, ind.id))
        .orderBy(desc(indicatorValues.recordedAt))
        .limit(1);

      if (!latest[0] || isStale(new Date(latest[0].recordedAt), ind.frequency)) {
        staleSlugs.push(ind.slug);
      }
    })
  );

  const dbLatencyMs = Date.now() - startMs;

  // Derive collector last-run times from latest indicator values per source
  const sourceGroups: Record<string, { source: string; lastRun: string | null }> = {
    yahoo: { source: "yahoo", lastRun: null },
    fred: { source: "fred", lastRun: null },
    cnn: { source: "cnn", lastRun: null },
    ecb: { source: "ecb", lastRun: null },
  };

  for (const ind of allIndicators) {
    const src = ind.source as string;
    if (!(src in sourceGroups)) continue;
    const latest = await db
      .select({ recordedAt: indicatorValues.recordedAt })
      .from(indicatorValues)
      .where(eq(indicatorValues.indicatorId, ind.id))
      .orderBy(desc(indicatorValues.recordedAt))
      .limit(1);

    if (latest[0]) {
      const ts = new Date(latest[0].recordedAt).toISOString();
      if (!sourceGroups[src].lastRun || ts > sourceGroups[src].lastRun!) {
        sourceGroups[src].lastRun = ts;
      }
    }
  }

  const collectors = Object.values(sourceGroups).map((s) => ({
    name: s.source,
    lastRun: s.lastRun,
    status: s.lastRun ? "ok" : "unknown",
  }));

  const staleCount = staleSlugs.length;
  const overallStatus =
    staleCount === 0 ? "ok" : staleCount < allIndicators.length / 2 ? "degraded" : "down";

  return c.json({
    status: overallStatus,
    indicators: {
      total: allIndicators.length,
      stale: staleCount,
      staleSlugs,
    },
    collectors,
    database: {
      latencyMs: dbLatencyMs,
      status: "ok",
    },
    uptime: Math.round(process.uptime()),
  });
});
