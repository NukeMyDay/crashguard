/**
 * Dark Pool Route — Module
 *
 * GET /v1/dark-pool?date=latest — top 20 FINRA short-sale heavy hitters
 */
import { Hono } from "hono";
import { db } from "@marketpulse/db/client";
import { darkPoolPrints } from "@marketpulse/db/schema";
import { desc, eq, sql } from "drizzle-orm";

export const darkPoolRouter = new Hono();

darkPoolRouter.get("/", async (c) => {
  const dateParam = c.req.query("date");

  let tradeDate: string;

  if (!dateParam || dateParam === "latest") {
    // Find the most recent trade date we have data for
    const latest = await db
      .select({ tradeDate: darkPoolPrints.tradeDate })
      .from(darkPoolPrints)
      .orderBy(desc(darkPoolPrints.tradeDate))
      .limit(1);

    if (!latest[0]) {
      return c.json({ tradeDate: null, prints: [], message: "No dark pool data available yet" });
    }
    tradeDate = latest[0].tradeDate;
  } else {
    tradeDate = dateParam;
  }

  const prints = await db
    .select()
    .from(darkPoolPrints)
    .where(eq(darkPoolPrints.tradeDate, tradeDate))
    .orderBy(desc(darkPoolPrints.shortRatio))
    .limit(20);

  return c.json({
    tradeDate,
    prints: prints.map((p) => ({
      ticker: p.ticker,
      tradeDate: p.tradeDate,
      shortVolume: p.shortVolume,
      totalVolume: p.totalVolume,
      shortRatio: p.shortRatio != null ? Number(p.shortRatio) : null,
      isHeavyShort: p.isHeavyShort,
    })),
  });
});
