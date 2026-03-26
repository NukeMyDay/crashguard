import { db } from "@marketpulse/db/client";
import { indicators, indicatorValues } from "@marketpulse/db/schema";
import { eq, and } from "drizzle-orm";

const YAHOO_TICKERS: Record<string, string> = {
  "vix": "^VIX",
  "put-call-ratio": "^PCALL",
  "dxy": "DX-Y.NYB",
  "spx-breadth-200ma": "^GSPC",
};

async function fetchYahooQuote(ticker: string): Promise<number | null> {
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

function normalizeVIX(value: number): number {
  // VIX 10 = low risk (0), VIX 40+ = extreme (100)
  return Math.min(100, Math.max(0, ((value - 10) / 30) * 100));
}

function normalizeDXY(value: number): number {
  // DXY surge signals stress; 90 = low risk, 115 = high risk
  return Math.min(100, Math.max(0, ((value - 90) / 25) * 100));
}

function normalizePutCallRatio(value: number): number {
  // Put/Call ratio: >1.0 = fear/bearish (higher risk), <0.7 = complacency (moderate risk)
  // 0.6 = low stress (0), 1.5+ = extreme fear (100)
  return Math.min(100, Math.max(0, ((value - 0.6) / 0.9) * 100));
}

function normalizeSPXBreadth(value: number): number {
  // SPX price used as breadth proxy — rising index = low stress
  // This is a simplified approach; ideally use % of stocks above 200-day MA
  // For now: no normalization possible without additional data — use neutral 50
  return 50;
}

export async function fetchYahooIndicators(): Promise<void> {
  for (const [slug, ticker] of Object.entries(YAHOO_TICKERS)) {
    const indicator = await db
      .select()
      .from(indicators)
      .where(and(eq(indicators.slug, slug), eq(indicators.isActive, true)))
      .limit(1);

    if (!indicator[0]) continue;

    const value = await fetchYahooQuote(ticker);
    if (value === null) {
      console.warn(`[yahoo] Failed to fetch ${slug} (${ticker})`);
      continue;
    }

    let normalizedValue = 50;
    if (slug === "vix") normalizedValue = normalizeVIX(value);
    else if (slug === "dxy") normalizedValue = normalizeDXY(value);
    else if (slug === "put-call-ratio") normalizedValue = normalizePutCallRatio(value);
    else if (slug === "spx-breadth-200ma") normalizedValue = normalizeSPXBreadth(value);

    await db.insert(indicatorValues).values({
      indicatorId: indicator[0].id,
      value: String(value),
      normalizedValue: String(Math.round(normalizedValue * 100) / 100),
      recordedAt: new Date(),
    });

    console.log(`[yahoo] ${slug}: ${value} (normalized: ${normalizedValue.toFixed(1)})`);
  }
}
