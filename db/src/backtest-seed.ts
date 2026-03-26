/**
 * Historical backtest seeder — injects synthetic indicator values and market scores
 * for known crash periods to allow dashboard history charts to show meaningful data.
 *
 * Crash periods modeled:
 *  - 2008 Global Financial Crisis (Sep–Oct 2008)
 *  - 2020 COVID Crash (Feb–Mar 2020)
 *  - 2022 Rate Shock / Bear Market (Jun–Oct 2022)
 */

import { db } from "./client.js";
import { indicators, indicatorValues, marketScores } from "./schema/index.js";
import { eq } from "drizzle-orm";

interface CrashScenario {
  label: string;
  startDate: Date;
  endDate: Date;
  peakDate: Date;
  // Indicator normalized values at peak stress (0–100)
  peakValues: Record<string, number>;
  // Market crash scores at peak
  peakScores: Record<string, number>;
}

const SCENARIOS: CrashScenario[] = [
  {
    label: "2008 Global Financial Crisis",
    startDate: new Date("2008-07-01"),
    endDate: new Date("2008-11-30"),
    peakDate: new Date("2008-10-10"),
    peakValues: {
      "vix": 96,                   // VIX hit 89 intraday Oct 2008
      "yield-curve-2y10y": 15,     // Curve was steepening but dominated by flight-to-safety
      "credit-spreads-hy": 98,     // HY spreads >1500bps
      "put-call-ratio": 85,        // Extreme put buying
      "spx-breadth-200ma": 50,
      "dxy": 72,                   // DXY surged in late 2008
      "pmi-manufacturing": 88,     // PMI collapsed below 40
      "consumer-confidence": 91,   // UMCSENT hit multi-decade lows
      "m2-money-supply": 30,
      "fear-greed-index": 92,      // Extreme fear (inverted to crash risk)
    },
    peakScores: { global: 88, us: 91, eu: 85, asia: 82 },
  },
  {
    label: "2020 COVID Crash",
    startDate: new Date("2020-02-01"),
    endDate: new Date("2020-05-31"),
    peakDate: new Date("2020-03-20"),
    peakValues: {
      "vix": 99,                   // VIX hit 85 on March 18
      "yield-curve-2y10y": 10,     // Curve briefly inverted then steepened sharply
      "credit-spreads-hy": 90,     // HY spreads >1000bps briefly
      "put-call-ratio": 80,
      "spx-breadth-200ma": 50,
      "dxy": 68,                   // DXY surged briefly in March
      "pmi-manufacturing": 82,
      "consumer-confidence": 79,
      "m2-money-supply": 25,
      "fear-greed-index": 95,
    },
    peakScores: { global: 84, us: 87, eu: 81, asia: 79 },
  },
  {
    label: "2022 Rate Shock / Bear Market",
    startDate: new Date("2022-01-01"),
    endDate: new Date("2022-12-31"),
    peakDate: new Date("2022-10-13"),
    peakValues: {
      "vix": 62,                   // VIX in 30–35 range Oct 2022
      "yield-curve-2y10y": 85,     // Deeply inverted (2Y > 10Y by ~80bps)
      "credit-spreads-hy": 72,     // HY spreads ~600bps
      "put-call-ratio": 68,
      "spx-breadth-200ma": 50,
      "dxy": 88,                   // DXY at 20-year high ~115
      "pmi-manufacturing": 65,     // PMI contracting
      "consumer-confidence": 74,
      "m2-money-supply": 55,
      "fear-greed-index": 71,
    },
    peakScores: { global: 67, us: 70, eu: 65, asia: 62 },
  },
];

async function getIndicatorIdMap(): Promise<Map<string, string>> {
  const rows = await db.select({ id: indicators.id, slug: indicators.slug }).from(indicators);
  return new Map(rows.map((r) => [r.slug, r.id]));
}

function interpolate(start: number, peak: number, end: number, t: number): number {
  // t in [0, 1]: 0 = startDate, 0.5 = peakDate, 1 = endDate
  if (t <= 0.5) return start + (peak - start) * (t / 0.5);
  return peak + (end - peak) * ((t - 0.5) / 0.5);
}

async function seedScenario(scenario: CrashScenario, indicatorIds: Map<string, string>): Promise<void> {
  const msTotal = scenario.endDate.getTime() - scenario.startDate.getTime();
  const msPeak = scenario.peakDate.getTime() - scenario.startDate.getTime();

  // Generate one data point per week for indicator values
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const weeks = Math.ceil(msTotal / weekMs);

  for (let w = 0; w <= weeks; w++) {
    const recordedAt = new Date(scenario.startDate.getTime() + w * weekMs);
    if (recordedAt > scenario.endDate) break;

    const t = Math.min(1, (recordedAt.getTime() - scenario.startDate.getTime()) / msTotal);
    const tPeakNorm = (scenario.peakDate.getTime() - scenario.startDate.getTime()) / msTotal;

    for (const [slug, peakNorm] of Object.entries(scenario.peakValues)) {
      const indId = indicatorIds.get(slug);
      if (!indId) continue;

      const normalizedValue = interpolate(20, peakNorm, 20, t);
      const clampedNorm = Math.min(100, Math.max(0, normalizedValue));

      await db.insert(indicatorValues).values({
        indicatorId: indId,
        value: String(clampedNorm.toFixed(2)), // using normalized as raw for backtest data
        normalizedValue: String(Math.round(clampedNorm * 100) / 100),
        recordedAt,
      }).onConflictDoNothing();
    }
  }

  // Generate daily market scores
  const dayMs = 24 * 60 * 60 * 1000;
  const days = Math.ceil(msTotal / dayMs);

  for (let d = 0; d <= days; d++) {
    const calculatedAt = new Date(scenario.startDate.getTime() + d * dayMs);
    if (calculatedAt > scenario.endDate) break;

    const t = (calculatedAt.getTime() - scenario.startDate.getTime()) / msTotal;

    for (const market of ["global", "us", "eu", "asia"] as const) {
      const peakScore = scenario.peakScores[market];
      const crashScore = Math.round(interpolate(15, peakScore, 15, t) * 100) / 100;

      await db.insert(marketScores).values({
        market,
        crashScore: String(crashScore),
        componentScores: {
          volatility: interpolate(10, scenario.peakValues["vix"] ?? 50, 10, t),
          sentiment: interpolate(10, scenario.peakValues["fear-greed-index"] ?? 50, 10, t),
          credit: interpolate(10, scenario.peakValues["credit-spreads-hy"] ?? 50, 10, t),
          macro: interpolate(10, scenario.peakValues["yield-curve-2y10y"] ?? 50, 10, t),
        },
        calculatedAt,
      }).onConflictDoNothing();
    }
  }

  console.log(`[backtest] Seeded scenario: ${scenario.label}`);
}

async function seedBacktest() {
  console.log("Seeding historical backtest data...");
  const indicatorIds = await getIndicatorIdMap();

  if (indicatorIds.size === 0) {
    console.error("No indicators found — run the main seed.ts first");
    process.exit(1);
  }

  for (const scenario of SCENARIOS) {
    await seedScenario(scenario, indicatorIds);
  }

  console.log("Backtest seed complete.");
  process.exit(0);
}

seedBacktest().catch((err) => {
  console.error(err);
  process.exit(1);
});
