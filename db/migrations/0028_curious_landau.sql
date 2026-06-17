ALTER TABLE "favorites" DROP CONSTRAINT "favorites_land_listing_id_land_updated_listings_id_fk";
--> statement-breakpoint
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_listing_id_land_updated_listings_id_fk";
--> statement-breakpoint
ALTER TABLE "viewing_requests" DROP CONSTRAINT "viewing_requests_listing_id_land_updated_listings_id_fk";
--> statement-breakpoint
DELETE FROM "favorites" f
WHERE NOT EXISTS (
  SELECT 1 FROM "merged_listings" m WHERE m.id = f.land_listing_id
);
--> statement-breakpoint
UPDATE "notifications" n
SET "listing_id" = NULL
WHERE "listing_id" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "merged_listings" m WHERE m.id = n.listing_id
  );
--> statement-breakpoint
DELETE FROM "viewing_requests" vr
WHERE NOT EXISTS (
  SELECT 1 FROM "merged_listings" m WHERE m.id = vr.listing_id
);
--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_land_listing_id_merged_listings_id_fk" FOREIGN KEY ("land_listing_id") REFERENCES "public"."merged_listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_listing_id_merged_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."merged_listings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "viewing_requests" ADD CONSTRAINT "viewing_requests_listing_id_merged_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."merged_listings"("id") ON DELETE cascade ON UPDATE no action;