/**
 * Short Candidates Scanner
 *
 * Targets overbought stocks/ETFs likely to reverse.
 * Criteria: RSI > 75 AND price > 20% above 50-day MA.
 * Score = (RSI - 75) * 4 capped at 100.
 */
import { db } from "@marketpulse/db/client";
import { scannerResults } from "@marketpulse/db/schema";

// Same blue chip list + ETFs that can be shorted
const SHORT_CANDIDATES = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "META", "NVDA", "JPM", "BAC", "JNJ", "PFE",
  "V", "MA", "UNH", "HD", "CVX", "XOM", "ABBV", "MRK", "LLY", "TMO",
  "COST", "WMT", "DIS", "NFLX", "TSLA", "BRK-B", "PM", "KO", "PEP", "MCD",
  "QQQ", "SPY", "XLK", "XLY", "ARKK", "HYG",
];

interface QuoteData {
  symbol: string;
  price: number;
  rsi14: number;
  ma50: number;
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

async function fetchShortCandidateQuote(ticker: string): Promise<QuoteData | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=90d`;
    const res = await fetch(url, { headers: { "User-Agent": "MarketPulse/1.0" } });
    if (!res.ok) return null;
    const data = await res.json() as any;
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const closes: number[] = (result.indicators?.quote?.[0]?.close ?? []).filter((c: any) => c != null);
    const volumes: number[] = (result.indicators?.quote?.[0]?.volume ?? []).filter((v: any) => v != null);

    if (closes.length < 51) return null; // need at least 50 days for MA50

    const price = closes[closes.length - 1];
    const prevClose = closes[closes.length - 2];
    const changePercent = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;

    const rsi14 = computeRSI(closes, 14);
    if (rsi14 === null) return null;

    const ma50 = closes.slice(-50).reduce((a, b) => a + b, 0) / 50;
    const volume = volumes[volumes.length - 1] ?? 0;
    const marketCap = result.meta?.marketCap ?? null;

    return { symbol: ticker, price, rsi14, ma50, changePercent, volume, marketCap };
  } catch {
    return null;
  }
}

export async function runShortScanner(): Promise<void> {
  console.log("[short-scanner] Starting scan...");
  const results: typeof scannerResults.$inferInsert[] = [];

  for (const ticker of SHORT_CANDIDATES) {
    const quote = await fetchShortCandidateQuote(ticker);
    if (!quote) {
      await new Promise((r) => setTimeout(r, 50));
      continue;
    }

    const aboveMA50Pct = quote.ma50 > 0 ? ((quote.price - quote.ma50) / quote.ma50) * 100 : 0;
    const isOverbought = quote.rsi14 > 75;
    const isExtended = aboveMA50Pct > 20;

    if (!isOverbought) {
      await new Promise((r) => setTimeout(r, 50));
      continue;
    }

    const score = Math.min(100, Math.round((quote.rsi14 - 75) * 4));
    const reasons: string[] = [
      `RSI(14) = ${quote.rsi14.toFixed(1)} (overbought > 75)`,
      `${aboveMA50Pct.toFixed(1)}% above 50-day MA ($${quote.ma50.toFixed(2)})`,
    ];
    if (isExtended) reasons.push("Price extended >20% above MA50 — reversal risk");

    results.push({
      scannerType: "short",
      symbol: quote.symbol,
      price: String(quote.price),
      changePercent: String(Math.round(quote.changePercent * 10000) / 10000),
      volume: String(quote.volume),
      marketCap: quote.marketCap !== null ? String(quote.marketCap) : null,
      score: String(score),
      flags: {
        rsi14: quote.rsi14,
        ma50: quote.ma50,
        aboveMA50Pct,
        isExtended,
        reasons,
      },
      scannedAt: new Date(),
    });

    console.log(`[short-scanner] ${ticker}: RSI=${quote.rsi14.toFixed(1)}, +${aboveMA50Pct.toFixed(1)}% vs MA50, score=${score}`);
    await new Promise((r) => setTimeout(r, 50));
  }

  if (results.length > 0) {
    await db.insert(scannerResults).values(results);
    console.log(`[short-scanner] Inserted ${results.length} results`);
  } else {
    console.log("[short-scanner] No short candidates found");
  }
}
