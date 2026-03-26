import {
  pgTable,
  uuid,
  varchar,
  text,
  decimal,
  boolean,
  timestamp,
  integer,
  jsonb,
  pgEnum,
  index,
  date,
  bigint,
} from "drizzle-orm/pg-core";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const marketRegimeEnum = pgEnum("market_regime", [
  "bull",
  "bear",
  "sideways",
  "crisis",
  "recovery",
]);

export const strategyTypeEnum = pgEnum("strategy_type", [
  "momentum",
  "mean_reversion",
  "sector_rotation",
  "risk_off",
  "short",
  "penny",
]);

export const signalDirectionEnum = pgEnum("signal_direction", ["long", "short"]);

export const signalStatusEnum = pgEnum("signal_status", [
  "active",
  "expired",
  "triggered",
  "cancelled",
]);

export const tradeStatusEnum = pgEnum("trade_status", [
  "open",
  "closed",
  "cancelled",
]);

export const portfolioTypeEnum = pgEnum("portfolio_type", [
  "model",
  "live",
  "paper",
]);

// ─── market_regimes ───────────────────────────────────────────────────────────

export const marketRegimes = pgTable(
  "market_regimes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    market: varchar("market", { length: 50 }).notNull(),
    regime: marketRegimeEnum("regime").notNull(),
    confidence: decimal("confidence", { precision: 5, scale: 2 }).notNull(),
    detectedAt: timestamp("detected_at").notNull().defaultNow(),
    expiredAt: timestamp("expired_at"),
    metadata: jsonb("metadata").default("{}"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    marketIdx: index("market_regimes_market_idx").on(table.market),
    detectedAtIdx: index("market_regimes_detected_at_idx").on(table.detectedAt),
    regimeIdx: index("market_regimes_regime_idx").on(table.regime),
  })
);

// ─── strategies ───────────────────────────────────────────────────────────────

export const strategies = pgTable("strategies", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  type: strategyTypeEnum("type").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  config: jsonb("config").notNull().default("{}"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── signals ──────────────────────────────────────────────────────────────────

export const signals = pgTable(
  "signals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    strategyId: uuid("strategy_id")
      .notNull()
      .references(() => strategies.id, { onDelete: "cascade" }),
    symbol: varchar("symbol", { length: 20 }).notNull(),
    direction: signalDirectionEnum("direction").notNull(),
    strength: decimal("strength", { precision: 5, scale: 2 }).notNull(),
    price: decimal("price", { precision: 20, scale: 6 }),
    stopLoss: decimal("stop_loss", { precision: 20, scale: 6 }),
    targetPrice: decimal("target_price", { precision: 20, scale: 6 }),
    confidenceScore: decimal("confidence_score", { precision: 5, scale: 2 }),
    positionSizePct: decimal("position_size_pct", { precision: 5, scale: 2 }),
    riskFactors: jsonb("risk_factors").default("[]"),
    rationale: text("rationale"),
    generatedAt: timestamp("generated_at").notNull().defaultNow(),
    expiresAt: timestamp("expires_at"),
    status: signalStatusEnum("status").notNull().default("active"),
    metadata: jsonb("metadata").default("{}"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    strategyIdIdx: index("signals_strategy_id_idx").on(table.strategyId),
    symbolIdx: index("signals_symbol_idx").on(table.symbol),
    generatedAtIdx: index("signals_generated_at_idx").on(table.generatedAt),
    statusIdx: index("signals_status_idx").on(table.status),
  })
);

// ─── scanner_results ──────────────────────────────────────────────────────────

export const scannerResults = pgTable(
  "scanner_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scannerType: varchar("scanner_type", { length: 100 }).notNull(),
    symbol: varchar("symbol", { length: 20 }).notNull(),
    name: varchar("name", { length: 255 }),
    exchange: varchar("exchange", { length: 50 }),
    price: decimal("price", { precision: 20, scale: 6 }),
    change: decimal("change", { precision: 20, scale: 6 }),
    changePercent: decimal("change_percent", { precision: 8, scale: 4 }),
    volume: decimal("volume", { precision: 20, scale: 2 }),
    marketCap: decimal("market_cap", { precision: 25, scale: 2 }),
    score: decimal("score", { precision: 5, scale: 2 }),
    flags: jsonb("flags").default("{}"),
    scannedAt: timestamp("scanned_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    scannerTypeIdx: index("scanner_results_scanner_type_idx").on(
      table.scannerType
    ),
    symbolIdx: index("scanner_results_symbol_idx").on(table.symbol),
    scannedAtIdx: index("scanner_results_scanned_at_idx").on(table.scannedAt),
  })
);

