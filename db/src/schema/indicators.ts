import { pgTable, uuid, varchar, text, decimal, boolean, timestamp, pgEnum, index, bigint } from "drizzle-orm/pg-core";

export const indicatorCategoryEnum = pgEnum("indicator_category", ["market", "sentiment", "macro", "volatility", "credit"]);
export const indicatorSourceEnum = pgEnum("indicator_source", ["fred", "yahoo", "alpha_vantage", "cnn", "ecb", "rss"]);
export const indicatorFrequencyEnum = pgEnum("indicator_frequency", ["hourly", "daily", "weekly", "monthly"]);

export const indicators = pgTable("indicators", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  category: indicatorCategoryEnum("category").notNull(),
  description: text("description"),
  source: indicatorSourceEnum("source").notNull(),
  frequency: indicatorFrequencyEnum("frequency").notNull(),
  weight: decimal("weight", { precision: 5, scale: 4 }).notNull().default("0"),
  warningThreshold: decimal("warning_threshold", { precision: 10, scale: 4 }),
  criticalThreshold: decimal("critical_threshold", { precision: 10, scale: 4 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── sector_performance ───────────────────────────────────────────────────────

export const sectorPerformance = pgTable(
  "sector_performance",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticker: varchar("ticker", { length: 10 }).notNull(),
    sectorName: varchar("sector_name", { length: 50 }).notNull(),
    price: decimal("price", { precision: 10, scale: 2 }),
    changeDay: decimal("change_day", { precision: 8, scale: 4 }),
    changeWeek: decimal("change_week", { precision: 8, scale: 4 }),
    relativeVsSpy: decimal("relative_vs_spy", { precision: 8, scale: 4 }),
    volume: bigint("volume", { mode: "number" }),
    avgVolume20d: bigint("avg_volume_20d", { mode: "number" }),
    fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
  },
  (table) => ({
    tickerIdx: index("sector_performance_ticker_idx").on(table.ticker),
    fetchedAtIdx: index("sector_performance_fetched_at_idx").on(table.fetchedAt),
  })
);

export const indicatorValues = pgTable("indicator_values", {
  id: uuid("id").primaryKey().defaultRandom(),
  indicatorId: uuid("indicator_id").notNull().references(() => indicators.id, { onDelete: "cascade" }),
  value: decimal("value", { precision: 20, scale: 6 }).notNull(),
  normalizedValue: decimal("normalized_value", { precision: 5, scale: 2 }).notNull(),
  recordedAt: timestamp("recorded_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  indicatorIdIdx: index("indicator_values_indicator_id_idx").on(table.indicatorId),
  recordedAtIdx: index("indicator_values_recorded_at_idx").on(table.recordedAt),
}));
