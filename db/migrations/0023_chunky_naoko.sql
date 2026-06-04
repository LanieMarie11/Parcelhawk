ALTER TABLE "notifications" DROP CONSTRAINT "notifications_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_buyer_investor_link_id_buyer_investor_links_id_fk";
--> statement-breakpoint
DROP INDEX "notifications_user_unread_idx";--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "buyer_read_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "realtor_read_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "buyer_delete_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "realtor_delete_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_buyer_investor_link_id_buyer_investor_links_id_fk" FOREIGN KEY ("buyer_investor_link_id") REFERENCES "public"."buyer_investor_links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notifications_user_unread_idx" ON "notifications" USING btree ("user_id","buyer_read_at");--> statement-breakpoint
ALTER TABLE "notifications" DROP COLUMN "read_at";--> statement-breakpoint
ALTER TABLE "notifications" DROP COLUMN "dismissed_at";