// ─── daily_briefings ──────────────────────────────────────────────────────────

export const dailyBriefings = pgTable(
  "daily_briefings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    market: varchar("market", { length: 50 }).notNull(),
    date: date("date").notNull(),
    headline: varchar("headline", { length: 500 }).notNull(),
    summary: text("summary").notNull(),
    regimeLabel: varchar("regime_label", { length: 100 }),
    crashScore: decimal("crash_score", { precision: 5, scale: 2 }),
    keyIndicators: jsonb("key_indicators").notNull().default("[]"),
    signals: jsonb("signals").notNull().default("[]"),
    generatedAt: timestamp("generated_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    marketDateIdx: index("daily_briefings_market_date_idx").on(
      table.market,
      table.date
    ),
    dateIdx: index("daily_briefings_date_idx").on(table.date),
  })
);

// ─── portfolios ───────────────────────────────────────────────────────────────

export const portfolios = pgTable("portfolios", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  type: portfolioTypeEnum("type").notNull().default("paper"),
  initialCapital: decimal("initial_capital", {
    precision: 20,
    scale: 2,
  }).notNull(),
  currentValue: decimal("current_value", { precision: 20, scale: 2 }),
  currency: varchar("currency", { length: 10 }).notNull().default("USD"),
  isActive: boolean("is_active").notNull().default(true),
  config: jsonb("config").notNull().default("{}"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── news_items ───────────────────────────────────────────────────────────────

export const newsItems = pgTable(
  "news_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    headline: text("headline").notNull(),
    url: text("url").notNull(),
    source: varchar("source", { length: 100 }).notNull(),
    summary: text("summary"),
    sentiment: varchar("sentiment", { length: 20 }),
    tickers: jsonb("tickers").notNull().default("[]"),
    publishedAt: timestamp("published_at"),
    fetchedAt: timestamp("fetched_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    publishedAtIdx: index("news_items_published_at_idx").on(table.publishedAt),
    sourceIdx: index("news_items_source_idx").on(table.source),
    fetchedAtIdx: index("news_items_fetched_at_idx").on(table.fetchedAt),
  })
);

// ─── reddit_mentions ──────────────────────────────────────────────────────────

export const redditMentions = pgTable(
  "reddit_mentions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticker: varchar("ticker", { length: 20 }).notNull(),
    postTitle: text("post_title").notNull(),
    upvotes: integer("upvotes").default(0),
    upvoteRatio: decimal("upvote_ratio", { precision: 5, scale: 4 }),
    sentiment: varchar("sentiment", { length: 20 }).default("neutral"),
    fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
  },
  (table) => ({
    tickerIdx: index("reddit_mentions_ticker_idx").on(table.ticker),
    fetchedAtIdx: index("reddit_mentions_fetched_at_idx").on(table.fetchedAt),
  })
);

// ─── chat_messages ────────────────────────────────────────────────────────────

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: varchar("conversation_id", { length: 255 }).notNull(),
    role: varchar("role", { length: 20 }).notNull(), // "user" | "assistant"
    content: text("content").notNull(),
    tokensUsed: integer("tokens_used"),
    model: varchar("model", { length: 100 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    conversationIdIdx: index("chat_messages_conversation_id_idx").on(table.conversationId),
    createdAtIdx: index("chat_messages_created_at_idx").on(table.createdAt),
  })
);

