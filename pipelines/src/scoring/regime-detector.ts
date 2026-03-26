import { db } from "@marketpulse/db/client";
import { indicators, indicatorValues, marketRegimes, marketScores } from "@marketpulse/db/schema";
import { eq, and, desc, gte, lte, isNull } from "drizzle-orm";

type RegimeLabel = "bull" | "bear" | "sideways" | "crisis" | "recovery";
type Market = "global" | "us" | "eu" | "asia";

const MARKETS: Market[] = ["global", "us", "eu", "asia"];

// ─── Historical regime fingerprints ──────────────────────────────────────────
// Normalized crash-risk values (0–100) for key indicators during notable periods.
// Higher value = more stress/risk for that indicator.

interface HistoricalProfile {
  label: string;
  period: string;
  whatHappenedNext: string;
  indicators: Record<string, number>;
  regimeLabel: RegimeLabel;
}

const HISTORICAL_PROFILES: HistoricalProfile[] = [
  {
    label: "2008 Global Financial Crisis",
    period: "2008-09 to 2009-03",
    whatHappenedNext:
      "S&P 500 fell 57% peak-to-trough. Fed cut rates to zero, TARP bailout. Recovery began March 2009, took 4 years to reach prior highs.",
    regimeLabel: "crisis",
    indicators: {
      vix: 95,
      "yield-curve-2y10y": 30,
      "credit-spreads-hy": 95,
      "put-call-ratio": 85,
      "spx-breadth-200ma": 90,
      "spx-breadth-50ma": 95,
      "consumer-confidence": 85,
      "fear-greed-index": 90,
      "dxy": 70,
      "vix-term-structure": 90,
    },
  },
  {
    label: "2020 COVID Crash",
    period: "2020-02 to 2020-03",
    whatHappenedNext:
      "S&P 500 fell 34% in 33 days — fastest bear market ever. Fed injected $3T. Full recovery in just 5 months due to stimulus.",
    regimeLabel: "crisis",
    indicators: {
      vix: 98,
      "yield-curve-2y10y": 35,
      "credit-spreads-hy": 80,
      "put-call-ratio": 80,
      "spx-breadth-200ma": 95,
      "spx-breadth-50ma": 98,
      "consumer-confidence": 70,
      "fear-greed-index": 95,
      "dxy": 65,
      "vix-term-structure": 95,
    },
  },
  {
    label: "2022 Rate Hike Bear Market",
    period: "2022-01 to 2022-10",
    whatHappenedNext:
      "S&P 500 fell 25%, Nasdaq -35%. Fed raised rates from 0% to 4.5%. Slow recovery starting Q4 2022 as inflation peaked.",
    regimeLabel: "bear",
    indicators: {
      vix: 65,
      "yield-curve-2y10y": 70,
      "credit-spreads-hy": 60,
      "put-call-ratio": 65,
      "spx-breadth-200ma": 75,
      "spx-breadth-50ma": 80,
      "consumer-confidence": 65,
      "fear-greed-index": 70,
      "dxy": 80,
      "vix-term-structure": 65,
      "pmi-manufacturing": 55,
    },
  },
  {
    label: "2019-2020 Bull Run",
    period: "2019-01 to 2020-01",
    whatHappenedNext:
      "S&P 500 gained 29% in 2019. Low volatility, strong earnings. Then COVID crashed it.",
    regimeLabel: "bull",
    indicators: {
      vix: 15,
      "yield-curve-2y10y": 20,
      "credit-spreads-hy": 20,
      "put-call-ratio": 25,
      "spx-breadth-200ma": 15,
      "spx-breadth-50ma": 15,
      "consumer-confidence": 20,
      "fear-greed-index": 30,
      "dxy": 35,
      "vix-term-structure": 10,
    },
  },
  {
    label: "2009-2010 Recovery",
    period: "2009-03 to 2010-06",
    whatHappenedNext:
      "S&P 500 gained 80% from lows. Unemployment peaked in Oct 2009. Economy stabilized by mid-2010.",
    regimeLabel: "recovery",
    indicators: {
      vix: 45,
      "yield-curve-2y10y": 25,
      "credit-spreads-hy": 50,
      "put-call-ratio": 50,
      "spx-breadth-200ma": 40,
      "spx-breadth-50ma": 35,
      "consumer-confidence": 45,
      "fear-greed-index": 45,
      "dxy": 40,
      "vix-term-structure": 45,
    },
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getLatestIndicatorMap(): Promise<Map<string, number>> {
  const windowAgo = new Date(Date.now() - 26 * 60 * 60 * 1000);
  const rows = await db
    .select({
      slug: indicators.slug,
      normalizedValue: indicatorValues.normalizedValue,
    })
    .from(indicatorValues)
    .innerJoin(indicators, eq(indicatorValues.indicatorId, indicators.id))
    .where(and(eq(indicators.isActive, true), gte(indicatorValues.recordedAt, windowAgo)))
    .orderBy(desc(indicatorValues.recordedAt));

  const latest = new Map<string, number>();
  for (const row of rows) {
    if (!latest.has(row.slug)) {
      latest.set(row.slug, Number(row.normalizedValue));
    }
  }
  return latest;
}

async function getLatestCrashScore(market: Market): Promise<number | null> {
  const rows = await db
    .select({ crashScore: marketScores.crashScore })
    .from(marketScores)
    .where(eq(marketScores.market, market))
    .orderBy(desc(marketScores.calculatedAt))
    .limit(1);
  return rows[0] ? Number(rows[0].crashScore) : null;
}

/**
 * Compute Euclidean distance between current indicator map and a historical profile.
 * Lower distance = more similar.
 */
function euclideanDistance(
  current: Map<string, number>,
  profile: Record<string, number>
): number {
  const keys = Object.keys(profile);
  if (keys.length === 0) return Infinity;

  let sumSquares = 0;
  let count = 0;
  for (const key of keys) {
    const curr = current.get(key);
    if (curr !== undefined) {
      const diff = curr - profile[key];
      sumSquares += diff * diff;
      count++;
    }
  }
  return count > 0 ? Math.sqrt(sumSquares / count) : Infinity;
}

function findMostSimilarPeriod(current: Map<string, number>): HistoricalProfile {
  let bestProfile = HISTORICAL_PROFILES[0];
  let bestDistance = Infinity;

  for (const profile of HISTORICAL_PROFILES) {
    const dist = euclideanDistance(current, profile.indicators);
    if (dist < bestDistance) {
      bestDistance = dist;
      bestProfile = profile;
    }
  }

  return bestProfile;
}

/**
 * Classify regime for a market using the crash score and key indicators.
 * Returns [regime, confidence (0–100)].
 */
function classifyRegime(
  crashScore: number,
  indicators: Map<string, number>
): [RegimeLabel, number] {
  const vix = indicators.get("vix") ?? 50;
  const yieldCurve = indicators.get("yield-curve-2y10y") ?? 50;
  const breadth200 = indicators.get("spx-breadth-200ma") ?? 50;
  const fearGreed = indicators.get("fear-greed-index") ?? 50;

  // Crisis: crash_score >= 75 AND vix > 30 (normalized ~67)
  if (crashScore >= 75 && vix > 67) {
    const confidence = Math.min(100, Math.round(((crashScore - 75) / 25) * 50 + ((vix - 67) / 33) * 50));
    return ["crisis", confidence];
  }

  // Bear: crash_score >= 60 AND vix elevated (>25 = normalized ~50)
  if (crashScore >= 60 && vix > 50) {
    const confidence = Math.min(100, Math.round(((crashScore - 60) / 15) * 60 + 20));
    return ["bear", confidence];
  }

  // Bull: crash_score < 25 AND yield curve not inverted (normalized < 50 = spread > 0)
  if (crashScore < 25 && yieldCurve < 50) {
    const confidence = Math.min(100, Math.round(((25 - crashScore) / 25) * 60 + ((50 - yieldCurve) / 50) * 40));
    return ["bull", confidence];
  }

  // Recovery: crash_score 25–49 AND breadth improving (below neutral) AND fear reducing
  if (crashScore >= 25 && crashScore < 50 && breadth200 < 55 && fearGreed < 55) {
    const confidence = Math.min(100, Math.round(40 + ((50 - crashScore) / 25) * 30));
    return ["recovery", confidence];
  }

  // Sideways: default
  const confidence = Math.min(100, Math.round(30 + (50 - Math.abs(crashScore - 50)) / 50 * 40));
  return ["sideways", confidence];
}

/**
 * Expire the previous active regime for a market when a new one is detected.
 */
async function expirePreviousRegime(market: Market, newRegime: RegimeLabel): Promise<void> {
  // Find most recent active regime that differs
  const rows = await db
    .select({ id: marketRegimes.id, regime: marketRegimes.regime })
    .from(marketRegimes)
    .where(and(eq(marketRegimes.market, market), isNull(marketRegimes.expiredAt)))
    .orderBy(desc(marketRegimes.detectedAt))
    .limit(1);

  if (rows[0] && rows[0].regime !== newRegime) {
    await db
      .update(marketRegimes)
      .set({ expiredAt: new Date() })
      .where(eq(marketRegimes.id, rows[0].id));
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function detectMarketRegimes(): Promise<void> {
  const indicatorMap = await getLatestIndicatorMap();

  if (indicatorMap.size === 0) {
    console.warn("[regime-detector] No indicator data available");
    return;
  }

  const mostSimilar = findMostSimilarPeriod(indicatorMap);

  for (const market of MARKETS) {
    const crashScore = await getLatestCrashScore(market);
    if (crashScore === null) {
      console.warn(`[regime-detector] No crash score for ${market}, skipping`);
      continue;
    }

    const [regime, confidence] = classifyRegime(crashScore, indicatorMap);

    await expirePreviousRegime(market, regime);

    await db.insert(marketRegimes).values({
      market,
      regime,
      confidence: String(confidence),
      detectedAt: new Date(),
      metadata: {
        crashScore,
        similarHistoricalPeriod: mostSimilar.label,
        historicalPeriodDates: mostSimilar.period,
        whatHappenedNext: mostSimilar.whatHappenedNext,
        keyIndicators: {
          vix: indicatorMap.get("vix"),
          yieldCurve: indicatorMap.get("yield-curve-2y10y"),
          creditSpreads: indicatorMap.get("credit-spreads-hy"),
          breadth200: indicatorMap.get("spx-breadth-200ma"),
          fearGreed: indicatorMap.get("fear-greed-index"),
        },
      },
    });

    console.log(
      `[regime-detector] ${market}: ${regime} (confidence: ${confidence}%) — similar to ${mostSimilar.label}`
    );
  }
}
