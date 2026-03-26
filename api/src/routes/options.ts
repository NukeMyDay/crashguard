import { Hono } from "hono";
import { db } from "@marketpulse/db/client";
import { optionsFlow } from "@marketpulse/db/schema";
import { desc, eq, and, gte } from "drizzle-orm";

export const optionsRouter = new Hono();

// GET /v1/options/flow — unusual options flow, last 2 hours
// ?ticker=AAPL — filter by ticker
optionsRouter.get("/flow", async (c) => {
  const ticker = c.req.query("ticker");
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

  const conditions = [
    eq(optionsFlow.isUnusual, true),
    gte(optionsFlow.fetchedAt, twoHoursAgo),
  ];

  if (ticker) {
    conditions.push(eq(optionsFlow.ticker, ticker.toUpperCase()));
  }

  const rows = await db
    .select()
    .from(optionsFlow)
    .where(and(...conditions))
    .orderBy(desc(optionsFlow.volume))
    .limit(100);

  return c.json(rows);
});
