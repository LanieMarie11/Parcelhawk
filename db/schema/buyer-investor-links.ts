import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/** Link lifecycle (`active` / `ended`). */
export const buyerInvestorLinkStatusEnum = pgEnum("buyer_investor_link_status", [
  "active",
  "ended",
]);

/**
 * How the buyer–investor relationship was created.
 * Note: `default` is the enum label in Postgres; enforce in app when inserting.
 */
export const buyerInvestorLinkedViaEnum = pgEnum("buyer_investor_linked_via", [
  "referral_link",
  "default",
  "invitation",
  "flag_return",
]);

/** Who ended the link (set when `status` is `ended`). */
export const buyerInvestorLinkEndedByEnum = pgEnum("buyer_investor_link_ended_by", [
  "buyer",
  "realtor",
  "system",
]);

/** Simpler flag for realtor cancel / reactivation flow (e.g. auto-return). */
export const buyerInvestorRealtorFlagEnum = pgEnum("buyer_investor_realtor_flag", [
  "active",
  "inactive",
]);

/**
 * Buyer and investor are plain UUIDs; enforce `users` / `investors` in application code.
 */
export const buyerInvestorLinks = pgTable(
  "buyer_investor_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    buyerId: uuid("buyer_id").notNull(),
    investorId: uuid("investor_id").notNull(),
    status: buyerInvestorLinkStatusEnum("status").notNull(),
    linkedVia: buyerInvestorLinkedViaEnum("linked_via").notNull(),
    /** When the buyer–investor link became active. */
    linkedAt: timestamp("linked_at", { withTimezone: true }).defaultNow().notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    endedBy: buyerInvestorLinkEndedByEnum("ended_by"),
    /** App-defined reason key (dropdown / controlled vocabulary). */
    endReason: text("end_reason"),
    endNote: text("end_note"),
    /** Tracks realtor-side cancel; use `inactive` when paused, `active` for normal / eligible auto-return. */
    realtorFlag: buyerInvestorRealtorFlagEnum("realtor_flag")
      .notNull()
      .default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
);
