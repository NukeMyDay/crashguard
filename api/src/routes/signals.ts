import { Hono } from "hono";
import { db } from "@marketpulse/db/client";
import { signals, strategies, signalOutcomes } from "@marketpulse/db/schema";
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

// GET /v1/signals/accuracy — aggregate price-target accuracy stats
signalsRouter.get("/accuracy", async (c) => {
  // Fetch all outcomes joined with strategy info via signal
  const rows = await db
    .select({
      outcome: signalOutcomes.outcome,
      targetHit: signalOutcomes.targetHit,
      targetAccuracy: signalOutcomes.targetAccuracy,
      mfe: signalOutcomes.maxFavorableExcursion,
      mae: signalOutcomes.maxAdverseExcursion,
      strategyType: strategies.type,
      strategySlug: strategies.slug,
    })
    .from(signalOutcomes)
    .innerJoin(signals, eq(signalOutcomes.signalId, signals.id))
    .innerJoin(strategies, eq(signals.strategyId, strategies.id));

  if (rows.length === 0) {
    return c.json({ overall: { targetHitRate: null, avgTargetAccuracy: null, avgMFE: null, avgMAE: null, n: 0 }, byStrategy: [] });
  }

  function aggregateRows(subset: typeof rows) {
    const n = subset.length;
    const withTarget = subset.filter((r) => r.targetHit !== null);
    const targetHits = withTarget.filter((r) => r.targetHit === true).length;
    const targetHitRate = withTarget.length > 0 ? Math.round((targetHits / withTarget.length) * 10000) / 10000 : null;

    const accuracyVals = subset.map((r) => Number(r.targetAccuracy)).filter((v) => !isNaN(v) && v != null);
    const avgTargetAccuracy = accuracyVals.length > 0
      ? Math.round((accuracyVals.reduce((a, b) => a + b, 0) / accuracyVals.length) * 10000) / 10000
      : null;

    const mfeVals = subset.map((r) => Number(r.mfe)).filter((v) => !isNaN(v));
    const avgMFE = mfeVals.length > 0
      ? Math.round((mfeVals.reduce((a, b) => a + b, 0) / mfeVals.length) * 100) / 100
      : null;

    const maeVals = subset.map((r) => Number(r.mae)).filter((v) => !isNaN(v));
    const avgMAE = maeVals.length > 0
      ? Math.round((maeVals.reduce((a, b) => a + b, 0) / maeVals.length) * 100) / 100
      : null;

    return { targetHitRate, avgTargetAccuracy, avgMFE, avgMAE, n };
  }

  const overall = aggregateRows(rows);

  // Group by strategy slug
  const strategyMap = new Map<string, typeof rows>();
  for (const row of rows) {
    const key = row.strategySlug;
    if (!strategyMap.has(key)) strategyMap.set(key, []);
    strategyMap.get(key)!.push(row);
  }

  const byStrategy = Array.from(strategyMap.entries()).map(([strategy, subset]) => ({
    strategy,
    type: subset[0].strategyType,
    ...aggregateRows(subset),
  }));

  return c.json({ overall, byStrategy });
});

// GET /v1/signals/:id/outcome — signal outcome (win/loss/neutral)
signalsRouter.get("/:id/outcome", async (c) => {
  const id = c.req.param("id");

  const rows = await db
    .select()
    .from(signalOutcomes)
    .where(eq(signalOutcomes.signalId, id))
    .limit(1);

  if (!rows[0]) return c.json({ error: "Outcome not yet recorded" }, 404);
  return c.json(rows[0]);
});
