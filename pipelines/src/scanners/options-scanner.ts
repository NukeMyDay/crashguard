/**
 * Options Opportunities Scanner
 *
 * Scans for unusual implied volatility across major ETFs and top stocks.
 * - High IV (>50%): earnings play → PUT opportunity
 * - Low IV (<20%) + RSI < 35: cheap CALL opportunity
 */
import { db } from "@marketpulse/db/client";
import { scannerResults } from "@marketpulse/db/schema";

const OPTIONS_UNIVERSE = [
  // Major ETFs
  "SPY", "QQQ", "IWM", "GLD", "TLT", "HYG", "XLK", "XLF", "XLE", "XLV",
  // Top stocks
  "AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA", "JPM", "BAC", "V",
  "NFLX", "AMD", "INTC", "CRM", "SNAP", "COIN", "ARKK", "MSTR", "GME", "AMC",
];

interface QuoteData {
  symbol: string;
  price: number;
  rsi14: number | null;
  impliedVolatility: number | null;
  changePercent: number;
  volume: number;
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

/**
 * Fetch implied volatility from Yahoo Finance options chain.
 * Uses the nearest-expiry ATM options to compute a simple IV estimate.
 */
async function fetchOptionsIV(ticker: string): Promise<number | null> {
  try {
    const url = `https://query2.finance.yahoo.com/v7/finance/options/${encodeURIComponent(ticker)}`;
    const res = await fetch(url, { headers: { "User-Agent": "MarketPulse/1.0" } });
    if (!res.ok) return null;
    const data = await res.json() as any;
    const chain = data?.optionChain?.result?.[0];
    if (!chain) return null;

    const price = chain.quote?.regularMarketPrice;
    if (!price) return null;

    const options = chain.options?.[0];
    if (!options) return null;

    // Gather IVs from ATM calls and puts (within 5% of current price)
    const allIVs: number[] = [];

    const calls: any[] = options.calls ?? [];
    const puts: any[] = options.puts ?? [];

    for (const opt of [...calls, ...puts]) {
      if (
        typeof opt.impliedVolatility === "number" &&
        opt.impliedVolatility > 0 &&
        Math.abs(opt.strike - price) / price < 0.05
      ) {
        allIVs.push(opt.impliedVolatility * 100); // convert to percentage
      }
    }

    if (allIVs.length === 0) return null;
    return allIVs.reduce((a, b) => a + b, 0) / allIVs.length;
  } catch {
    return null;
  }
}

async function fetchQuoteWithRSI(ticker: string): Promise<{ price: number; rsi14: number | null; changePercent: number; volume: number } | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=60d`;
    const res = await fetch(url, { headers: { "User-Agent": "MarketPulse/1.0" } });
    if (!res.ok) return null;
    const data = await res.json() as any;
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const closes: number[] = (result.indicators?.quote?.[0]?.close ?? []).filter((c: any) => c != null);
    const volumes: number[] = (result.indicators?.quote?.[0]?.volume ?? []).filter((v: any) => v != null);

    if (closes.length < 2) return null;

    const price = closes[closes.length - 1];
    const prevClose = closes[closes.length - 2];
    const changePercent = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;
    const rsi14 = computeRSI(closes, 14);
    const volume = volumes[volumes.length - 1] ?? 0;

    return { price, rsi14, changePercent, volume };
  } catch {
    return null;
  }
}

export async function runOptionsScanner(): Promise<void> {
  console.log("[options-scanner] Starting scan...");
  const results: typeof scannerResults.$inferInsert[] = [];

  for (const ticker of OPTIONS_UNIVERSE) {
    const [quote, iv] = await Promise.all([
      fetchQuoteWithRSI(ticker),
      fetchOptionsIV(ticker),
    ]);

    if (!quote) {
      await new Promise((r) => setTimeout(r, 80));
      continue;
    }

    const impliedVolatility = iv;
    const isHighIV = impliedVolatility !== null && impliedVolatility > 50;
    const isLowIVOversold =
      impliedVolatility !== null &&
      impliedVolatility < 20 &&
      quote.rsi14 !== null &&
      quote.rsi14 < 35;

    if (!isHighIV && !isLowIVOversold) {
      await new Promise((r) => setTimeout(r, 80));
      continue;
    }

    let score = 50;
    let opportunity = "";
    const reasons: string[] = [];

    if (isHighIV && impliedVolatility !== null) {
      score = Math.min(100, Math.round((impliedVolatility - 50) * 2 + 50));
      opportunity = "put";
      reasons.push(`High IV ${impliedVolatility.toFixed(1)}% — elevated earnings/event premium`);
      reasons.push("PUT opportunity: sell premium or buy protective put");
    } else if (isLowIVOversold && impliedVolatility !== null && quote.rsi14 !== null) {
      score = Math.min(100, Math.round(((20 - impliedVolatility) * 2.5) + ((35 - quote.rsi14) * 1.5)));
      opportunity = "call";
      reasons.push(`Low IV ${impliedVolatility.toFixed(1)}% + RSI ${quote.rsi14.toFixed(1)} oversold`);
      reasons.push("CALL opportunity: cheap premium on oversold bounce candidate");
    }

    results.push({
      scannerType: "options",
      symbol: ticker,
      price: String(quote.price),
      changePercent: String(Math.round(quote.changePercent * 10000) / 10000),
      volume: String(quote.volume),
      score: String(score),
      flags: {
        impliedVolatility,
        rsi14: quote.rsi14,
        opportunity,
        isHighIV,
        isLowIVOversold,
        reasons,
      },
      scannedAt: new Date(),
    });

    console.log(`[options-scanner] ${ticker}: IV=${impliedVolatility?.toFixed(1) ?? "n/a"}%, RSI=${quote.rsi14?.toFixed(1) ?? "n/a"}, opp=${opportunity}, score=${score}`);
    await new Promise((r) => setTimeout(r, 80));
  }

  if (results.length > 0) {
    await db.insert(scannerResults).values(results);
    console.log(`[options-scanner] Inserted ${results.length} results`);
  } else {
    console.log("[options-scanner] No options opportunities found");
  }
}
