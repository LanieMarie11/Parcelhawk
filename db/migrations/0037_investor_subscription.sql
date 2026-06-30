ALTER TABLE "investors" ADD COLUMN IF NOT EXISTS "subscription_status" text DEFAULT 'inactive' NOT NULL;--> statement-breakpoint
ALTER TABLE "investors" ADD COLUMN IF NOT EXISTS "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "investors" ADD COLUMN IF NOT EXISTS "stripe_subscription_id" text;
