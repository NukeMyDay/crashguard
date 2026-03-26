CREATE TABLE IF NOT EXISTS "app_settings" (
	"key" varchar(255) PRIMARY KEY NOT NULL,
	"encrypted_value" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
