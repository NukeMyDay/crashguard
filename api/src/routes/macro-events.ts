import { Hono } from "hono";
import { db } from "@marketpulse/db/client";
import { macroEvents } from "@marketpulse/db/schema";
import { gte, lte, asc } from "drizzle-orm";

export const macroEventsRouter = new Hono();

// GET /v1/macro-events?days=30
macroEventsRouter.get("/", async (c) => {
  const days = Math.min(365, Math.max(1, Number(c.req.query("days") ?? 30)));
  const now = new Date();
  const until = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const rows = await db
    .select()
    .from(macroEvents)
    .where(gte(macroEvents.eventDate, now))
    .orderBy(asc(macroEvents.eventDate));

  return c.json(rows);
});
