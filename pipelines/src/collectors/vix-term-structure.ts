import { db } from "@marketpulse/db/client";
import { indicators, indicatorValues } from "@marketpulse/db/schema";
import { eq } from "drizzle-orm";

async function fetchYahooPrice(ticker: string): Promise<number | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: { "User-Agent": "MarketPulse/1.0" },
    });
    if (!res.ok) return null;
    const data = await res.json() as any;
    return data?.chart?.result?.[0]?.meta?.regularMarketPrice ?? null;
  } catch {
    return null;
  }
}

async function ensureIndicator(slug: string, name: string): Promise<string | null> {
  const existing = await db
    .select({ id: indicators.id })
    .from(indicators)
    .where(eq(indicators.slug, slug))
    .limit(1);

  if (existing[0]) return existing[0].id;

  const [created] = await db
    .insert(indicators)
    .values({
      slug,
      name,
      category: "volatility",
      source: "yahoo",
      frequency: "hourly",
      weight: "0.0300",
      warningThreshold: "0.9",   // contango breaking down
      criticalThreshold: "0.8",  // clear backwardation
      isActive: true,
    })
    .returning({ id: indicators.id });

  return created?.id ?? null;
}

/**
 * VIX Term Structure: ratio of VIX3M to VIX spot.
 *
 * Normal (contango):      VIX3M > VIX → ratio > 1.0  (calm market, investors expect future vol)
 * Stress (backwardation): VIX3M < VIX → ratio < 1.0  (panic, near-term vol elevated)
 *
 * Normalize to crash risk (0–100):
 *   ratio ≥ 1.15 → 0   (deep contango, calm)
 *   ratio ≈ 1.0  → 40  (neutral)
 *   ratio ≈ 0.85 → 80  (backwardation, stress)
 *   ratio ≤ 0.70 → 100 (severe backwardation / panic)
 */
function normalizeVIXTermStructure(ratio: number): number {
  if (ratio >= 1.15) return 0;
  if (ratio >= 1.0)  return Math.round(((1.15 - ratio) / 0.15) * 40);
  if (ratio >= 0.85) return Math.round(40 + ((1.0 - ratio) / 0.15) * 40);
  if (ratio >= 0.70) return Math.round(80 + ((0.85 - ratio) / 0.15) * 20);
  return 100;
}

export async function fetchVIXTermStructure(): Promise<void> {
  const [vixSpot, vix3m] = await Promise.all([
    fetchYahooPrice("^VIX"),
    fetchYahooPrice("^VIX3M"),
  ]);

  if (vixSpot === null || vix3m === null) {
    console.warn(`[vix-term-structure] Failed to fetch VIX data — VIX: ${vixSpot}, VIX3M: ${vix3m}`);
    return;
  }

  // Avoid division by zero
  if (vixSpot <= 0) {
    console.warn(`[vix-term-structure] Invalid VIX spot value: ${vixSpot}`);
    return;
  }

  const ratio = vix3m / vixSpot;
  const normalizedValue = normalizeVIXTermStructure(ratio);
  const structure = ratio >= 1.0 ? "contango" : "backwardation";

  const indicatorId = await ensureIndicator(
    "vix-term-structure",
    "VIX Term Structure (VIX3M/VIX Ratio)"
  );

  if (!indicatorId) {
    console.warn("[vix-term-structure] Could not find or create indicator");
    return;
  }

  await db.insert(indicatorValues).values({
    indicatorId,
    value: String(ratio.toFixed(4)),
    normalizedValue: String(normalizedValue),
    recordedAt: new Date(),
  });

  console.log(
    `[vix-term-structure] VIX: ${vixSpot.toFixed(2)}, VIX3M: ${vix3m.toFixed(2)}, ratio: ${ratio.toFixed(4)} (${structure}) → risk ${normalizedValue}`
  );
}
