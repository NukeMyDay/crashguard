import { db } from "@marketpulse/db/client";
import { indicators, indicatorValues } from "@marketpulse/db/schema";
import { eq, and } from "drizzle-orm";

const FRED_API_KEY = process.env.FRED_API_KEY;

const FRED_SERIES: Record<string, { slug: string; normalize: (v: number) => number }> = {
  "T10Y2Y": {
    slug: "yield-curve-2y10y",
    normalize: (v) => Math.min(100, Math.max(0, ((0 - v) / 3) * 100 + 50)),
  },
  "BAMLH0A0HYM2": {
    slug: "credit-spreads-hy",
    normalize: (v) => Math.min(100, Math.max(0, ((v - 3) / 10) * 100)),
  },
  "MPMICTOT": {
    slug: "pmi-manufacturing",
    normalize: (v) => Math.min(100, Math.max(0, ((50 - v) / 15) * 100 + 50)),
  },
  "UMCSENT": {
    slug: "consumer-confidence",
    normalize: (v) => Math.min(100, Math.max(0, ((80 - v) / 60) * 100)),
  },
  "M2SL": {
    slug: "m2-money-supply",
    normalize: () => 50, // complex — placeholder
  },
};

async function fetchFredSeries(seriesId: string): Promise<number | null> {
  if (!FRED_API_KEY) {
    console.warn("[fred] FRED_API_KEY not set, skipping");
    return null;
  }
  try {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=1`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json() as any;
    const obs = data?.observations?.[0]?.value;
    return obs && obs !== "." ? Number(obs) : null;
  } catch {
    return null;
  }
}

export async function fetchFredIndicators(): Promise<void> {
  for (const [seriesId, config] of Object.entries(FRED_SERIES)) {
    const indicator = await db
      .select()
      .from(indicators)
      .where(and(eq(indicators.slug, config.slug), eq(indicators.isActive, true)))
      .limit(1);

    if (!indicator[0]) continue;

    const value = await fetchFredSeries(seriesId);
    if (value === null) {
      console.warn(`[fred] Failed to fetch ${seriesId}`);
      continue;
    }

    const normalizedValue = config.normalize(value);

    await db.insert(indicatorValues).values({
      indicatorId: indicator[0].id,
      value: String(value),
      normalizedValue: String(Math.round(normalizedValue * 100) / 100),
      recordedAt: new Date(),
    });

    console.log(`[fred] ${config.slug}: ${value} (normalized: ${normalizedValue.toFixed(1)})`);
  }
}
