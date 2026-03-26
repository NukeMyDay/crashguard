/**
 * Sectors Route — Module
 *
 * GET /v1/sectors — latest sector ETF performance, sorted by relative performance vs SPY
 */
import { Hono } from "hono";
import { db } from "@marketpulse/db/client";
import { sectorPerformance } from "@marketpulse/db/schema";
import { desc, sql } from "drizzle-orm";

export const sectorsRouter = new Hono();

sectorsRouter.get("/", async (c) => {
  // Get the latest record per ticker using a subquery for max fetchedAt
  const latest = await db.execute(sql`
    SELECT DISTINCT ON (ticker)
      ticker,
      sector_name AS "sectorName",
      price,
      change_day AS "changeDay",
      change_week AS "changeWeek",
      relative_vs_spy AS "relativeVsSpy",
      volume,
      avg_volume_20d AS "avgVolume20d",
      fetched_at AS "fetchedAt"
    FROM sector_performance
    ORDER BY ticker, fetched_at DESC
  `);

  const rows = (latest.rows as any[]).map((r) => ({
    ticker: r.ticker,
    sectorName: r.sectorName,
    price: r.price != null ? Number(r.price) : null,
    changeDay: r.changeDay != null ? Number(r.changeDay) : null,
    changeWeek: r.changeWeek != null ? Number(r.changeWeek) : null,
    relativeVsSpy: r.relativeVsSpy != null ? Number(r.relativeVsSpy) : null,
    volume: r.volume != null ? Number(r.volume) : null,
    avgVolume20d: r.avgVolume20d != null ? Number(r.avgVolume20d) : null,
    fetchedAt: r.fetchedAt,
  }));

  // Sort by relativeVsSpy descending (best performer first), add rank
  rows.sort((a, b) => (b.relativeVsSpy ?? 0) - (a.relativeVsSpy ?? 0));
  const ranked = rows.map((row, i) => ({ ...row, rank: i + 1 }));

  return c.json(ranked);
});
