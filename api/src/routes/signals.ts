import { Hono } from "hono";
import { db } from "@marketpulse/db/client";
import { signals, strategies } from "@marketpulse/db/schema";
import { desc, eq, and, gte } from "drizzle-orm";

export const signalsRouter = new Hono();

// GET /v1/signals — active signals, optionally filtered by strategy
signalsRouter.get("/", async (c) => {
  const strategySlug = c.req.query("strategy");
  const status = c.req.query("status") ?? "active";
  const limit = Number(c.req.query("limit") ?? "50");

  if (strategySlug) {
    const strategy = await db
      .select({ id: strategies.id })
      .from(strategies)
      .where(eq(strategies.slug, strategySlug))
      .limit(1);

    if (!strategy[0]) return c.json({ error: "Strategy not found" }, 404);

    const rows = await db
      .select({
        signal: signals,
        strategy: { id: strategies.id, slug: strategies.slug, name: strategies.name, type: strategies.type },
      })
      .from(signals)
      .innerJoin(strategies, eq(signals.strategyId, strategies.id))
      .where(and(eq(signals.strategyId, strategy[0].id), eq(signals.status, status as any)))
      .orderBy(desc(signals.generatedAt))
      .limit(limit);

    return c.json(rows);
  }

  const rows = await db
    .select({
      signal: signals,
      strategy: { id: strategies.id, slug: strategies.slug, name: strategies.name, type: strategies.type },
    })
    .from(signals)
    .innerJoin(strategies, eq(signals.strategyId, strategies.id))
    .where(eq(signals.status, status as any))
    .orderBy(desc(signals.generatedAt))
    .limit(limit);

  return c.json(rows);
});

// GET /v1/signals/:id — signal detail
signalsRouter.get("/:id", async (c) => {
  const id = c.req.param("id");

  const rows = await db
    .select({
      signal: signals,
      strategy: { id: strategies.id, slug: strategies.slug, name: strategies.name, type: strategies.type },
    })
    .from(signals)
    .innerJoin(strategies, eq(signals.strategyId, strategies.id))
    .where(eq(signals.id, id))
    .limit(1);

  if (!rows[0]) return c.json({ error: "Signal not found" }, 404);
  return c.json(rows[0]);
});
