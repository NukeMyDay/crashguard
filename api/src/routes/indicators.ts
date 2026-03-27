import { Hono } from "hono";
import { db } from "@marketpulse/db/client";
import { indicators, indicatorValues } from "@marketpulse/db/schema";
import { eq, desc, and, gte } from "drizzle-orm";

export const indicatorsRouter = new Hono();

function isStale(lastRecordedAt: Date, frequency: string): boolean {
  const ageMin = (Date.now() - lastRecordedAt.getTime()) / 60000;
  if (frequency === "hourly") return ageMin > 90;
  if (frequency === "daily") return ageMin > 26 * 60;
  if (frequency === "weekly") return ageMin > 8 * 24 * 60;
  return false;
}

// GET /v1/indicators
indicatorsRouter.get("/", async (c) => {
  const rows = await db.select().from(indicators).where(eq(indicators.isActive, true));

  const withLatest = await Promise.all(
    rows.map(async (ind) => {
      const latest = await db
        .select()
        .from(indicatorValues)
        .where(eq(indicatorValues.indicatorId, ind.id))
        .orderBy(desc(indicatorValues.recordedAt))
        .limit(1);

      const latestValue = latest[0] ?? null;
      let dataAge: {
        minutes: number;
        isStale: boolean;
        expectedFrequency: string;
        lastRecordedAt: string | null;
      } | null = null;

      if (latestValue) {
        const ageMin = Math.round(
          (Date.now() - new Date(latestValue.recordedAt).getTime()) / 60000
        );
        dataAge = {
          minutes: ageMin,
          isStale: isStale(new Date(latestValue.recordedAt), ind.frequency),
          expectedFrequency: ind.frequency,
          lastRecordedAt: new Date(latestValue.recordedAt).toISOString(),
        };
      }

      return { ...ind, latestValue, dataAge };
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
