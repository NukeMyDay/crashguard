import { db } from "@marketpulse/db/client";
import { indicators, indicatorValues } from "@marketpulse/db/schema";
import { eq, and } from "drizzle-orm";

const SECTOR_ETFS: Record<string, { name: string; ticker: string }> = {
  "sector-etf-xlk":  { name: "Technology Select Sector SPDR",           ticker: "XLK" },
  "sector-etf-xlf":  { name: "Financial Select Sector SPDR",             ticker: "XLF" },
  "sector-etf-xle":  { name: "Energy Select Sector SPDR",                ticker: "XLE" },
  "sector-etf-xlv":  { name: "Health Care Select Sector SPDR",           ticker: "XLV" },
  "sector-etf-xli":  { name: "Industrial Select Sector SPDR",            ticker: "XLI" },
  "sector-etf-xlp":  { name: "Consumer Staples Select Sector SPDR",      ticker: "XLP" },
  "sector-etf-xlu":  { name: "Utilities Select Sector SPDR",             ticker: "XLU" },
  "sector-etf-xlb":  { name: "Materials Select Sector SPDR",             ticker: "XLB" },
  "sector-etf-xlre": { name: "Real Estate Select Sector SPDR",           ticker: "XLRE" },
  "sector-etf-xlc":  { name: "Communication Services Select Sector SPDR", ticker: "XLC" },
  "sector-etf-xly":  { name: "Consumer Discretionary Select Sector SPDR", ticker: "XLY" },
};

interface YahooQuoteResult {
  price: number;
  previousClose: number;
  changePercent: number;
}

async function fetchYahooETFQuote(ticker: string): Promise<YahooQuoteResult | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=5d`;
    const res = await fetch(url, {
      headers: { "User-Agent": "MarketPulse/1.0" },
    });
    if (!res.ok) return null;
    const data = await res.json() as any;
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) return null;

    const price = meta.regularMarketPrice;
    const previousClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
    const changePercent = previousClose > 0 ? ((price - previousClose) / previousClose) * 100 : 0;
    return { price, previousClose, changePercent };
  } catch {
    return null;
  }
}

// Normalize daily % change to crash risk score (0–100)
// Strong positive performance = low risk (0); large drawdown = high risk (100)
function normalizeChangePercent(changePercent: number): number {
  // -5% or worse => 100 (extreme stress), +5% or better => 0 (no stress)
  const clamped = Math.max(-5, Math.min(5, changePercent));
  return Math.round(((clamped * -1 + 5) / 10) * 100);
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
      category: "market",
      source: "yahoo",
      frequency: "hourly",
      weight: "0.0100",
      isActive: true,
    })
    .returning({ id: indicators.id });

  return created?.id ?? null;
}

export async function fetchSectorETFs(): Promise<void> {
  const now = new Date();

  for (const [slug, { name, ticker }] of Object.entries(SECTOR_ETFS)) {
    const indicatorId = await ensureIndicator(slug, name);
    if (!indicatorId) {
      console.warn(`[sector-etfs] Could not find or create indicator for ${slug}`);
      continue;
    }

    const quote = await fetchYahooETFQuote(ticker);
    if (!quote) {
      console.warn(`[sector-etfs] Failed to fetch ${slug} (${ticker})`);
      continue;
    }

    const normalizedValue = normalizeChangePercent(quote.changePercent);

    await db.insert(indicatorValues).values({
      indicatorId,
      value: String(quote.price),
      normalizedValue: String(normalizedValue),
      recordedAt: now,
    });

    console.log(
      `[sector-etfs] ${ticker}: $${quote.price.toFixed(2)} (${quote.changePercent >= 0 ? "+" : ""}${quote.changePercent.toFixed(2)}%) → risk ${normalizedValue}`
    );
  }
}
