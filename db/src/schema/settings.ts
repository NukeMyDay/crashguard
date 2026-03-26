import { pgTable, varchar, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Key/value store for application settings.
 * Sensitive values (e.g. API keys) are stored AES-256-GCM encrypted.
 */
export const appSettings = pgTable("app_settings", {
  key: varchar("key", { length: 255 }).primaryKey(),
  encryptedValue: text("encrypted_value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
