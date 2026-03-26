ALTER TYPE "indicator_source" ADD VALUE 'rss';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "strategy_calibrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"strategy_name" varchar(100) NOT NULL,
	"actual_win_rate" numeric(5, 4),
	"stated_confidence_avg" numeric(5, 4),
	"calibration_factor" numeric(5, 4),
	"samples_n" integer,
	"calibrated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "strategy_calibrations_strategy_name_idx" ON "strategy_calibrations" ("strategy_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "strategy_calibrations_calibrated_at_idx" ON "strategy_calibrations" ("calibrated_at");