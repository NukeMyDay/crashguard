/**
 * Penny Stock Scanner
 *
 * Targets stocks under $5 with significant volume spikes (3x 30-day average)
 * and price breakout above 20-day high. Uses a predefined watchlist of active
 * penny stocks as fallback when Yahoo screener is rate-limited.
 */
import { db } from "@marketpulse/db/client";
import { scannerResults } from "@marketpulse/db/schema";

// Predefined watchlist of 50 known active penny stocks
const PENNY_WATCHLIST = [
  "SNDL", "CLOV", "HYZN", "GOEV", "WKHS", "RIDE", "NKLA", "XELA", "MMAT",
  "BBIG", "ATER", "PROG", "SPRT", "IRNT", "OPAD", "PAYA", "PTRA", "ARVL",
  "LCID", "NXTP", "ILUS", "TRKA", "IMPP", "GFAI", "RNAZ", "SNGX", "AEYE",
  "COHN", "CPOP", "DPRO", "EDTK", "FLMN", "GOVX", "HLTH", "INVO", "JATT",
  "KERN", "LIQT", "MBIO", "NCTY", "ONDS", "PHUN", "QNRX", "RKDA", "SLDB",
  "TPVG", "UONE", "VVPR", "WATT", "XBIO",
];

interface QuoteData {
  symbol: string;
  price: number;
  volume: number;
  avgVolume30d: number;
  high20d: number;
  changePercent: number;
}

async function fetchPennyQuote(ticker: string): Promise<QuoteData | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=60d`;
    const res = await fetch(url, { headers: { "User-Agent": "MarketPulse/1.0" } });
    if (!res.ok) return null;
    const data = await res.json() as any;
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const closes: number[] = (result.indicators?.quote?.[0]?.close ?? []).filter((c: any) => c != null);
    const volumes: number[] = (result.indicators?.quote?.[0]?.volume ?? []).filter((v: any) => v != null);
    const highs: number[] = (result.indicators?.quote?.[0]?.high ?? []).filter((h: any) => h != null);

    if (closes.length < 2 || volumes.length < 2) return null;

    const price = closes[closes.length - 1];
    if (price >= 5) return null; // only penny stocks

    const prevClose = closes[closes.length - 2];
    const changePercent = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;

    const volume = volumes[volumes.length - 1] ?? 0;
    const avgVolume30d =
      volumes.length >= 30
        ? volumes.slice(-30).reduce((a, b) => a + b, 0) / 30
        : volumes.reduce((a, b) => a + b, 0) / volumes.length;

    const high20d =
      highs.length >= 20
        ? Math.max(...highs.slice(-20))
        : highs.length > 0
        ? Math.max(...highs)
        : price;

    return { symbol: ticker, price, volume, avgVolume30d, high20d, changePercent };
  } catch {
    return null;
  }
}

export async function runPennyScanner(): Promise<void> {
  console.log("[penny-scanner] Starting scan...");
  const results: typeof scannerResults.$inferInsert[] = [];

  for (const ticker of PENNY_WATCHLIST) {
    const quote = await fetchPennyQuote(ticker);
    if (!quote) {
      await new Promise((r) => setTimeout(r, 50));
      continue;
    }

    const volumeRatio = quote.avgVolume30d > 0 ? quote.volume / quote.avgVolume30d : 0;
    const hasVolumeSpike = volumeRatio >= 3;
    const hasPriceBreakout = quote.price > quote.high20d;

    if (!hasVolumeSpike) {
      await new Promise((r) => setTimeout(r, 50));
      continue;
    }

    const score = Math.min(100, Math.round(volumeRatio * 10));
    const reasons: string[] = [];
    if (hasVolumeSpike) reasons.push(`Volume ${volumeRatio.toFixed(1)}x avg (${Math.round(quote.volume).toLocaleString()} vs avg ${Math.round(quote.avgVolume30d).toLocaleString()})`);
    if (hasPriceBreakout) reasons.push(`Price $${quote.price.toFixed(3)} broke 20-day high $${quote.high20d.toFixed(3)}`);
    reasons.push(`Change: ${quote.changePercent.toFixed(2)}%`);

    results.push({
      scannerType: "penny",
      symbol: quote.symbol,
      price: String(quote.price),
      change: String(quote.price - (quote.price / (1 + quote.changePercent / 100))),
      changePercent: String(Math.round(quote.changePercent * 10000) / 10000),
      volume: String(quote.volume),
      score: String(score),
      flags: { volumeRatio, hasPriceBreakout, high20d: quote.high20d, reasons },
      scannedAt: new Date(),
    });

    console.log(`[penny-scanner] ${ticker}: $${quote.price.toFixed(3)}, vol ratio ${volumeRatio.toFixed(1)}x, score=${score}`);
    await new Promise((r) => setTimeout(r, 50));
  }

  if (results.length > 0) {
    await db.insert(scannerResults).values(results);
    console.log(`[penny-scanner] Inserted ${results.length} results`);
  } else {
    console.log("[penny-scanner] No qualifying penny stocks found");
  }
}
