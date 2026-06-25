ALTER TABLE "users" ADD COLUMN "email_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verification_code_hash" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verification_expires_at" timestamp;