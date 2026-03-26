import { db } from "@marketpulse/db/client";
import { indicators, indicatorValues, marketScores, alerts, newsItems, earningsEvents, alertWebhooks, macroEvents } from "@marketpulse/db/schema";
import { eq, and, desc, gte, lte, isNull } from "drizzle-orm";
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

async function getNewsSentimentAdjustment(): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const rows = await db
    .select({ sentiment: newsItems.sentiment })
    .from(newsItems)
    .where(gte(newsItems.fetchedAt, since));

  const total = rows.length;
  if (total === 0) return 0;

  const bullish = rows.filter(r => r.sentiment === "bullish").length;
  const bearish = rows.filter(r => r.sentiment === "bearish").length;
  const sentimentScore = (bullish - bearish) / total * 100;

  let adjustment = 0;
  if (sentimentScore < -50) {
    adjustment = 10;
    console.log("[score] news sentiment contribution: +10 (extreme bearish)");
  } else if (sentimentScore < -30) {
    adjustment = 5;
    console.log("[score] news sentiment contribution: +5 (strong bearish)");
  } else if (sentimentScore > 30) {
    adjustment = -3;
    console.log("[score] news sentiment contribution: -3 (bullish)");
  }

  return adjustment;
}

// Major tickers whose earnings create broad market uncertainty
const MAJOR_EARNINGS_TICKERS = new Set([
  "AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "TSLA", "JPM", "BAC", "GS",
]);

const SEVERITY_RANK: Record<string, number> = { warning: 1, critical: 2, extreme: 3 };

async function deliverWebhooks(alert: typeof alerts.$inferSelect): Promise<void> {
  const webhooks = await db
    .select()
    .from(alertWebhooks)
    .where(eq(alertWebhooks.isActive, true));

  for (const wh of webhooks) {
    if ((SEVERITY_RANK[alert.severity] ?? 0) >= (SEVERITY_RANK[wh.minSeverity] ?? 0)) {
      fetch(wh.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          market: alert.market,
          severity: alert.severity,
          crashScore: alert.crashScore,
          message: alert.message,
          triggeredAt: alert.triggeredAt,
        }),
      }).catch((e: Error) => console.error("[webhook] delivery failed:", e.message));
    }
  }
}

async function getFomcProximityAdjustment(): Promise<number> {
  const now = new Date();
  const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const upcoming = await db
    .select({ id: macroEvents.id })
    .from(macroEvents)
    .where(and(eq(macroEvents.eventType, "fomc"), gte(macroEvents.eventDate, now), lte(macroEvents.eventDate, in3Days)))
    .limit(1);

  if (upcoming.length > 0) {
    console.log("[score] FOMC proximity: +2 (meeting within 3 days)");
    return 2;
  }
  return 0;
}

async function getEarningsUncertaintyAdjustment(): Promise<number> {
  const now = new Date();
  const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const upcoming = await db
    .select({ ticker: earningsEvents.ticker })
    .from(earningsEvents)
    .where(and(gte(earningsEvents.reportDate, now), lte(earningsEvents.reportDate, in3Days)));

  const majorCount = upcoming.filter((r) => MAJOR_EARNINGS_TICKERS.has(r.ticker)).length;

  if (majorCount >= 3) {
    console.log(`[score] earnings uncertainty: +3 (${majorCount} major companies reporting in 3 days)`);
    return 3;
  }
  return 0;
}

export async function calculateMarketScores(): Promise<void> {
  const latestValues = await getLatestIndicatorValues();

  if (latestValues.size === 0) {
    console.warn("[scoring] No recent indicator values found");
    return;
  }

  const sentimentAdjustment = await getNewsSentimentAdjustment();
  const earningsAdjustment = await getEarningsUncertaintyAdjustment();
  const fomcAdjustment = await getFomcProximityAdjustment();

  const marketScoreMap: Record<Market, number> = {
    global: computeWeightedScore(latestValues, {}),
    us: computeWeightedScore(latestValues, US_WEIGHTS),
    eu: computeWeightedScore(latestValues, EU_WEIGHTS),
    asia: computeWeightedScore(latestValues, ASIA_WEIGHTS),
  };

  for (const market of MARKETS) {
    const score = marketScoreMap[market] + sentimentAdjustment + earningsAdjustment + fomcAdjustment;
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
        const [newAlert] = await db.insert(alerts).values({
          market,
          severity,
          message: `${market.toUpperCase()} crash probability at ${crashScore.toFixed(1)}% — ${severity} threshold exceeded`,
          crashScore: String(crashScore),
          triggeredAt: new Date(),
        }).returning();
        await deliverWebhooks(newAlert);
      }
    }

    console.log(`[scoring] ${market}: ${crashScore.toFixed(1)}`);
  }
}
