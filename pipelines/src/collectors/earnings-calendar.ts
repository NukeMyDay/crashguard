import { db } from "@marketpulse/db/client";
import { earningsEvents } from "@marketpulse/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";

// S&P 500 mega caps + major sector leaders (50 tickers)
const TRACKED_TICKERS = [
  // Mega caps
  "AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "TSLA", "BRK-B", "LLY", "JPM",
  // Tech
  "AVGO", "ORCL", "ASML", "AMD", "QCOM", "TXN", "INTC", "IBM", "CRM", "ADBE",
  // Healthcare
  "UNH", "JNJ", "MRK", "ABBV", "TMO", "ABT", "DHR", "PFE", "BMY", "AMGN",
  // Finance
  "BAC", "WFC", "GS", "MS", "BLK", "SCHW", "C", "AXP",
  // Consumer/Retail
  "WMT", "HD", "COST", "NKE", "MCD", "SBUX",
  // Energy/Industrial
  "XOM", "CVX", "CAT", "GE", "BA", "RTX",
];

interface EarningsData {
  ticker: string;
  companyName: string | null;
  reportDate: Date;
  estimatedEPS: number | null;
}

async function fetchEarningsForTicker(ticker: string): Promise<EarningsData | null> {
  try {
    const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ticker)}?modules=calendarEvents,earningsTrend,price`;
    const res = await fetch(url, {
      headers: { "User-Agent": "MarketPulse/1.0" },
    });
    if (!res.ok) return null;

    const data = await res.json() as any;
    const result = data?.quoteSummary?.result?.[0];
    if (!result) return null;

    const companyName = result.price?.longName ?? result.price?.shortName ?? null;
    const earningsDates: number[] = result.calendarEvents?.earnings?.earningsDate ?? [];
    if (earningsDates.length === 0) return null;

    // Use the first (nearest) earnings date
    const reportDate = new Date(earningsDates[0] * 1000);

    // Get EPS estimate from earningsTrend (current quarter)
    const trend = result.earningsTrend?.trend?.[0];
    const estimatedEPS = trend?.earningsEstimate?.avg?.raw ?? null;

    return { ticker, companyName, reportDate, estimatedEPS };
  } catch {
    return null;
  }
}

export async function fetchEarningsCalendar(): Promise<void> {
  const now = new Date();
  const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const minus7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  let fetched = 0;
  let inserted = 0;

  for (const ticker of TRACKED_TICKERS) {
    const data = await fetchEarningsForTicker(ticker);
    fetched++;

    if (!data) {
      console.warn(`[earnings] No data for ${ticker}`);
      continue;
    }

    // Only store if within our window (next 14 days or past 7 days)
    if (data.reportDate < minus7Days || data.reportDate > in14Days) {
      continue;
    }

    // Upsert: check if this ticker/date already exists
    const existing = await db
      .select({ id: earningsEvents.id })
      .from(earningsEvents)
      .where(
        and(
          eq(earningsEvents.ticker, ticker),
          gte(earningsEvents.reportDate, new Date(data.reportDate.getTime() - 24 * 60 * 60 * 1000)),
          lte(earningsEvents.reportDate, new Date(data.reportDate.getTime() + 24 * 60 * 60 * 1000)),
        )
      )
      .limit(1);

    if (existing.length === 0) {
      await db.insert(earningsEvents).values({
        ticker: data.ticker,
        companyName: data.companyName,
        reportDate: data.reportDate,
        estimatedEPS: data.estimatedEPS !== null ? String(data.estimatedEPS) : null,
      });
      inserted++;
      console.log(`[earnings] ${ticker}: report on ${data.reportDate.toISOString().split("T")[0]}, est EPS: ${data.estimatedEPS ?? "N/A"}`);
    }
  }

  console.log(`[earnings] Done. Fetched ${fetched} tickers, inserted ${inserted} new events`);
}
