import { pgTable, uuid, text, decimal, timestamp, jsonb, pgEnum, index } from "drizzle-orm/pg-core";

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
