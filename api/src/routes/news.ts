import { Hono } from "hono";
import { db } from "@marketpulse/db/client";
import { newsItems } from "@marketpulse/db/schema";
import { desc, eq, gte, sql } from "drizzle-orm";

export const newsRouter = new Hono();

// GET /v1/news — recent news items, optionally filtered by ticker
newsRouter.get("/", async (c) => {
  const limit = Math.min(Number(c.req.query("limit") ?? "20"), 100);
  const ticker = c.req.query("ticker")?.toUpperCase();
  const since = c.req.query("since"); // ISO timestamp

  let query = db
    .select()
    .from(newsItems)
    .orderBy(desc(newsItems.publishedAt))
    .limit(limit);

  const conditions = [];

  if (since) {
    conditions.push(gte(newsItems.publishedAt, new Date(since)));
  }

  if (ticker) {
    // Filter by ticker mention in the tickers jsonb array
    conditions.push(
      sql`${newsItems.tickers} @> ${JSON.stringify([ticker])}::jsonb`
    );
  }

  if (conditions.length > 0) {
    const rows = await db
      .select()
      .from(newsItems)
      .where(conditions.length === 1 ? conditions[0] : sql`${conditions[0]} AND ${conditions[1]}`)
      .orderBy(desc(newsItems.publishedAt))
      .limit(limit);
    return c.json(rows);
  }

  const rows = await query;
  return c.json(rows);
});
