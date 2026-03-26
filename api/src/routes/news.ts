import { Hono } from "hono";
import { db } from "@marketpulse/db/client";
import { newsItems } from "@marketpulse/db/schema";
import { and, desc, eq, gte, sql } from "drizzle-orm";

export const newsRouter = new Hono();

// GET /v1/news — recent news items, optionally filtered by ticker or source
newsRouter.get("/", async (c) => {
  const limit = Math.min(Number(c.req.query("limit") ?? "20"), 100);
  const ticker = c.req.query("ticker")?.toUpperCase();
  const since = c.req.query("since"); // ISO timestamp
  const source = c.req.query("source");

  const conditions = [];

  if (since) {
    conditions.push(gte(newsItems.publishedAt, new Date(since)));
  }

  if (ticker) {
    conditions.push(sql`${newsItems.tickers} @> ${JSON.stringify([ticker])}::jsonb`);
  }

  if (source) {
    conditions.push(eq(newsItems.source, source));
  }

  const rows = await db
    .select()
    .from(newsItems)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(newsItems.publishedAt))
    .limit(limit);

  return c.json(rows);
});

// GET /v1/news/sentiment-summary — 24h sentiment breakdown
newsRouter.get("/sentiment-summary", async (c) => {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const rows = await db
    .select({ sentiment: newsItems.sentiment })
    .from(newsItems)
    .where(gte(newsItems.fetchedAt, since));

  let bullish = 0;
  let bearish = 0;
  let neutral = 0;

  for (const row of rows) {
    if (row.sentiment === "bullish") bullish++;
    else if (row.sentiment === "bearish") bearish++;
    else neutral++;
  }

  const total = bullish + bearish + neutral;
  const sentimentScore = total > 0 ? Math.round((bullish - bearish) / total * 100) : 0;

  return c.json({ bullish, bearish, neutral, sentimentScore, period: "24h" });
});
