import { db } from "@marketpulse/db/client";
import { indicators, indicatorValues } from "@marketpulse/db/schema";
import { eq } from "drizzle-orm";

// Top 50 S&P 500 holdings by weight (as of early 2025)
const SP500_TOP50 = [
  "AAPL", "MSFT", "NVDA", "AMZN", "META", "GOOGL", "GOOG", "TSLA", "BRK-B",
  "JPM", "LLY", "V", "UNH", "XOM", "AVGO", "MA", "JNJ", "PG", "COST",
  "HD", "MRK", "ABBV", "CVX", "KO", "WMT", "BAC", "CRM", "PEP", "ORCL",
  "ACN", "MCD", "TMO", "NFLX", "AMD", "CSCO", "ABT", "ADBE", "TXN", "LIN",
  "DHR", "WFC", "AMGN", "PM", "NEE", "INTU", "RTX", "ISRG", "QCOM", "CAT",
];

interface PriceHistory {
  closes: number[];
}

async function fetchPriceHistory(ticker: string, days: number): Promise<PriceHistory | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=${days}d`;
    const res = await fetch(url, {
      headers: { "User-Agent": "MarketPulse/1.0" },
    });
    if (!res.ok) return null;
    const data = await res.json() as any;
    const closes = data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close as number[] | undefined;
    if (!closes || closes.length === 0) return null;
    // Filter out null/undefined values
    return { closes: closes.filter((c): c is number => c != null) };
  } catch {
    return null;
  }
}

function movingAverage(closes: number[], period: number): number | null {
  if (closes.length < period) return null;
  const slice = closes.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
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
      frequency: "daily",
      weight: "0.0200",
      warningThreshold: "40",
      criticalThreshold: "25",
      isActive: true,
    })
    .returning({ id: indicators.id });

  return created?.id ?? null;
}

export async function fetchMarketBreadth(): Promise<void> {
  const now = new Date();

  let above50Count = 0;
  let above200Count = 0;
  let total50 = 0;
  let total200 = 0;

  console.log(`[market-breadth] Fetching data for ${SP500_TOP50.length} stocks...`);

  for (const ticker of SP500_TOP50) {
    const history = await fetchPriceHistory(ticker, 210);
    if (!history || history.closes.length < 5) {
      console.warn(`[market-breadth] Skipping ${ticker} — insufficient data`);
      continue;
    }

    const currentPrice = history.closes[history.closes.length - 1];

    const ma50 = movingAverage(history.closes, 50);
    const ma200 = movingAverage(history.closes, 200);

    if (ma50 !== null) {
      total50++;
      if (currentPrice > ma50) above50Count++;
    }

    if (ma200 !== null) {
      total200++;
      if (currentPrice > ma200) above200Count++;
    }

    // Small delay to avoid rate limiting
    await new Promise((r) => setTimeout(r, 50));
  }

  const breadth50 = total50 > 0 ? (above50Count / total50) * 100 : 50;
  const breadth200 = total200 > 0 ? (above200Count / total200) * 100 : 50;

  // Normalize: high breadth (>75%) = low risk (0–25), low breadth (<25%) = high risk (75–100)
  const normalized50 = Math.round(100 - breadth50);
  const normalized200 = Math.round(100 - breadth200);

  const id50 = await ensureIndicator("spx-breadth-50ma", "S&P 500 Breadth (% Above 50-day MA)");
  const id200 = await ensureIndicator("spx-breadth-200ma", "S&P 500 Breadth (% Above 200-day MA)");

  if (id50) {
    await db.insert(indicatorValues).values({
      indicatorId: id50,
      value: String(breadth50.toFixed(2)),
      normalizedValue: String(normalized50),
      recordedAt: now,
    });
    console.log(`[market-breadth] 50MA breadth: ${breadth50.toFixed(1)}% above (${above50Count}/${total50}) → risk ${normalized50}`);
  }

  if (id200) {
    await db.insert(indicatorValues).values({
      indicatorId: id200,
      value: String(breadth200.toFixed(2)),
      normalizedValue: String(normalized200),
      recordedAt: now,
    });
    console.log(`[market-breadth] 200MA breadth: ${breadth200.toFixed(1)}% above (${above200Count}/${total200}) → risk ${normalized200}`);
  }
}
