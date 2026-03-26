import { db } from "@marketpulse/db/client";
import { optionsFlow } from "@marketpulse/db/schema";

const TRACKED_TICKERS = [
  "SPY", "QQQ", "IWM", "AAPL", "TSLA", "NVDA", "AMZN", "MSFT", "META", "GOOGL",
];

interface OptionContract {
  strike: number;
  expiry: string;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  contractType: "call" | "put";
}

async function fetchOptionsChain(ticker: string): Promise<OptionContract[]> {
  try {
    const url = `https://query2.finance.yahoo.com/v7/finance/options/${encodeURIComponent(ticker)}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "MarketPulse/1.0" },
    });
    if (!res.ok) return [];

    const data = await res.json() as any;
    const result = data?.optionChain?.result?.[0];
    if (!result) return [];

    const options = result.options?.[0];
    if (!options) return [];

    const expiryDate = new Date(options.expirationDate * 1000)
      .toISOString()
      .split("T")[0];

    const contracts: OptionContract[] = [];

    for (const call of options.calls ?? []) {
      if (call.volume > 0 || call.openInterest > 0) {
        contracts.push({
          strike: call.strike ?? 0,
          expiry: expiryDate,
          volume: call.volume ?? 0,
          openInterest: call.openInterest ?? 0,
          impliedVolatility: call.impliedVolatility ?? 0,
          contractType: "call",
        });
      }
    }

    for (const put of options.puts ?? []) {
      if (put.volume > 0 || put.openInterest > 0) {
        contracts.push({
          strike: put.strike ?? 0,
          expiry: expiryDate,
          volume: put.volume ?? 0,
          openInterest: put.openInterest ?? 0,
          impliedVolatility: put.impliedVolatility ?? 0,
          contractType: "put",
        });
      }
    }

    return contracts;
  } catch (err) {
    console.warn(`[options-flow] Failed to fetch ${ticker}:`, err);
    return [];
  }
}

function classifySentiment(contract: OptionContract): string {
  const { contractType, volume, openInterest, impliedVolatility, isUnusual } = {
    ...contract,
    isUnusual: contract.volume > 1000 && contract.openInterest > 0 && contract.volume > 2 * contract.openInterest,
  };

  if (contractType === "call") {
    if (isUnusual) return "bullish"; // unusual call sweep
    if (impliedVolatility < 0.3 && volume > 500) return "bullish"; // accumulation
  } else {
    if (isUnusual) return "bearish"; // unusual put sweep
    if (impliedVolatility > 0.5 && volume > 500) return "bearish"; // hedge/fear
  }
  return "neutral";
}

export async function fetchOptionsFlow(): Promise<void> {
  const fetchedAt = new Date();
  let totalInserted = 0;

  for (const ticker of TRACKED_TICKERS) {
    const contracts = await fetchOptionsChain(ticker);
    if (contracts.length === 0) {
      console.warn(`[options-flow] No data for ${ticker}`);
      continue;
    }

    const rows = contracts.map((c) => {
      const isUnusual =
        c.volume > 1000 &&
        c.openInterest > 0 &&
        c.volume > 2 * c.openInterest;
      return {
        ticker,
        contractType: c.contractType,
        strike: String(c.strike),
        expiry: c.expiry,
        volume: c.volume,
        openInterest: c.openInterest,
        impliedVolatility: String(Math.round(c.impliedVolatility * 10000) / 10000),
        isUnusual,
        sentiment: classifySentiment(c),
        fetchedAt,
      };
    });

    await db.insert(optionsFlow).values(rows);
    totalInserted += rows.length;
    console.log(`[options-flow] ${ticker}: ${rows.length} contracts (${rows.filter((r) => r.isUnusual).length} unusual)`);
  }

  console.log(`[options-flow] Done. Inserted ${totalInserted} contracts across ${TRACKED_TICKERS.length} tickers`);
}
