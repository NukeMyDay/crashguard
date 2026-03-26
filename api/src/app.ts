import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
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

export const app = new Hono();

app.use("*", logger());
app.use("*", cors());

app.get("/health", (c) => c.json({ status: "ok" }));

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

export default app;
