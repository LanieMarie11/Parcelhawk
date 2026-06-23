CREATE TABLE "buyer_utility_searches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"listing_id" integer NOT NULL,
	"report" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "buyer_utility_searches" ADD CONSTRAINT "buyer_utility_searches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyer_utility_searches" ADD CONSTRAINT "buyer_utility_searches_listing_id_merged_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."merged_listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "buyer_utility_searches_user_listing_idx" ON "buyer_utility_searches" USING btree ("user_id","listing_id");