CREATE TABLE IF NOT EXISTS "reddit_mentions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticker" varchar(20) NOT NULL,
	"post_title" text NOT NULL,
	"upvotes" integer DEFAULT 0,
	"upvote_ratio" numeric(5, 4),
	"sentiment" varchar(20) DEFAULT 'neutral',
	"fetched_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reddit_mentions_ticker_idx" ON "reddit_mentions" ("ticker");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reddit_mentions_fetched_at_idx" ON "reddit_mentions" ("fetched_at");