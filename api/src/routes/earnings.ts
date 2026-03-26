import { Hono } from "hono";
import { db } from "@marketpulse/db/client";
import { earningsEvents } from "@marketpulse/db/schema";
import { and, gte, lte, desc } from "drizzle-orm";

export const earningsRouter = new Hono();

// GET /v1/earnings — upcoming (next 14 days) + recent (last 7 days with actuals)
earningsRouter.get("/", async (c) => {
  const now = new Date();
  const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const minus7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [upcoming, recent] = await Promise.all([
    db
      .select()
      .from(earningsEvents)
      .where(and(gte(earningsEvents.reportDate, now), lte(earningsEvents.reportDate, in14Days)))
      .orderBy(earningsEvents.reportDate)
      .limit(50),

    db
      .select()
      .from(earningsEvents)
      .where(and(gte(earningsEvents.reportDate, minus7Days), lte(earningsEvents.reportDate, now)))
      .orderBy(desc(earningsEvents.reportDate))
      .limit(50),
  ]);

  return c.json({ upcoming, recent });
});