// ─── signal_outcomes ──────────────────────────────────────────────────────────

export const signalOutcomeEnum = pgEnum("signal_outcome", [
  "win",
  "loss",
  "neutral",
]);

export const signalOutcomes = pgTable(
  "signal_outcomes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    signalId: uuid("signal_id")
      .notNull()
      .references(() => signals.id, { onDelete: "cascade" }),
    symbol: varchar("symbol", { length: 20 }).notNull(),
    direction: signalDirectionEnum("direction").notNull(),
    entryPrice: decimal("entry_price", { precision: 20, scale: 6 }).notNull(),
    exitPrice: decimal("exit_price", { precision: 20, scale: 6 }).notNull(),
    pnlPercent: decimal("pnl_percent", { precision: 10, scale: 4 }).notNull(),
    outcome: signalOutcomeEnum("outcome").notNull(),
    targetAccuracy: decimal("target_accuracy", { precision: 5, scale: 4 }),
    targetHit: boolean("target_hit"),
    targetHitAt: timestamp("target_hit_at"),
    maxFavorableExcursion: decimal("mfe", { precision: 8, scale: 4 }),
    maxAdverseExcursion: decimal("mae", { precision: 8, scale: 4 }),
    evaluatedAt: timestamp("evaluated_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    signalIdIdx: index("signal_outcomes_signal_id_idx").on(table.signalId),
    symbolIdx: index("signal_outcomes_symbol_idx").on(table.symbol),
    evaluatedAtIdx: index("signal_outcomes_evaluated_at_idx").on(
      table.evaluatedAt
    ),
    outcomeIdx: index("signal_outcomes_outcome_idx").on(table.outcome),
  })
);

// ─── options_flow ─────────────────────────────────────────────────────────────

export const optionsFlow = pgTable(
  "options_flow",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticker: varchar("ticker", { length: 20 }).notNull(),
    contractType: varchar("contract_type", { length: 10 }).notNull(), // "call" | "put"
    strike: decimal("strike", { precision: 10, scale: 2 }),
    expiry: varchar("expiry", { length: 20 }),
    volume: integer("volume").default(0),
    openInterest: integer("open_interest").default(0),
    impliedVolatility: decimal("implied_volatility", { precision: 8, scale: 4 }),
    isUnusual: boolean("is_unusual").default(false),
    sentiment: varchar("sentiment", { length: 20 }).default("neutral"), // bullish/bearish/neutral
    fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
  },
  (table) => ({
    tickerIdx: index("options_flow_ticker_idx").on(table.ticker),
    fetchedAtIdx: index("options_flow_fetched_at_idx").on(table.fetchedAt),
    isUnusualIdx: index("options_flow_is_unusual_idx").on(table.isUnusual),
  })
);

// ─── earnings_events ──────────────────────────────────────────────────────────

export const earningsEvents = pgTable(
  "earnings_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticker: varchar("ticker", { length: 20 }).notNull(),
    companyName: varchar("company_name", { length: 100 }),
    reportDate: timestamp("report_date").notNull(),
    estimatedEPS: decimal("estimated_eps", { precision: 10, scale: 4 }),
    actualEPS: decimal("actual_eps", { precision: 10, scale: 4 }),
    epsSurprise: decimal("eps_surprise", { precision: 10, scale: 4 }),
    epsSurprisePct: decimal("eps_surprise_pct", { precision: 8, scale: 4 }),
    beat: boolean("beat"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    tickerIdx: index("earnings_events_ticker_idx").on(table.ticker),
    reportDateIdx: index("earnings_events_report_date_idx").on(table.reportDate),
  })
);

// ─── watchlist_items ──────────────────────────────────────────────────────────

