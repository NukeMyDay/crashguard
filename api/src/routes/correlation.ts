import { Hono } from "hono";
import { db } from "@marketpulse/db/client";
import { indicators, indicatorValues } from "@marketpulse/db/schema";
import { eq, and, gte, inArray } from "drizzle-orm";

export const correlationRouter = new Hono();

const CORRELATED_SLUGS = [
  "vix",
  "yield-curve-2y10y",
  "credit-spreads-hy",
  "dxy",
  "spx-breadth-200ma",
  "m2-money-supply",
];

function pearson(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 2) return 0;
  const meanX = xs.reduce((a, b) => a + b) / n;
  const meanY = ys.reduce((a, b) => a + b) / n;
  const num = xs.reduce((s, x, i) => s + (x - meanX) * (ys[i] - meanY), 0);
  const den = Math.sqrt(
    xs.reduce((s, x) => s + (x - meanX) ** 2, 0) *
      ys.reduce((s, y) => s + (y - meanY) ** 2, 0)
  );
  return den === 0 ? 0 : num / den;
}

function interpretation(r: number): string {
  const abs = Math.abs(r);
  const direction = r >= 0 ? "positive" : "negative";
  const strength = abs >= 0.7 ? "strong" : abs >= 0.4 ? "moderate" : "weak";
  return `${strength} ${direction}`;
}

// GET /v1/indicators/correlation?days=30
correlationRouter.get("/", async (c) => {
  const days = Number(c.req.query("days") || "30");
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Fetch all relevant indicators
  const rows = await db
    .select()
    .from(indicators)
    .where(inArray(indicators.slug, CORRELATED_SLUGS));

  if (rows.length < 2) {
    return c.json({ error: "Not enough indicators found" }, 404);
  }

  // Fetch normalized values for each indicator within the date range
  const valuesBySlug: Record<string, { recordedAt: Date; value: number }[]> =
    {};

  await Promise.all(
    rows.map(async (ind) => {
      const vals = await db
        .select({
          recordedAt: indicatorValues.recordedAt,
          normalizedValue: indicatorValues.normalizedValue,
        })
        .from(indicatorValues)
        .where(
          and(
            eq(indicatorValues.indicatorId, ind.id),
            gte(indicatorValues.recordedAt, since)
          )
        )
        .orderBy(indicatorValues.recordedAt);

      valuesBySlug[ind.slug] = vals.map((v) => ({
        recordedAt: v.recordedAt,
        value: Number(v.normalizedValue),
      }));
    })
  );

  // Build pairs matrix
  const slugs = rows.map((r) => r.slug);
  const matrix: {
    a: string;
    b: string;
    correlation: number;
    interpretation: string;
  }[] = [];

  for (let i = 0; i < slugs.length; i++) {
    for (let j = i + 1; j < slugs.length; j++) {
      const slugA = slugs[i];
      const slugB = slugs[j];
      const aVals = valuesBySlug[slugA] ?? [];
      const bVals = valuesBySlug[slugB] ?? [];

      // Align by matching recordedAt timestamps (rounded to hour)
      const bMap = new Map(
        bVals.map((v) => [Math.floor(v.recordedAt.getTime() / 3_600_000), v.value])
      );

      const xs: number[] = [];
      const ys: number[] = [];

      for (const av of aVals) {
        const key = Math.floor(av.recordedAt.getTime() / 3_600_000);
        const bv = bMap.get(key);
        if (bv !== undefined) {
          xs.push(av.value);
          ys.push(bv);
        }
      }

      const r = xs.length >= 2 ? pearson(xs, ys) : 0;

      matrix.push({
        a: slugA,
        b: slugB,
        correlation: Math.round(r * 100) / 100,
        interpretation: interpretation(r),
      });
    }
  }

  return c.json({
    period: `${days}d`,
    matrix,
    calculatedAt: new Date().toISOString(),
  });
});
