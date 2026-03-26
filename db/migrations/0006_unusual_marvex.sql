CREATE TABLE IF NOT EXISTS "earnings_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticker" varchar(20) NOT NULL,
	"company_name" varchar(100),
	"report_date" timestamp NOT NULL,
	"estimated_eps" numeric(10, 4),
	"actual_eps" numeric(10, 4),
	"eps_surprise" numeric(10, 4),
	"eps_surprise_pct" numeric(8, 4),
	"beat" boolean,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "options_flow" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticker" varchar(20) NOT NULL,
	"contract_type" varchar(10) NOT NULL,
	"strike" numeric(10, 2),
	"expiry" varchar(20),
	"volume" integer DEFAULT 0,
	"open_interest" integer DEFAULT 0,
	"implied_volatility" numeric(8, 4),
	"is_unusual" boolean DEFAULT false,
	"sentiment" varchar(20) DEFAULT 'neutral',
	"fetched_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "earnings_events_ticker_idx" ON "earnings_events" ("ticker");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "earnings_events_report_date_idx" ON "earnings_events" ("report_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "options_flow_ticker_idx" ON "options_flow" ("ticker");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "options_flow_fetched_at_idx" ON "options_flow" ("fetched_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "options_flow_is_unusual_idx" ON "options_flow" ("is_unusual");