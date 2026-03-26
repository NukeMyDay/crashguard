/**
 * Oversold Blue Chips Scanner
 *
 * Scans S&P 500 large caps for RSI(14) < 30. Score = (30 - RSI) * 3.33 capped at 100.
 */
import { db } from "@marketpulse/db/client";
import { scannerResults } from "@marketpulse/db/schema";

const BLUE_CHIPS = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "META", "NVDA", "JPM", "BAC", "JNJ", "PFE",
  "V", "MA", "UNH", "HD", "CVX", "XOM", "ABBV", "MRK", "LLY", "TMO",
  "COST", "WMT", "DIS", "NFLX", "TSLA", "BRK-B", "PM", "KO", "PEP", "MCD",
];

interface QuoteData {
  symbol: string;
  price: number;
  rsi14: number;
  changePercent: number;
  volume: number;
  marketCap: number | null;
}

function computeRSI(closes: number[], period: number): number | null {
  if (closes.length < period + 1) return null;

  let avgGain = 0;
  let avgLoss = 0;

  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) avgGain += diff;
    else avgLoss += Math.abs(diff);
  }

  avgGain /= period;
  avgLoss /= period;

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Math.round((100 - 100 / (1 + rs)) * 100) / 100;
}

async function fetchBluechipQuote(ticker: string): Promise<QuoteData | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=60d`;
    const res = await fetch(url, { headers: { "User-Agent": "MarketPulse/1.0" } });
    if (!res.ok) return null;
    const data = await res.json() as any;
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const closes: number[] = (result.indicators?.quote?.[0]?.close ?? []).filter((c: any) => c != null);
    const volumes: number[] = (result.indicators?.quote?.[0]?.volume ?? []).filter((v: any) => v != null);

    if (closes.length < 15) return null;

    const price = closes[closes.length - 1];
    const prevClose = closes[closes.length - 2];
    const changePercent = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;

    const rsi14 = computeRSI(closes, 14);
    if (rsi14 === null) return null;

    const volume = volumes[volumes.length - 1] ?? 0;
    const marketCap = result.meta?.marketCap ?? null;

    return { symbol: ticker, price, rsi14, changePercent, volume, marketCap };
  } catch {
    return null;
  }
}

export async function runOversoldScanner(): Promise<void> {
  console.log("[oversold-scanner] Starting scan...");
  const results: typeof scannerResults.$inferInsert[] = [];

  for (const ticker of BLUE_CHIPS) {
    const quote = await fetchBluechipQuote(ticker);
    if (!quote) {
      await new Promise((r) => setTimeout(r, 50));
      continue;
    }

    if (quote.rsi14 >= 30) {
      await new Promise((r) => setTimeout(r, 50));
      continue;
    }

    const score = Math.min(100, Math.round((30 - quote.rsi14) * 3.33));

    results.push({
      scannerType: "oversold",
      symbol: quote.symbol,
      price: String(quote.price),
      changePercent: String(Math.round(quote.changePercent * 10000) / 10000),
      volume: String(quote.volume),
      marketCap: quote.marketCap !== null ? String(quote.marketCap) : null,
      score: String(score),
      flags: {
        rsi14: quote.rsi14,
        changePercent: quote.changePercent,
        reasons: [
          `RSI(14) = ${quote.rsi14.toFixed(1)} (oversold < 30)`,
          `Price $${quote.price.toFixed(2)}, ${quote.changePercent.toFixed(2)}% today`,
        ],
      },
      scannedAt: new Date(),
    });

    console.log(`[oversold-scanner] ${ticker}: RSI=${quote.rsi14.toFixed(1)}, score=${score}`);
    await new Promise((r) => setTimeout(r, 50));
  }

  if (results.length > 0) {
    await db.insert(scannerResults).values(results);
    console.log(`[oversold-scanner] Inserted ${results.length} results`);
  } else {
    console.log("[oversold-scanner] No oversold blue chips found");
  }
}
