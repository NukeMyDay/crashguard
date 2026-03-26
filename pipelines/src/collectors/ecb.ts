import { db } from "@marketpulse/db/client";
import { indicators, indicatorValues } from "@marketpulse/db/schema";
import { eq, and } from "drizzle-orm";

// ECB Statistical Data Warehouse API
// https://data-api.ecb.europa.eu/service/data/{flow}/{key}
const ECB_BASE = "https://data-api.ecb.europa.eu/service/data";

interface ECBSeries {
  slug: string;
  flow: string;
  key: string;
  normalize: (v: number) => number;
  description: string;
}

const ECB_SERIES: ECBSeries[] = [
  {
    slug: "eu-sovereign-spread",
    flow: "YC",
    key: "B.U2.EUR.4F.G_N_A.SV_C_YM.SR_10Y",
    normalize: (v) => Math.min(100, Math.max(0, ((v - 0.5) / 4) * 100)),
    description: "Euro area 10Y sovereign yield (proxy for spread stress)",
  },
  {
    slug: "eu-ciss",
    flow: "CISS",
    key: "W.U2.Z0Z.4F.EC.SOV_EW.IDX",
    normalize: (v) => Math.min(100, Math.max(0, v * 100)),
    description: "Composite Indicator of Systemic Stress (0–1 scale)",
  },
];

async function fetchECBSeries(flow: string, key: string): Promise<number | null> {
  try {
    const url = `${ECB_BASE}/${flow}/${key}?format=jsondata&lastNObservations=1`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = await res.json() as any;
    // ECB JSON format: dataSets[0].series["0:0:..."].observations
    const series = data?.dataSets?.[0]?.series;
    if (!series) return null;
    const firstSeries = Object.values(series)[0] as any;
    const observations = firstSeries?.observations;
    if (!observations) return null;
    const lastObs = Object.values(observations).pop() as any[];
    return lastObs?.[0] ?? null;
  } catch {
    return null;
  }
}

export async function fetchECBIndicators(): Promise<void> {
  for (const config of ECB_SERIES) {
    const indicator = await db
      .select()
      .from(indicators)
      .where(and(eq(indicators.slug, config.slug), eq(indicators.isActive, true)))
      .limit(1);

    if (!indicator[0]) {
      console.warn(`[ecb] Indicator ${config.slug} not found in DB — skipping`);
      continue;
    }

    const value = await fetchECBSeries(config.flow, config.key);
    if (value === null) {
      console.warn(`[ecb] Failed to fetch ${config.slug} (${config.flow}/${config.key})`);
      continue;
    }

    const normalizedValue = config.normalize(value);

    await db.insert(indicatorValues).values({
      indicatorId: indicator[0].id,
      value: String(value),
      normalizedValue: String(Math.round(normalizedValue * 100) / 100),
      recordedAt: new Date(),
    });

    console.log(`[ecb] ${config.slug}: ${value} (normalized: ${normalizedValue.toFixed(1)})`);
  }
}
