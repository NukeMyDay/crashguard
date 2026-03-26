import { pgTable, uuid, text, varchar, decimal, boolean, timestamp, jsonb, pgEnum, index } from "drizzle-orm/pg-core";

export const marketEnum = pgEnum("market", ["global", "us", "eu", "asia"]);
export const severityEnum = pgEnum("severity", ["warning", "critical", "extreme"]);

export const marketScores = pgTable("market_scores", {
  id: uuid("id").primaryKey().defaultRandom(),
  market: marketEnum("market").notNull(),
  crashScore: decimal("crash_score", { precision: 5, scale: 2 }).notNull(),
  componentScores: jsonb("component_scores").notNull().default("{}"),
  calculatedAt: timestamp("calculated_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  marketIdx: index("market_scores_market_idx").on(table.market),
  calculatedAtIdx: index("market_scores_calculated_at_idx").on(table.calculatedAt),
}));

export const alerts = pgTable("alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  market: marketEnum("market").notNull(),
  severity: severityEnum("severity").notNull(),
  message: text("message").notNull(),
  crashScore: decimal("crash_score", { precision: 5, scale: 2 }).notNull(),
  triggeredAt: timestamp("triggered_at").notNull().defaultNow(),
  acknowledgedAt: timestamp("acknowledged_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  marketIdx: index("alerts_market_idx").on(table.market),
  triggeredAtIdx: index("alerts_triggered_at_idx").on(table.triggeredAt),
}));

// ─── macro_events ──────────────────────────────────────────────────────────────

export const macroEvents = pgTable("macro_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventType: varchar("event_type", { length: 50 }).notNull(), // "fomc" | "cpi" | "jobs" | "gdp"
  eventDate: timestamp("event_date").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  impact: varchar("impact", { length: 20 }).default("high"), // "high" | "medium" | "low"
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  eventDateIdx: index("macro_events_event_date_idx").on(table.eventDate),
  eventTypeIdx: index("macro_events_event_type_idx").on(table.eventType),
}));

// ─── alert_webhooks ────────────────────────────────────────────────────────────

export const alertWebhooks = pgTable("alert_webhooks", {
  id: uuid("id").primaryKey().defaultRandom(),
  url: text("url").notNull(),
  minSeverity: severityEnum("min_severity").notNull().default("warning"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
