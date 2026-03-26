import { Hono } from "hono";
import { db } from "@marketpulse/db/client";
import { watchlistItems } from "@marketpulse/db/schema";
import { eq } from "drizzle-orm";

export const watchlistRouter = new Hono();

async function fetchYahooQuote(
  ticker: string
): Promise<{ price: number | null; change: number | null; changePercent: number | null }> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: { "User-Agent": "MarketPulse/1.0" },
    });
    if (!res.ok) return { price: null, change: null, changePercent: null };
    const data = (await res.json()) as any;
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) return { price: null, change: null, changePercent: null };
    const price = meta.regularMarketPrice ?? null;
    const prevClose = meta.previousClose ?? meta.chartPreviousClose ?? null;
    const change = price !== null && prevClose !== null ? price - prevClose : null;
    const changePercent =
      change !== null && prevClose ? (change / prevClose) * 100 : null;
    return { price, change, changePercent };
  } catch {
    return { price: null, change: null, changePercent: null };
  }
}

// GET /v1/watchlist
watchlistRouter.get("/", async (c) => {
  const items = await db.select().from(watchlistItems).orderBy(watchlistItems.addedAt);

  const withQuotes = await Promise.all(
    items.map(async (item) => {
      const quote = await fetchYahooQuote(item.ticker);
      return { ...item, ...quote };
    })
  );

  return c.json(withQuotes);
});

// POST /v1/watchlist
watchlistRouter.post("/", async (c) => {
  const body = await c.req.json<{
    ticker: string;
    alertThreshold?: number;
    notes?: string;
  }>();

  if (!body.ticker) {
    return c.json({ error: "ticker is required" }, 400);
  }

  const ticker = body.ticker.toUpperCase().trim();

  const [item] = await db
    .insert(watchlistItems)
    .values({
      ticker,
      alertThreshold: body.alertThreshold?.toString(),
      notes: body.notes ?? null,
    })
    .returning();

  return c.json(item, 201);
});

// DELETE /v1/watchlist/:ticker
watchlistRouter.delete("/:ticker", async (c) => {
  const ticker = c.req.param("ticker").toUpperCase();

  const deleted = await db
    .delete(watchlistItems)
    .where(eq(watchlistItems.ticker, ticker))
    .returning();

  if (deleted.length === 0) {
    return c.json({ error: "Ticker not found in watchlist" }, 404);
  }

  return c.json({ deleted: deleted.length });
});

// GET /v1/watchlist/:ticker/quote
watchlistRouter.get("/:ticker/quote", async (c) => {
  const ticker = c.req.param("ticker").toUpperCase();

  const item = await db
    .select()
    .from(watchlistItems)
    .where(eq(watchlistItems.ticker, ticker))
    .limit(1);

  if (!item[0]) {
    return c.json({ error: "Ticker not found in watchlist" }, 404);
  }

  const quote = await fetchYahooQuote(ticker);

  return c.json({ ticker, ...quote, updatedAt: new Date().toISOString() });
});
