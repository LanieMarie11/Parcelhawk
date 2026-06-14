CREATE TABLE "redfin_updated_listings_embeddings" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"listing_id" integer NOT NULL,
	"embedding" vector(768) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "redfin_updated_listings_embeddings_listing_id_unique" UNIQUE("listing_id")
);
--> statement-breakpoint
CREATE TABLE "redfin_updated_listings" (
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
	"state_abbreviation" text,
	"state_name" text,
	"zip" text,
	"county" text,
	"property_type" jsonb,
	"listed_date" text,
	"description" text,
	"activities" jsonb,
	"property_amenities" jsonb,
	"mlsId" text,
	"apn" text,
	"for_sale" boolean,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "redfin_updated_listings_embeddings" ADD CONSTRAINT "redfin_updated_listings_embeddings_listing_id_redfin_updated_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."redfin_updated_listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "redfin_updated_listings_embeddings_embedding_idx" ON "redfin_updated_listings_embeddings" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "redfin_updated_listings_url_key" ON "redfin_updated_listings" USING btree ("url");--> statement-breakpoint
CREATE INDEX "redfin_updated_listings_state_zip_idx" ON "redfin_updated_listings" USING btree ("state_abbreviation","zip");--> statement-breakpoint
CREATE INDEX "redfin_updated_listings_mlsid_idx" ON "redfin_updated_listings" USING btree ("mlsId") WHERE "redfin_updated_listings"."mlsId" IS NOT NULL AND "redfin_updated_listings"."mlsId" <> '';--> statement-breakpoint
CREATE INDEX "redfin_updated_listings_apn_idx" ON "redfin_updated_listings" USING btree ("apn") WHERE "redfin_updated_listings"."apn" IS NOT NULL AND "redfin_updated_listings"."apn" <> '';