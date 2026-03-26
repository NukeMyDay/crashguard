import { pgTable, uuid, varchar, text, decimal, boolean, timestamp, pgEnum, index } from "drizzle-orm/pg-core";

export const indicatorCategoryEnum = pgEnum("indicator_category", ["market", "sentiment", "macro", "volatility", "credit"]);
export const indicatorSourceEnum = pgEnum("indicator_source", ["fred", "yahoo", "alpha_vantage", "cnn", "ecb"]);
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
