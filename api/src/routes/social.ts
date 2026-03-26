import { Hono } from "hono";
import { db } from "@marketpulse/db/client";
import { redditMentions } from "@marketpulse/db/schema";
import { desc, gte, sql } from "drizzle-orm";

export const socialRouter = new Hono();

// GET /v1/social/wsb — top 10 WSB tickers by mention count + sentiment (last 24h)
socialRouter.get("/wsb", async (c) => {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      ticker: redditMentions.ticker,
      mentions: sql<number>`count(*)::int`,
      bullish: sql<number>`count(*) filter (where ${redditMentions.sentiment} = 'bullish')::int`,
      bearish: sql<number>`count(*) filter (where ${redditMentions.sentiment} = 'bearish')::int`,
      avgUpvotes: sql<number>`round(avg(${redditMentions.upvotes}))::int`,
    })
    .from(redditMentions)
    .where(gte(redditMentions.fetchedAt, since))
    .groupBy(redditMentions.ticker)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  return c.json(rows);
});
