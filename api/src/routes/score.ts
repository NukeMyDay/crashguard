import { Hono } from "hono";
import { db } from "@marketpulse/db/client";
import { marketScores } from "@marketpulse/db/schema";
import { desc, eq, gte, and } from "drizzle-orm";
import type { Market } from "@marketpulse/shared";

export const scoreRouter = new Hono();

// GET /v1/score/history
scoreRouter.get("/history", async (c) => {
  const market = (c.req.query("market") || "global") as Market;
  const days = Number(c.req.query("days") || "30");
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const history = await db
    .select()
    .from(marketScores)
    .where(and(eq(marketScores.market, market), gte(marketScores.calculatedAt, since)))
    .orderBy(desc(marketScores.calculatedAt))
    .limit(days * 24);

  return c.json(history);
});
