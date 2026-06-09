import { index, integer, pgEnum, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { landUpdatedListings } from "./updated-listing";
import { investors, users } from "./users";

export const viewingRequestStatusEnum = pgEnum("viewing_request_status", [
  "pending",
  "scheduled",
  "completed",
  "cancelled",
]);

/**
 * Buyer viewing request for a land listing.
 * `realtorId` references `investors` and is set at creation so history survives buyer re-linking.
 */
export const viewingRequests = pgTable(
  "viewing_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    buyerId: uuid("buyer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    realtorId: uuid("realtor_id")
      .notNull()
      .references(() => investors.id, { onDelete: "cascade" }),
    listingId: integer("listing_id")
      .notNull()
      .references(() => landUpdatedListings.id, { onDelete: "cascade" }),
    status: viewingRequestStatusEnum("status").notNull().default("pending"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    buyerNote: varchar("buyer_note", { length: 2000 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("viewing_requests_buyer_created_idx").on(table.buyerId, table.createdAt),
    index("viewing_requests_realtor_created_idx").on(table.realtorId, table.createdAt),
    index("viewing_requests_listing_idx").on(table.listingId),
  ],
);
