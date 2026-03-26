import { Hono } from "hono";
import { db } from "@marketpulse/db/client";
import { marketScores, alerts } from "@marketpulse/db/schema";
import { desc, gte, eq } from "drizzle-orm";
import type { Market } from "@marketpulse/shared";
import { MARKETS } from "@marketpulse/shared";

export const dashboardRouter = new Hono();

dashboardRouter.get("/", async (c) => {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Get latest score per market (one per market)
  const latestScores = await Promise.all(
    (MARKETS as readonly Market[]).map((market) =>
      db
        .select()
        .from(marketScores)
        .where(eq(marketScores.market, market))
        .orderBy(desc(marketScores.calculatedAt))
        .limit(1)
        .then((rows) => rows[0] ?? null)
    )
  ).then((rows) => rows.filter(Boolean));

  // Get recent unacknowledged alerts
  const recentAlerts = await db
    .select()
    .from(alerts)
    .where(gte(alerts.triggeredAt, oneDayAgo))
    .orderBy(desc(alerts.triggeredAt))
    .limit(20);

  return c.json({
    scores: latestScores,
    alerts: recentAlerts,
    lastUpdated: new Date().toISOString(),
  });
});
