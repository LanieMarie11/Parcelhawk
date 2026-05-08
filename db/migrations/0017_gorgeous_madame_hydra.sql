ALTER TABLE "saved_searches" ADD COLUMN "state" text;--> statement-breakpoint
ALTER TABLE "saved_searches" ADD COLUMN "county" text;--> statement-breakpoint
ALTER TABLE "saved_searches" DROP COLUMN "location";