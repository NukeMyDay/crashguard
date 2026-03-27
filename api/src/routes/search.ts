import { Hono } from "hono";
import { db } from "@marketpulse/db/client";
import {
  indicators,
  indicatorValues,
  signals,
  strategies,
  newsItems,
  alerts,
  watchlistItems,
  sectorPerformance,
} from "@marketpulse/db/schema";
import { desc, eq, ilike, or } from "drizzle-orm";

export const searchRouter = new Hono();

interface SearchResult {
  type: "ticker" | "indicator" | "signal" | "news" | "alert";
  id: string;
  title: string;
  subtitle: string;
  relevanceScore: number;
  url: string;
  metadata?: Record<string, unknown>;
}

function computeRelevance(value: string, query: string): number {
  const v = value.toLowerCase();
  const q = query.toLowerCase();
  if (v === q) return 1.0;
  if (v.startsWith(q)) return 0.9;
  if (v.includes(q)) return 0.7;
  return 0.4;
}

// GET /v1/search?q={query}&limit=20
searchRouter.get("/", async (c) => {
  const q = c.req.query("q")?.trim() ?? "";
  const limit = Math.min(Number(c.req.query("limit") || "20"), 100);

  if (!q) {
    return c.json({ results: [], query: q, total: 0 });
  }

  const pattern = `%${q}%`;
  const results: SearchResult[] = [];

  // --- Tickers: watchlist ---
  const watchlistRows = await db
    .select()
    .from(watchlistItems)
    .where(ilike(watchlistItems.ticker, pattern))
    .limit(limit);

  for (const row of watchlistRows) {
    results.push({
      type: "ticker",
      id: row.id,
      title: row.ticker,
      subtitle: row.notes ?? "Watchlist",
      relevanceScore: computeRelevance(row.ticker, q),
      url: `/watchlist/${row.ticker}`,
    });
  }

  // --- Tickers: sector ETFs (latest row per ticker) ---
  const sectorRows = await db
    .select()
    .from(sectorPerformance)
    .where(
      or(
        ilike(sectorPerformance.ticker, pattern),
        ilike(sectorPerformance.sectorName, pattern)
      )
    )
    .orderBy(desc(sectorPerformance.fetchedAt))
    .limit(limit * 3); // fetch extra to allow dedup

  const seenSectors = new Set<string>();
  for (const row of sectorRows) {
    if (seenSectors.has(row.ticker)) continue;
    seenSectors.add(row.ticker);
    const changePct =
      row.changeDay != null
        ? `${Number(row.changeDay) >= 0 ? "+" : ""}${(Number(row.changeDay) * 100).toFixed(2)}%`
        : "N/A";
    results.push({
      type: "ticker",
      id: row.id,
      title: row.ticker,
      subtitle: `${row.sectorName} — ${row.price ? `$${row.price}` : "N/A"} (${changePct})`,
      relevanceScore: Math.max(
        computeRelevance(row.ticker, q),
        computeRelevance(row.sectorName, q)
      ),
      url: `/sectors/${row.ticker}`,
      metadata: { price: row.price, changeDay: row.changeDay },
    });
  }

  // --- Indicators ---
  const indicatorRows = await db
    .select()
    .from(indicators)
    .where(
      or(ilike(indicators.slug, pattern), ilike(indicators.name, pattern))
    )
    .limit(limit);

  for (const ind of indicatorRows) {
    const latest = await db
      .select()
      .from(indicatorValues)
      .where(eq(indicatorValues.indicatorId, ind.id))
      .orderBy(desc(indicatorValues.recordedAt))
      .limit(1);

    results.push({
      type: "indicator",
      id: ind.id,
      title: ind.name,
      subtitle: `${ind.slug} — Normalized: ${latest[0]?.normalizedValue ?? "N/A"}`,
      relevanceScore: Math.max(
        computeRelevance(ind.slug, q),
        computeRelevance(ind.name, q)
      ),
      url: `/indicators/${ind.slug}`,
      metadata: {
        slug: ind.slug,
        normalizedValue: latest[0]?.normalizedValue ?? null,
      },
    });
  }

  // --- Signals ---
  const signalRows = await db
    .select({ signal: signals, strategy: strategies })
    .from(signals)
    .innerJoin(strategies, eq(signals.strategyId, strategies.id))
    .where(
      or(ilike(signals.symbol, pattern), ilike(strategies.name, pattern))
    )
    .orderBy(desc(signals.generatedAt))
    .limit(limit);

  for (const row of signalRows) {
    results.push({
      type: "signal",
      id: row.signal.id,
      title: `${row.signal.symbol} — ${row.signal.direction.toUpperCase()}`,
      subtitle: `${row.strategy.name} — Confidence: ${row.signal.confidenceScore ?? "N/A"}`,
      relevanceScore: Math.max(
        computeRelevance(row.signal.symbol, q),
        computeRelevance(row.strategy.name, q)
      ),
      url: `/signals/${row.signal.id}`,
      metadata: {
        direction: row.signal.direction,
        confidenceScore: row.signal.confidenceScore,
        status: row.signal.status,
      },
    });
  }

  // --- News ---
  const newsRows = await db
    .select()
    .from(newsItems)
    .where(ilike(newsItems.headline, pattern))
    .orderBy(desc(newsItems.publishedAt))
    .limit(limit);

  for (const row of newsRows) {
    results.push({
      type: "news",
      id: row.id,
      title: row.headline,
      subtitle: `${row.source} — ${row.publishedAt?.toISOString() ?? ""}`,
      relevanceScore: computeRelevance(row.headline, q),
      url: `/news/${row.id}`,
      metadata: { source: row.source, publishedAt: row.publishedAt },
    });
  }

  // --- Alerts ---
  const alertRows = await db
    .select()
    .from(alerts)
    .where(
      or(ilike(alerts.market, pattern), ilike(alerts.severity, pattern))
    )
    .orderBy(desc(alerts.triggeredAt))
    .limit(limit);

  for (const row of alertRows) {
    results.push({
      type: "alert",
      id: row.id,
      title: `${row.severity.toUpperCase()} Alert — ${row.market.toUpperCase()}`,
      subtitle: row.message,
      relevanceScore: Math.max(
        computeRelevance(row.market, q),
        computeRelevance(row.severity, q)
      ),
      url: `/alerts/${row.id}`,
      metadata: {
        market: row.market,
        severity: row.severity,
        crashScore: row.crashScore,
      },
    });
  }

  results.sort((a, b) => b.relevanceScore - a.relevanceScore);

  return c.json({
    results: results.slice(0, limit),
    query: q,
    total: results.length,
  });
});
