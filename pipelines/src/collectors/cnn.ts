import { db } from "@marketpulse/db/client";
import { indicators, indicatorValues } from "@marketpulse/db/schema";
import { eq, and } from "drizzle-orm";

async function scrapeFearGreedIndex(): Promise<number | null> {
  try {
    // CNN Fear & Greed Index API (unofficial)
    const res = await fetch("https://production.dataviz.cnn.io/index/fearandgreed/graphdata", {
      headers: { "User-Agent": "MarketPulse/1.0" },
    });
    if (!res.ok) return null;
    const data = await res.json() as any;
    return data?.fear_and_greed?.score ?? null;
  } catch {
    return null;
  }
}

export async function fetchFearGreedIndex(): Promise<void> {
  const indicator = await db
    .select()
    .from(indicators)
    .where(and(eq(indicators.slug, "fear-greed-index"), eq(indicators.isActive, true)))
    .limit(1);

  if (!indicator[0]) return;

  const score = await scrapeFearGreedIndex();
  if (score === null) {
    console.warn("[cnn] Failed to fetch Fear & Greed Index");
    return;
  }

  // Fear & Greed is 0-100, where 0 = extreme fear (crash risk) and 100 = extreme greed
  // Invert for crash probability: extreme greed can signal bubble, extreme fear = crisis
  const normalizedValue = Math.min(100, Math.max(0, 100 - score));

  await db.insert(indicatorValues).values({
    indicatorId: indicator[0].id,
    value: String(score),
    normalizedValue: String(normalizedValue),
    recordedAt: new Date(),
  });

  console.log(`[cnn] Fear & Greed: ${score} (normalized: ${normalizedValue})`);
}
