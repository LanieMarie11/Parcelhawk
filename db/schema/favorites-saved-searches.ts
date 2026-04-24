import { integer, numeric, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { landListings } from "./listings";
import { users } from "./users";

export const favorites = pgTable(
  "favorites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    landListingId: integer("land_listing_id")
      .notNull()
      .references(() => landListings.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    // One favorite per user per listing
    uniqueIndex("favorites_user_listing_idx").on(
      table.userId,
      table.landListingId
    ),
  ]
);

export const savedSearches = pgTable("saved_searches", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  frequency: text("frequency").notNull(),
  // Search criteria (nullable = not set in saved search)
  minPrice: numeric("min_price"),
  maxPrice: numeric("max_price"),
  minAcres: numeric("min_acres"),
  maxAcres: numeric("max_acres"),
  location: text("location"),
  prompt: text("prompt"),
  propertyType: text("property_type"),
  landType: text("land_type"),
  activities: text("activities").array(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
