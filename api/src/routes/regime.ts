import { Hono } from "hono";
import { db } from "@marketpulse/db/client";
import { marketRegimes } from "@marketpulse/db/schema";
import { desc, eq, gte, and, isNull } from "drizzle-orm";

export const regimeRouter = new Hono();

// GET /v1/regime — current regime per market (latest active)
regimeRouter.get("/", async (c) => {
  const markets = ["global", "us", "eu", "asia"];
  const results: Record<string, unknown> = {};

  for (const market of markets) {
    const rows = await db
      .select()
      .from(marketRegimes)
      .where(eq(marketRegimes.market, market))
      .orderBy(desc(marketRegimes.detectedAt))
      .limit(1);

    results[market] = rows[0] ?? null;
  }

  return c.json(results);
});

// GET /v1/regime/history — regime changes over last N days (default 90)
regimeRouter.get("/history", async (c) => {
  const market = c.req.query("market") ?? "global";
  const days = Number(c.req.query("days") ?? "90");
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const history = await db
    .select()
    .from(marketRegimes)
    .where(and(eq(marketRegimes.market, market), gte(marketRegimes.detectedAt, since)))
    .orderBy(desc(marketRegimes.detectedAt))
    .limit(200);

  return c.json(history);
});
