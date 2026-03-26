import { Hono } from "hono";
import { db } from "@marketpulse/db/client";
import { marketScores } from "@marketpulse/db/schema";
import { desc, eq, gte, and, lte } from "drizzle-orm";
import type { Market } from "@marketpulse/shared";

export const scoreRouter = new Hono();

// Scenario date ranges
const SCENARIOS: Record<string, { label: string; start: Date; end: Date }> = {
  "2008": {
    label: "2008 Financial Crisis",
    start: new Date("2008-09-01"),
    end: new Date("2009-03-31"),
  },
  "2020": {
    label: "2020 COVID Crash",
    start: new Date("2020-02-01"),
    end: new Date("2020-04-30"),
  },
  "2022": {
    label: "2022 Bear Market",
    start: new Date("2022-01-01"),
    end: new Date("2022-10-31"),
  },
  rally: {
    label: "2023–2024 AI Rally",
    start: new Date("2022-10-01"),
    end: new Date("2024-12-31"),
  },
};

// GET /v1/score/history
scoreRouter.get("/history", async (c) => {
  const market = (c.req.query("market") || "global") as Market;
  const days = Number(c.req.query("days") || "30");
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const history = await db
    .select()
    .from(marketScores)
    .where(and(eq(marketScores.market, market), gte(marketScores.calculatedAt, since)))
    .orderBy(desc(marketScores.calculatedAt))
    .limit(days * 24);

  return c.json(history);
});

// GET /v1/score/backtest?scenario=2008|2020|2022|rally
scoreRouter.get("/backtest", async (c) => {
  const scenarioKey = c.req.query("scenario") || "2008";
  const market = (c.req.query("market") || "global") as Market;
  const scenario = SCENARIOS[scenarioKey];

  if (!scenario) {
    return c.json({ error: "Invalid scenario. Use: 2008, 2020, 2022, rally" }, 400);
  }

  const scores = await db
    .select()
    .from(marketScores)
    .where(
      and(
        eq(marketScores.market, market),
        gte(marketScores.calculatedAt, scenario.start),
        lte(marketScores.calculatedAt, scenario.end)
      )
    )
    .orderBy(marketScores.calculatedAt)
    .limit(2000);

  const numScores = scores.map((s) => Number(s.crashScore));
  const peakScore = numScores.length > 0 ? Math.max(...numScores) : 0;
  const avgScore =
    numScores.length > 0 ? numScores.reduce((a, b) => a + b, 0) / numScores.length : 0;
  const daysAbove75 = numScores.filter((s) => s >= 75).length;

  return c.json({
    scenario: scenarioKey,
    label: scenario.label,
    period: {
      start: scenario.start.toISOString(),
      end: scenario.end.toISOString(),
    },
    market,
    scores,
    peakScore: Math.round(peakScore * 100) / 100,
    avgScore: Math.round(avgScore * 100) / 100,
    daysAbove75,
    isSimulated: scores.length === 0,
  });
});
