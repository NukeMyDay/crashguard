ALTER TABLE "signal_outcomes" ADD COLUMN IF NOT EXISTS "target_accuracy" numeric(5, 4);--> statement-breakpoint
ALTER TABLE "signal_outcomes" ADD COLUMN IF NOT EXISTS "target_hit" boolean;--> statement-breakpoint
ALTER TABLE "signal_outcomes" ADD COLUMN IF NOT EXISTS "target_hit_at" timestamp;--> statement-breakpoint
ALTER TABLE "signal_outcomes" ADD COLUMN IF NOT EXISTS "mfe" numeric(8, 4);--> statement-breakpoint
ALTER TABLE "signal_outcomes" ADD COLUMN IF NOT EXISTS "mae" numeric(8, 4);
