ALTER TABLE "investors" ADD COLUMN "password" text NOT NULL;--> statement-breakpoint
ALTER TABLE "investors" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "investors" ADD COLUMN "last_login_at" timestamp;