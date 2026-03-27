import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { db } from "@marketpulse/db/client";
import { alerts, indicators, indicatorValues, marketScores } from "@marketpulse/db/schema";
import { desc, gte, eq, sql } from "drizzle-orm";
import { dashboardRouter } from "./routes/dashboard.js";
import { indicatorsRouter } from "./routes/indicators.js";
import { alertsRouter } from "./routes/alerts.js";
import { scoreRouter } from "./routes/score.js";
import { regimeRouter } from "./routes/regime.js";
import { signalsRouter } from "./routes/signals.js";
import { strategiesRouter } from "./routes/strategies.js";
import { scannerRouter } from "./routes/scanner.js";
import { portfolioRouter } from "./routes/portfolio.js";
import { briefingsRouter } from "./routes/briefings.js";
import { newsRouter } from "./routes/news.js";
import { chatRouter } from "./routes/chat.js";
import { settingsRouter } from "./routes/settings.js";
import { socialRouter } from "./routes/social.js";
import { optionsRouter } from "./routes/options.js";
import { earningsRouter } from "./routes/earnings.js";
import { macroEventsRouter } from "./routes/macro-events.js";
import { correlationRouter } from "./routes/correlation.js";
import { watchlistRouter } from "./routes/watchlist.js";
import { publicRouter, apiKeysRouter } from "./routes/public.js";
import { sectorsRouter } from "./routes/sectors.js";
import { darkPoolRouter } from "./routes/dark-pool.js";
import { momentumRouter } from "./routes/momentum.js";
import { searchRouter } from "./routes/search.js";
import { systemRouter } from "./routes/system.js";

export const app = new Hono();

app.use("*", logger());
app.use("*", cors());

app.get("/health", async (c) => {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [lastScore] = await db
    .select({ calculatedAt: marketScores.calculatedAt })
    .from(marketScores)
    .orderBy(desc(marketScores.calculatedAt))
    .limit(1);

  const [{ count: alertCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(alerts)
    .where(gte(alerts.triggeredAt, since24h));

  // Count stale indicators
  const allIndicators = await db
    .select()
    .from(indicators)
    .where(eq(indicators.isActive, true));

  let staleCount = 0;
  for (const ind of allIndicators) {
    const latest = await db
      .select({ recordedAt: indicatorValues.recordedAt })
      .from(indicatorValues)
      .where(eq(indicatorValues.indicatorId, ind.id))
      .orderBy(desc(indicatorValues.recordedAt))
      .limit(1);

    if (latest[0]) {
      const ageMin = (Date.now() - new Date(latest[0].recordedAt).getTime()) / 60000;
      const stale =
        ind.frequency === "hourly" ? ageMin > 90 :
        ind.frequency === "daily" ? ageMin > 26 * 60 :
        ind.frequency === "weekly" ? ageMin > 8 * 24 * 60 : false;
      if (stale) staleCount++;
    } else {
      staleCount++;
    }
  }

  return c.json({
    status: "ok",
    version: "1.0.0",
    uptime: Math.round(process.uptime()),
    database: "connected",
    staleIndicators: staleCount,
    lastScoreCalculatedAt: lastScore?.calculatedAt ?? null,
    totalAlerts24h: alertCount,
  });
});

app.route("/v1/dashboard", dashboardRouter);
app.route("/v1/indicators", indicatorsRouter);
app.route("/v1/alerts", alertsRouter);
app.route("/v1/score", scoreRouter);
app.route("/v1/regime", regimeRouter);
app.route("/v1/signals", signalsRouter);
app.route("/v1/strategies", strategiesRouter);
app.route("/v1/scanner", scannerRouter);
app.route("/v1/portfolio", portfolioRouter);
app.route("/v1/briefings", briefingsRouter);
app.route("/v1/briefing", briefingsRouter);
app.route("/v1/news", newsRouter);
app.route("/v1/chat", chatRouter);
app.route("/v1/settings", settingsRouter);
app.route("/v1/social", socialRouter);
app.route("/v1/options", optionsRouter);
app.route("/v1/earnings", earningsRouter);
app.route("/v1/macro-events", macroEventsRouter);
app.route("/v1/indicators/correlation", correlationRouter);
app.route("/v1/watchlist", watchlistRouter);
app.route("/v1/public", publicRouter);
app.route("/v1/api-keys", apiKeysRouter);
app.route("/v1/sectors", sectorsRouter);
app.route("/v1/dark-pool", darkPoolRouter);
app.route("/v1/momentum", momentumRouter);
app.route("/v1/search", searchRouter);
app.route("/v1/system", systemRouter);

export default app;
