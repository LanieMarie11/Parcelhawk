import { integer, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { mergedListings } from "./merged-listings";
import { users } from "./users";

export const propertyReportPaymentStatusEnum = pgEnum("property_report_payment_status", [
  "pending",
  "succeeded",
  "refunded",
  "failed",
]);

export const buyerPropertyReportPayments = pgTable(
  "buyer_property_report_payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    listingId: integer("listing_id")
      .notNull()
      .references(() => mergedListings.id, { onDelete: "cascade" }),
    stripePaymentIntentId: text("stripe_payment_intent_id").notNull(),
    amountCents: integer("amount_cents").notNull(),
    status: propertyReportPaymentStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("buyer_property_report_payments_pi_idx").on(table.stripePaymentIntentId),
    uniqueIndex("buyer_property_report_payments_user_listing_idx").on(
      table.userId,
      table.listingId,
    ),
  ],
);
