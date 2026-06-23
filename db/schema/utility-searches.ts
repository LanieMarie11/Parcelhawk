import { integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { mergedListings } from "./merged-listings";
import { users } from "./users";

export const buyerUtilitySearches = pgTable(
  "buyer_utility_searches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    listingId: integer("listing_id")
      .notNull()
      .references(() => mergedListings.id, { onDelete: "cascade" }),
    report: text("report").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("buyer_utility_searches_user_listing_idx").on(
      table.userId,
      table.listingId,
    ),
  ],
);
