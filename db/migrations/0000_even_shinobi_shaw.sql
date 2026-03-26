DO $$ BEGIN
 CREATE TYPE "public"."indicator_category" AS ENUM('market', 'sentiment', 'macro', 'volatility', 'credit');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."indicator_frequency" AS ENUM('hourly', 'daily', 'weekly', 'monthly');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."indicator_source" AS ENUM('fred', 'yahoo', 'alpha_vantage', 'cnn', 'ecb');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."market" AS ENUM('global', 'us', 'eu', 'asia');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."severity" AS ENUM('warning', 'critical', 'extreme');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "indicator_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"indicator_id" uuid NOT NULL,
	"value" numeric(20, 6) NOT NULL,
	"normalized_value" numeric(5, 2) NOT NULL,
	"recorded_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "indicators" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"category" "indicator_category" NOT NULL,
	"description" text,
	"source" "indicator_source" NOT NULL,
	"frequency" "indicator_frequency" NOT NULL,
	"weight" numeric(5, 4) DEFAULT '0' NOT NULL,
	"warning_threshold" numeric(10, 4),
	"critical_threshold" numeric(10, 4),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "indicators_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"market" "market" NOT NULL,
	"severity" "severity" NOT NULL,
	"message" text NOT NULL,
	"crash_score" numeric(5, 2) NOT NULL,
	"triggered_at" timestamp DEFAULT now() NOT NULL,
	"acknowledged_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "market_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"market" "market" NOT NULL,
	"crash_score" numeric(5, 2) NOT NULL,
	"component_scores" jsonb DEFAULT '{}' NOT NULL,
	"calculated_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "indicator_values" ADD CONSTRAINT "indicator_values_indicator_id_indicators_id_fk" FOREIGN KEY ("indicator_id") REFERENCES "public"."indicators"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "indicator_values_indicator_id_idx" ON "indicator_values" ("indicator_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "indicator_values_recorded_at_idx" ON "indicator_values" ("recorded_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "alerts_market_idx" ON "alerts" ("market");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "alerts_triggered_at_idx" ON "alerts" ("triggered_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "market_scores_market_idx" ON "market_scores" ("market");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "market_scores_calculated_at_idx" ON "market_scores" ("calculated_at");