DO $$ BEGIN
 CREATE TYPE "public"."market_regime" AS ENUM('bull', 'bear', 'sideways', 'crisis', 'recovery');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."portfolio_type" AS ENUM('model', 'live', 'paper');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."signal_direction" AS ENUM('long', 'short');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."signal_status" AS ENUM('active', 'expired', 'triggered', 'cancelled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."strategy_type" AS ENUM('momentum', 'mean_reversion', 'sector_rotation', 'risk_off', 'short', 'penny');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."trade_status" AS ENUM('open', 'closed', 'cancelled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "daily_briefings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"market" varchar(50) NOT NULL,
	"date" date NOT NULL,
	"headline" varchar(500) NOT NULL,
	"summary" text NOT NULL,
	"regime_label" varchar(100),
	"crash_score" numeric(5, 2),
	"key_indicators" jsonb DEFAULT '[]' NOT NULL,
	"signals" jsonb DEFAULT '[]' NOT NULL,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "market_regimes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"market" varchar(50) NOT NULL,
	"regime" "market_regime" NOT NULL,
	"confidence" numeric(5, 2) NOT NULL,
	"detected_at" timestamp DEFAULT now() NOT NULL,
	"expired_at" timestamp,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portfolios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"type" "portfolio_type" DEFAULT 'paper' NOT NULL,
	"initial_capital" numeric(20, 2) NOT NULL,
	"current_value" numeric(20, 2),
	"currency" varchar(10) DEFAULT 'USD' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"config" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scanner_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scanner_type" varchar(100) NOT NULL,
	"symbol" varchar(20) NOT NULL,
	"name" varchar(255),
	"exchange" varchar(50),
	"price" numeric(20, 6),
	"change" numeric(20, 6),
	"change_percent" numeric(8, 4),
	"volume" numeric(20, 2),
	"market_cap" numeric(25, 2),
	"score" numeric(5, 2),
	"flags" jsonb DEFAULT '{}',
	"scanned_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "signals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"strategy_id" uuid NOT NULL,
	"symbol" varchar(20) NOT NULL,
	"direction" "signal_direction" NOT NULL,
	"strength" numeric(5, 2) NOT NULL,
	"price" numeric(20, 6),
	"rationale" text,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"status" "signal_status" DEFAULT 'active' NOT NULL,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "strategies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" "strategy_type" NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"config" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "strategies_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "trades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"portfolio_id" uuid NOT NULL,
	"signal_id" uuid,
	"symbol" varchar(20) NOT NULL,
	"direction" "signal_direction" NOT NULL,
	"entry_price" numeric(20, 6) NOT NULL,
	"exit_price" numeric(20, 6),
	"quantity" numeric(20, 6) NOT NULL,
	"entry_at" timestamp NOT NULL,
	"exit_at" timestamp,
	"status" "trade_status" DEFAULT 'open' NOT NULL,
	"pnl" numeric(20, 6),
	"pnl_percent" numeric(10, 4),
	"notes" text,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "signals" ADD CONSTRAINT "signals_strategy_id_strategies_id_fk" FOREIGN KEY ("strategy_id") REFERENCES "public"."strategies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trades" ADD CONSTRAINT "trades_portfolio_id_portfolios_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."portfolios"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trades" ADD CONSTRAINT "trades_signal_id_signals_id_fk" FOREIGN KEY ("signal_id") REFERENCES "public"."signals"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "daily_briefings_market_date_idx" ON "daily_briefings" ("market","date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "daily_briefings_date_idx" ON "daily_briefings" ("date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "market_regimes_market_idx" ON "market_regimes" ("market");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "market_regimes_detected_at_idx" ON "market_regimes" ("detected_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "market_regimes_regime_idx" ON "market_regimes" ("regime");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scanner_results_scanner_type_idx" ON "scanner_results" ("scanner_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scanner_results_symbol_idx" ON "scanner_results" ("symbol");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scanner_results_scanned_at_idx" ON "scanner_results" ("scanned_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "signals_strategy_id_idx" ON "signals" ("strategy_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "signals_symbol_idx" ON "signals" ("symbol");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "signals_generated_at_idx" ON "signals" ("generated_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "signals_status_idx" ON "signals" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "trades_portfolio_id_idx" ON "trades" ("portfolio_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "trades_signal_id_idx" ON "trades" ("signal_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "trades_symbol_idx" ON "trades" ("symbol");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "trades_entry_at_idx" ON "trades" ("entry_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "trades_status_idx" ON "trades" ("status");