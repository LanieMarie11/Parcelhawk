CREATE TYPE "public"."notification_type" AS ENUM('viewing_request', 'link_invitation');--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "notification_type" NOT NULL,
	"user_id" uuid NOT NULL,
	"investor_id" uuid,
	"listing_id" integer,
	"viewing_request_id" uuid,
	"buyer_investor_link_id" uuid,
	"title" text,
	"body" text,
	"read_at" timestamp with time zone,
	"dismissed_at" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_investor_id_investors_id_fk" FOREIGN KEY ("investor_id") REFERENCES "public"."investors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_listing_id_land_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."land_listings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_viewing_request_id_viewing_requests_id_fk" FOREIGN KEY ("viewing_request_id") REFERENCES "public"."viewing_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_buyer_investor_link_id_buyer_investor_links_id_fk" FOREIGN KEY ("buyer_investor_link_id") REFERENCES "public"."buyer_investor_links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notifications_user_created_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_user_unread_idx" ON "notifications" USING btree ("user_id","read_at");--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_viewing_request_recipient_idx" ON "notifications" USING btree ("user_id","viewing_request_id");--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_link_invitation_recipient_idx" ON "notifications" USING btree ("user_id","buyer_investor_link_id");