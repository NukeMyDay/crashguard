CREATE TABLE IF NOT EXISTS "sector_performance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticker" varchar(10) NOT NULL,
	"sector_name" varchar(50) NOT NULL,
	"price" numeric(10, 2),
	"change_day" numeric(8, 4),
	"change_week" numeric(8, 4),
	"relative_vs_spy" numeric(8, 4),
	"volume" bigint,
	"avg_volume_20d" bigint,
	"fetched_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dark_pool_prints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticker" varchar(20) NOT NULL,
	"trade_date" varchar(10) NOT NULL,
	"short_volume" bigint,
	"total_volume" bigint,
	"short_ratio" numeric(5, 4),
	"is_heavy_short" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sector_performance_ticker_idx" ON "sector_performance" ("ticker");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sector_performance_fetched_at_idx" ON "sector_performance" ("fetched_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dark_pool_prints_ticker_idx" ON "dark_pool_prints" ("ticker");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dark_pool_prints_trade_date_idx" ON "dark_pool_prints" ("trade_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dark_pool_prints_short_ratio_idx" ON "dark_pool_prints" ("short_ratio");