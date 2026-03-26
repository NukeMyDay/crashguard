CREATE TABLE IF NOT EXISTS "alert_webhooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"min_severity" "severity" DEFAULT 'warning' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "macro_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"event_date" timestamp NOT NULL,
	"title" varchar(200) NOT NULL,
	"impact" varchar(20) DEFAULT 'high',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "macro_events_event_date_idx" ON "macro_events" ("event_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "macro_events_event_type_idx" ON "macro_events" ("event_type");