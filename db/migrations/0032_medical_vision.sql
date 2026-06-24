CREATE TYPE "public"."property_report_payment_status" AS ENUM('pending', 'succeeded', 'refunded', 'failed');--> statement-breakpoint
CREATE TABLE "buyer_property_report_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"listing_id" integer NOT NULL,
	"stripe_payment_intent_id" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"status" "property_report_payment_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "buyer_property_report_payments" ADD CONSTRAINT "buyer_property_report_payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyer_property_report_payments" ADD CONSTRAINT "buyer_property_report_payments_listing_id_merged_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."merged_listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "buyer_property_report_payments_pi_idx" ON "buyer_property_report_payments" USING btree ("stripe_payment_intent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "buyer_property_report_payments_user_listing_idx" ON "buyer_property_report_payments" USING btree ("user_id","listing_id");
