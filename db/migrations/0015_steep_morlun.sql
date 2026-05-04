CREATE TYPE "public"."viewing_request_status" AS ENUM('pending', 'scheduled', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "viewing_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"buyer_id" uuid NOT NULL,
	"realtor_id" uuid NOT NULL,
	"listing_id" integer NOT NULL,
	"status" "viewing_request_status" DEFAULT 'pending' NOT NULL,
	"scheduled_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"buyer_note" varchar(2000),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "viewing_requests" ADD CONSTRAINT "viewing_requests_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "viewing_requests" ADD CONSTRAINT "viewing_requests_realtor_id_investors_id_fk" FOREIGN KEY ("realtor_id") REFERENCES "public"."investors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "viewing_requests" ADD CONSTRAINT "viewing_requests_listing_id_land_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."land_listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "viewing_requests_buyer_created_idx" ON "viewing_requests" USING btree ("buyer_id","created_at");--> statement-breakpoint
CREATE INDEX "viewing_requests_realtor_created_idx" ON "viewing_requests" USING btree ("realtor_id","created_at");--> statement-breakpoint
CREATE INDEX "viewing_requests_listing_idx" ON "viewing_requests" USING btree ("listing_id");