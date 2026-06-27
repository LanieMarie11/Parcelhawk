ALTER TABLE "investors" ADD COLUMN "email_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "investors" ADD COLUMN "email_verification_code_hash" text;--> statement-breakpoint
ALTER TABLE "investors" ADD COLUMN "email_verification_expires_at" timestamp;--> statement-breakpoint
UPDATE "investors" SET "email_verified" = true;