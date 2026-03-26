import { Hono } from "hono";
import { db } from "@marketpulse/db/client";
import { marketScores, alerts, indicators, indicatorValues } from "@marketpulse/db/schema";
import { desc, gte, eq, and } from "drizzle-orm";
import type { Market } from "@marketpulse/shared";
import { MARKETS } from "@marketpulse/shared";

export const dashboardRouter = new Hono();

dashboardRouter.get("/", async (c) => {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Get latest score per market (one per market)
  const latestScores = await Promise.all(
    (MARKETS as readonly Market[]).map((market) =>
      db
        .select()
        .from(marketScores)
        .where(eq(marketScores.market, market))
        .orderBy(desc(marketScores.calculatedAt))
        .limit(1)
        .then((rows) => rows[0] ?? null)
    )
  ).then((rows) => rows.filter(Boolean));

  // Get recent unacknowledged alerts
  const recentAlerts = await db
    .select()
    .from(alerts)
    .where(gte(alerts.triggeredAt, oneDayAgo))
    .orderBy(desc(alerts.triggeredAt))
    .limit(20);

  return c.json({
    scores: latestScores,
    alerts: recentAlerts,
    lastUpdated: new Date().toISOString(),
  });
});

// GET /v1/dashboard/summary-text
// Returns a plain-English beginner-friendly market summary
dashboardRouter.get("/summary-text", async (c) => {
  // Get latest global crash score
  const latestScore = await db
    .select()
    .from(marketScores)
    .where(eq(marketScores.market, "global"))
    .orderBy(desc(marketScores.calculatedAt))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  const crashScore = latestScore ? Number(latestScore.crashScore) : 0;

  // Find top contributing indicator by normalizedValue * weight
  const activeIndicators = await db
    .select()
    .from(indicators)
    .where(eq(indicators.isActive, true));

  let topIndicatorName: string | null = null;

  if (activeIndicators.length > 0) {
    const contributions = await Promise.all(
      activeIndicators.map(async (ind) => {
        const latest = await db
          .select()
          .from(indicatorValues)
          .where(eq(indicatorValues.indicatorId, ind.id))
          .orderBy(desc(indicatorValues.recordedAt))
          .limit(1)
          .then((rows) => rows[0] ?? null);
        if (!latest) return null;
        return {
          name: ind.name,
          contribution: Number(latest.normalizedValue) * Number(ind.weight),
        };
      })
    );

    const top = contributions
      .filter(Boolean)
      .sort((a, b) => b!.contribution - a!.contribution)[0];

    if (top && top.contribution > 0) {
      topIndicatorName = top.name;
    }
  }

  function generateSummary(score: number, topIndicator?: string | null) {
    if (score < 25) return {
      headline: "Markets are calm",
      detail: "Current conditions show low crash risk. Volatility is contained and key indicators are stable.",
      tone: "positive" as const,
      crashScore: score,
      topRisk: null,
    };
    if (score < 50) return {
      headline: "Markets showing some stress",
      detail: `Moderate risk detected. ${topIndicator ? topIndicator + " is elevated. " : ""}Monitor closely but no immediate danger.`,
      tone: "cautious" as const,
      crashScore: score,
      topRisk: topIndicator ?? null,
    };
    if (score < 75) return {
      headline: "Elevated market risk",
      detail: `Warning signals active. ${topIndicator ? topIndicator + " is a key driver. " : ""}Consider reducing risk exposure.`,
      tone: "warning" as const,
      crashScore: score,
      topRisk: topIndicator ?? null,
    };
    return {
      headline: "Danger: High crash probability",
      detail: `Critical risk levels. ${topIndicator ? topIndicator + " is in danger zone. " : ""}Defensive positioning strongly recommended.`,
      tone: "danger" as const,
      crashScore: score,
      topRisk: topIndicator ?? null,
    };
  }

  return c.json(generateSummary(crashScore, topIndicatorName));
});

// GET /v1/dashboard/attribution
// Returns which indicators are driving today's crash score
dashboardRouter.get("/attribution", async (c) => {
  // Get all active indicators
  const activeIndicators = await db
    .select()
    .from(indicators)
    .where(eq(indicators.isActive, true));

  if (activeIndicators.length === 0) {
    return c.json([]);
  }

  // For each indicator, get the latest value
  const attributions = await Promise.all(
    activeIndicators.map(async (ind) => {
      const latest = await db
        .select()
        .from(indicatorValues)
        .where(eq(indicatorValues.indicatorId, ind.id))
        .orderBy(desc(indicatorValues.recordedAt))
        .limit(1)
        .then((rows) => rows[0] ?? null);

      if (!latest) return null;

      const normalizedValue = Number(latest.normalizedValue);
      const weight = Number(ind.weight);
      const contribution = normalizedValue * weight;

      // Determine direction based on normalized value
      const direction: "bearish" | "neutral" | "bullish" =
        normalizedValue >= 60 ? "bearish" : normalizedValue <= 40 ? "bullish" : "neutral";

      return {
        slug: ind.slug,
        name: ind.name,
        category: ind.category,
        normalizedValue,
        weight,
        contribution: Math.round(contribution * 100) / 100,
        direction,
        recordedAt: latest.recordedAt,
      };
    })
  );

  const result = attributions
    .filter(Boolean)
    .sort((a, b) => (b!.contribution - a!.contribution));

  return c.json(result);
});
