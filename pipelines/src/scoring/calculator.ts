import { db } from "@marketpulse/db/client";
import { indicators, indicatorValues, marketScores, alerts } from "@marketpulse/db/schema";
import { eq, and, desc, gte, isNull } from "drizzle-orm";
import type { Market } from "@marketpulse/shared";
import { CRASH_SCORE_THRESHOLDS } from "@marketpulse/shared";

const MARKETS: Market[] = ["us", "eu", "asia", "global"];

interface IndicatorRow {
  slug: string;
  category: string;
  weight: string;
  normalizedValue: string;
}

async function getLatestIndicatorValues(): Promise<Map<string, IndicatorRow>> {
  // Use a wider window (25h) to capture daily indicators that update once a day
  const windowAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);

  const rows = await db
    .select({
      slug: indicators.slug,
      category: indicators.category,
      weight: indicators.weight,
      normalizedValue: indicatorValues.normalizedValue,
    })
    .from(indicatorValues)
    .innerJoin(indicators, eq(indicatorValues.indicatorId, indicators.id))
    .where(and(
      eq(indicators.isActive, true),
      gte(indicatorValues.recordedAt, windowAgo),
    ))
    .orderBy(desc(indicatorValues.recordedAt));

  const latest = new Map<string, IndicatorRow>();
  for (const row of rows) {
    if (!latest.has(row.slug)) {
      latest.set(row.slug, row);
    }
  }
  return latest;
}

// US-relevant indicators weighted more heavily for US market
const US_WEIGHTS: Record<string, number> = {
  "vix": 1.3, "spx-breadth-200ma": 1.2, "put-call-ratio": 1.1,
  "yield-curve-2y10y": 1.1, "credit-spreads-hy": 1.0, "consumer-confidence": 1.0,
};
// EU indicators (EU-focused slugs would get higher weight if we had them)
const EU_WEIGHTS: Record<string, number> = {
  "yield-curve-2y10y": 1.2, "credit-spreads-hy": 1.1, "pmi-manufacturing": 1.2,
  "dxy": 0.8,
};
// Asia indicators
const ASIA_WEIGHTS: Record<string, number> = {
  "dxy": 1.2, "vix": 1.1, "yield-curve-2y10y": 0.9,
};

function computeWeightedScore(
  values: Map<string, IndicatorRow>,
  marketWeights: Record<string, number>
): number {
  let totalWeight = 0;
  let weightedSum = 0;

  for (const [slug, row] of values.entries()) {
    const baseWeight = Number(row.weight);
    const multiplier = marketWeights[slug] ?? 1.0;
    const w = baseWeight * multiplier;
    weightedSum += Number(row.normalizedValue) * w;
    totalWeight += w;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 50;
}

export async function calculateMarketScores(): Promise<void> {
  const latestValues = await getLatestIndicatorValues();

  if (latestValues.size === 0) {
    console.warn("[scoring] No recent indicator values found");
    return;
  }

  const marketScoreMap: Record<Market, number> = {
    global: computeWeightedScore(latestValues, {}),
    us: computeWeightedScore(latestValues, US_WEIGHTS),
    eu: computeWeightedScore(latestValues, EU_WEIGHTS),
    asia: computeWeightedScore(latestValues, ASIA_WEIGHTS),
  };

  for (const market of MARKETS) {
    const score = marketScoreMap[market];
    const crashScore = Math.min(100, Math.max(0, Math.round(score * 100) / 100));

    await db.insert(marketScores).values({
      market,
      crashScore: String(crashScore),
      componentScores: {
        volatility: Number(latestValues.get("vix")?.normalizedValue ?? 50),
        sentiment: Number(latestValues.get("fear-greed-index")?.normalizedValue ?? 50),
        credit: Number(latestValues.get("credit-spreads-hy")?.normalizedValue ?? 50),
        macro: Number(latestValues.get("yield-curve-2y10y")?.normalizedValue ?? 50),
      },
      calculatedAt: new Date(),
    });

    // Generate alerts if thresholds exceeded — deduplicate by checking for unacknowledged alert
    if (crashScore >= CRASH_SCORE_THRESHOLDS.WARNING) {
      const severity =
        crashScore >= CRASH_SCORE_THRESHOLDS.EXTREME ? "extreme" :
        crashScore >= CRASH_SCORE_THRESHOLDS.HIGH ? "critical" : "warning";

      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const existing = await db
        .select({ id: alerts.id })
        .from(alerts)
        .where(and(
          eq(alerts.market, market),
          eq(alerts.severity, severity),
          gte(alerts.triggeredAt, oneHourAgo),
          isNull(alerts.acknowledgedAt),
        ))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(alerts).values({
          market,
          severity,
          message: `${market.toUpperCase()} crash probability at ${crashScore.toFixed(1)}% — ${severity} threshold exceeded`,
          crashScore: String(crashScore),
          triggeredAt: new Date(),
        });
      }
    }

    console.log(`[scoring] ${market}: ${crashScore.toFixed(1)}`);
  }
}
