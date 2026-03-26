import type { Config } from "drizzle-kit";

export default {
  schema: ["./src/schema/indicators.ts", "./src/schema/scores.ts", "./src/schema/trading.ts"],
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgres://marketpulse:marketpulse@localhost:5432/marketpulse",
  },
} satisfies Config;
