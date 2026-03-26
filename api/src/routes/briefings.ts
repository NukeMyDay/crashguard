import { Hono } from "hono";
import { db } from "@marketpulse/db/client";
import { dailyBriefings } from "@marketpulse/db/schema";
import { eq, desc, gte } from "drizzle-orm";

export const briefingsRouter = new Hono();

// GET /v1/briefings — latest briefings, optionally filtered by market
briefingsRouter.get("/", async (c) => {
  const market = c.req.query("market");
  const days = Number(c.req.query("days") ?? "7");
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const query = db
    .select()
    .from(dailyBriefings)
    .where(gte(dailyBriefings.generatedAt, since))
    .orderBy(desc(dailyBriefings.generatedAt))
    .limit(50);

  const rows = await query;

  const filtered = market
    ? rows.filter((r) => r.market === market)
    : rows;

  return c.json(filtered);
});

// GET /v1/briefings/today — today's briefing for all markets
briefingsRouter.get("/today", async (c) => {
  const today = new Date().toISOString().split("T")[0];
  const rows = await db
    .select()
    .from(dailyBriefings)
    .where(eq(dailyBriefings.date, today))
    .orderBy(desc(dailyBriefings.generatedAt));
  return c.json(rows);
});

// GET /v1/briefings/:market — latest briefing for a specific market
briefingsRouter.get("/:market", async (c) => {
  const market = c.req.param("market");
  const rows = await db
    .select()
    .from(dailyBriefings)
    .where(eq(dailyBriefings.market, market))
    .orderBy(desc(dailyBriefings.generatedAt))
    .limit(1);

  if (!rows[0]) return c.json({ error: "No briefing found for this market" }, 404);
  return c.json(rows[0]);
});