export const watchlistItems = pgTable(
  "watchlist_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticker: varchar("ticker", { length: 20 }).notNull(),
    alertThreshold: decimal("alert_threshold", { precision: 5, scale: 2 }),
    notes: text("notes"),
    addedAt: timestamp("added_at").defaultNow().notNull(),
  },
  (table) => ({
    tickerIdx: index("watchlist_items_ticker_idx").on(table.ticker),
  })
);

// ─── api_keys ─────────────────────────────────────────────────────────────────

export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  keyHash: varchar("key_hash", { length: 64 }).notNull().unique(),
  label: varchar("label", { length: 100 }),
  requestCount: integer("request_count").default(0),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── strategy_calibrations ────────────────────────────────────────────────────

export const strategyCalibrations = pgTable(
  "strategy_calibrations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    strategyName: varchar("strategy_name", { length: 100 }).notNull(),
    actualWinRate: decimal("actual_win_rate", { precision: 5, scale: 4 }),
    statedConfidenceAvg: decimal("stated_confidence_avg", { precision: 5, scale: 4 }),
    calibrationFactor: decimal("calibration_factor", { precision: 5, scale: 4 }),
    samplesN: integer("samples_n"),
    calibratedAt: timestamp("calibrated_at").defaultNow().notNull(),
  },
  (table) => ({
    strategyNameIdx: index("strategy_calibrations_strategy_name_idx").on(table.strategyName),
    calibratedAtIdx: index("strategy_calibrations_calibrated_at_idx").on(table.calibratedAt),
  })
);

// ─── trades ───────────────────────────────────────────────────────────────────

export const trades = pgTable(
  "trades",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    portfolioId: uuid("portfolio_id")
      .notNull()
      .references(() => portfolios.id, { onDelete: "cascade" }),
    signalId: uuid("signal_id").references(() => signals.id, {
      onDelete: "set null",
    }),
    symbol: varchar("symbol", { length: 20 }).notNull(),
    direction: signalDirectionEnum("direction").notNull(),
    entryPrice: decimal("entry_price", { precision: 20, scale: 6 }).notNull(),
    exitPrice: decimal("exit_price", { precision: 20, scale: 6 }),
    quantity: decimal("quantity", { precision: 20, scale: 6 }).notNull(),
    entryAt: timestamp("entry_at").notNull(),
    exitAt: timestamp("exit_at"),
    status: tradeStatusEnum("status").notNull().default("open"),
    pnl: decimal("pnl", { precision: 20, scale: 6 }),
    pnlPercent: decimal("pnl_percent", { precision: 10, scale: 4 }),
    notes: text("notes"),
    metadata: jsonb("metadata").default("{}"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    portfolioIdIdx: index("trades_portfolio_id_idx").on(table.portfolioId),
    signalIdIdx: index("trades_signal_id_idx").on(table.signalId),
    symbolIdx: index("trades_symbol_idx").on(table.symbol),
    entryAtIdx: index("trades_entry_at_idx").on(table.entryAt),
    statusIdx: index("trades_status_idx").on(table.status),
  })
);

// ─── dark_pool_prints ─────────────────────────────────────────────────────────

export const darkPoolPrints = pgTable(
  "dark_pool_prints",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticker: varchar("ticker", { length: 20 }).notNull(),
    tradeDate: varchar("trade_date", { length: 10 }).notNull(),
    shortVolume: bigint("short_volume", { mode: "number" }),
    totalVolume: bigint("total_volume", { mode: "number" }),
    shortRatio: decimal("short_ratio", { precision: 5, scale: 4 }),
    isHeavyShort: boolean("is_heavy_short").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    tickerIdx: index("dark_pool_prints_ticker_idx").on(table.ticker),
    tradeDateIdx: index("dark_pool_prints_trade_date_idx").on(table.tradeDate),
    shortRatioIdx: index("dark_pool_prints_short_ratio_idx").on(table.shortRatio),
  })
);
