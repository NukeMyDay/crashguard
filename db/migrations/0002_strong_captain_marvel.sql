DO $$ BEGIN
 CREATE TYPE "public"."signal_outcome" AS ENUM('win', 'loss', 'neutral');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "news_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"headline" text NOT NULL,
	"url" text NOT NULL,
	"source" varchar(100) NOT NULL,
	"summary" text,
	"sentiment" varchar(20),
	"tickers" jsonb DEFAULT '[]' NOT NULL,
	"published_at" timestamp,
	"fetched_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "signal_outcomes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"signal_id" uuid NOT NULL,
	"symbol" varchar(20) NOT NULL,
	"direction" "signal_direction" NOT NULL,
	"entry_price" numeric(20, 6) NOT NULL,
	"exit_price" numeric(20, 6) NOT NULL,
	"pnl_percent" numeric(10, 4) NOT NULL,
	"outcome" "signal_outcome" NOT NULL,
	"evaluated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "signals" ADD COLUMN "stop_loss" numeric(20, 6);--> statement-breakpoint
ALTER TABLE "signals" ADD COLUMN "target_price" numeric(20, 6);--> statement-breakpoint
ALTER TABLE "signals" ADD COLUMN "confidence_score" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "signals" ADD COLUMN "position_size_pct" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "signals" ADD COLUMN "risk_factors" jsonb DEFAULT '[]';--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "signal_outcomes" ADD CONSTRAINT "signal_outcomes_signal_id_signals_id_fk" FOREIGN KEY ("signal_id") REFERENCES "public"."signals"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "news_items_published_at_idx" ON "news_items" ("published_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "news_items_source_idx" ON "news_items" ("source");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "news_items_fetched_at_idx" ON "news_items" ("fetched_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "signal_outcomes_signal_id_idx" ON "signal_outcomes" ("signal_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "signal_outcomes_symbol_idx" ON "signal_outcomes" ("symbol");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "signal_outcomes_evaluated_at_idx" ON "signal_outcomes" ("evaluated_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "signal_outcomes_outcome_idx" ON "signal_outcomes" ("outcome");