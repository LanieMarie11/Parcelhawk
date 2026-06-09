CREATE TABLE "land_updated_listings_embeddings" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"listing_id" integer NOT NULL,
	"embedding" vector(768) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "land_updated_listings_embeddings_listing_id_unique" UNIQUE("listing_id")
);
--> statement-breakpoint
CREATE TABLE "land_updated_listings" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"title" text,
	"price" numeric(14, 2),
	"acres" double precision,
	"latitude" double precision,
	"longitude" double precision,
	"address1" text,
	"address2" text,
	"city" text,
	"state_abbreviation" varchar(10),
	"state_name" text,
	"zip" varchar(20),
	"county" text,
	"property_type" jsonb,
	"listed_date" text,
	"description" text,
	"activities" jsonb,
	"property_amenities" jsonb,
	"mlsId" text,
	"for_sale" boolean,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "favorites" DROP CONSTRAINT "favorites_land_listing_id_land_listings_id_fk";
--> statement-breakpoint
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_listing_id_land_listings_id_fk";
--> statement-breakpoint
ALTER TABLE "viewing_requests" DROP CONSTRAINT "viewing_requests_listing_id_land_listings_id_fk";
--> statement-breakpoint
ALTER TABLE "land_updated_listings_embeddings" ADD CONSTRAINT "land_updated_listings_embeddings_listing_id_land_updated_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."land_updated_listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "land_updated_listings_embeddings_embedding_idx" ON "land_updated_listings_embeddings" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "land_updated_listings_url_key" ON "land_updated_listings" USING btree ("url");--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_land_listing_id_land_updated_listings_id_fk" FOREIGN KEY ("land_listing_id") REFERENCES "public"."land_updated_listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_listing_id_land_updated_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."land_updated_listings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "viewing_requests" ADD CONSTRAINT "viewing_requests_listing_id_land_updated_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."land_updated_listings"("id") ON DELETE cascade ON UPDATE no action;