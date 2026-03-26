/**
 * Cross-Asset Momentum Ranker
 *
 * Ranks 30 assets by multi-timeframe momentum (3m, 6m, 12m) to identify
 * rotation opportunities. Results are cached in memory for 24 hours.
 *
 * GET /v1/momentum?top=10
 */
import { Hono } from "hono";

export const momentumRouter = new Hono();

// ─── Asset universe ───────────────────────────────────────────────────────────

const ASSETS = [
  "SPY", "QQQ", "IWM", "GLD", "TLT",
  "DXY", "XLK", "XLF", "XLE", "XLV",
  "XLI", "XLC", "XLY", "XLP", "AAPL",
  "MSFT", "NVDA", "AMZN", "TSLA", "META",
  "GOOGL", "BRK-B", "JPM", "XOM", "CVX",
  "BABA", "EEM", "VNQ", "BTC-USD", "ETH-USD",
];

// ─── Momentum signal thresholds ───────────────────────────────────────────────

function momentumSignal(composite: number): string {
  if (composite > 0.3) return "strong_buy";
  if (composite > 0.1) return "buy";
  if (composite > -0.1) return "neutral";
  if (composite > -0.3) return "reduce";
  return "avoid";
}

// ─── Yahoo Finance historical fetch ───────────────────────────────────────────

async function fetchYearlyCloses(ticker: string): Promise<number[]> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1y`;
    const res = await fetch(url, {
      headers: { "User-Agent": "MarketPulse/1.0" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as any;
    const closes: (number | null)[] =
      data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
    return closes.filter((c): c is number => c != null);
  } catch {
    return [];
  }
}

function computeMomentum(closes: number[]): {
  mom3m: number | null;
  mom6m: number | null;
  mom12m: number | null;
  composite: number | null;
} {
  const n = closes.length;
  const current = closes[n - 1];
  if (!current || n < 2) return { mom3m: null, mom6m: null, mom12m: null, composite: null };

  // Approximate trading-day lookbacks
  const i63  = Math.max(0, n - 1 - 63);
  const i126 = Math.max(0, n - 1 - 126);
  const i252 = Math.max(0, n - 1 - 252);

  const price63  = closes[i63];
  const price126 = closes[i126];
  const price252 = closes[i252];

  const mom3m  = price63  ? (current - price63)  / price63  : null;
  const mom6m  = price126 ? (current - price126) / price126 : null;
  const mom12m = price252 ? (current - price252) / price252 : null;

  const validMoms = [
    mom3m  != null ? mom3m  * 0.4 : null,
    mom6m  != null ? mom6m  * 0.3 : null,
    mom12m != null ? mom12m * 0.3 : null,
  ].filter((v): v is number => v != null);

  const composite = validMoms.length > 0
    ? validMoms.reduce((a, b) => a + b, 0)
    : null;

  const round4 = (v: number | null) => v != null ? Math.round(v * 10000) / 10000 : null;
  return { mom3m: round4(mom3m), mom6m: round4(mom6m), mom12m: round4(mom12m), composite: round4(composite) };
}

// ─── In-memory cache (24h TTL) ────────────────────────────────────────────────

interface CachedRankings {
  data: MomentumEntry[];
  computedAt: number;
}

interface MomentumEntry {
  ticker: string;
  mom3m: number | null;
  mom6m: number | null;
  mom12m: number | null;
  composite: number | null;
  rank: number;
  signal: string;
}

let cache: CachedRankings | null = null;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export async function computeMomentumRankings(): Promise<MomentumEntry[]> {
  const results: Omit<MomentumEntry, "rank">[] = [];

  for (const ticker of ASSETS) {
    const closes = await fetchYearlyCloses(ticker);
    const { mom3m, mom6m, mom12m, composite } = computeMomentum(closes);
    results.push({
      ticker,
      mom3m,
      mom6m,
      mom12m,
      composite,
      signal: composite != null ? momentumSignal(composite) : "neutral",
    });
    // small delay to avoid rate-limiting
    await new Promise((r) => setTimeout(r, 50));
  }

  // Rank by composite descending (nulls last)
  results.sort((a, b) => {
    if (a.composite == null && b.composite == null) return 0;
    if (a.composite == null) return 1;
    if (b.composite == null) return -1;
    return b.composite - a.composite;
  });

  return results.map((r, i) => ({ ...r, rank: i + 1 }));
}

// ─── GET /v1/momentum ────────────────────────────────────────────────────────

momentumRouter.get("/", async (c) => {
  const top = Number(c.req.query("top") ?? "0"); // 0 = return all
  const forceRefresh = c.req.query("refresh") === "true";

  // Return cached data if fresh
  if (!forceRefresh && cache && Date.now() - cache.computedAt < CACHE_TTL_MS) {
    const result = top > 0 ? cache.data.slice(0, top) : cache.data;
    return c.json(result);
  }

  // Compute fresh rankings
  const rankings = await computeMomentumRankings();
  cache = { data: rankings, computedAt: Date.now() };

  const result = top > 0 ? rankings.slice(0, top) : rankings;
  return c.json(result);
});
