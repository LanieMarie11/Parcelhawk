CREATE TYPE "public"."buyer_investor_link_ended_by" AS ENUM('buyer', 'realtor', 'system');--> statement-breakpoint
CREATE TYPE "public"."buyer_investor_link_status" AS ENUM('active', 'ended');--> statement-breakpoint
CREATE TYPE "public"."buyer_investor_linked_via" AS ENUM('referral_link', 'default', 'invitation', 'flag_return');--> statement-breakpoint
CREATE TYPE "public"."buyer_investor_realtor_flag" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TABLE "buyer_investor_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"buyer_id" uuid NOT NULL,
	"investor_id" uuid NOT NULL,
	"status" "buyer_investor_link_status" NOT NULL,
	"linked_via" "buyer_investor_linked_via" NOT NULL,
	"linked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"ended_by" "buyer_investor_link_ended_by",
	"end_reason" text,
	"end_note" text,
	"realtor_flag" "buyer_investor_realtor_flag" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
