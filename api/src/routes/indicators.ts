import { Hono } from "hono";
import { db } from "@marketpulse/db/client";
import { indicators, indicatorValues } from "@marketpulse/db/schema";
import { eq, desc, and, gte } from "drizzle-orm";

export const indicatorsRouter = new Hono();

// GET /v1/indicators
indicatorsRouter.get("/", async (c) => {
  const rows = await db.select().from(indicators).where(eq(indicators.isActive, true));

  // Attach latest value to each indicator
  const withLatest = await Promise.all(
    rows.map(async (ind) => {
      const latest = await db
        .select()
        .from(indicatorValues)
        .where(eq(indicatorValues.indicatorId, ind.id))
        .orderBy(desc(indicatorValues.recordedAt))
        .limit(1);
      return { ...ind, latestValue: latest[0] ?? null };
    })
  );

  return c.json(withLatest);
});

// GET /v1/indicators/:slug/history
indicatorsRouter.get("/:slug/history", async (c) => {
  const slug = c.req.param("slug");
  const days = Number(c.req.query("days") || "30");
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const indicator = await db
    .select()
    .from(indicators)
    .where(eq(indicators.slug, slug))
    .limit(1);

  if (!indicator[0]) {
    return c.json({ error: "Indicator not found" }, 404);
  }

  const history = await db
    .select()
    .from(indicatorValues)
    .where(and(
      eq(indicatorValues.indicatorId, indicator[0].id),
      gte(indicatorValues.recordedAt, since),
    ))
    .orderBy(desc(indicatorValues.recordedAt));

  return c.json({ indicator: indicator[0], history });
});
