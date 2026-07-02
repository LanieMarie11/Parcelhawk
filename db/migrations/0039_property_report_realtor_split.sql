ALTER TABLE "investors" ADD COLUMN IF NOT EXISTS "stripe_connect_account_id" text;
--> statement-breakpoint
ALTER TABLE "buyer_property_report_payments" ADD COLUMN IF NOT EXISTS "platform_amount_cents" integer DEFAULT 300 NOT NULL;
--> statement-breakpoint
ALTER TABLE "buyer_property_report_payments" ADD COLUMN IF NOT EXISTS "realtor_amount_cents" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "buyer_property_report_payments" ADD COLUMN IF NOT EXISTS "realtor_investor_id" uuid;
