import {
  bigserial,
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  vector,
  varchar,
} from "drizzle-orm/pg-core";

export const landUpdatedListings = pgTable(
  "land_updated_listings",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    url: text("url").notNull(),
    title: text("title"),
    price: numeric("price", { precision: 14, scale: 2 }),
    acres: doublePrecision("acres"),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    address1: text("address1"),
    address2: text("address2"),
    city: text("city"),
    stateAbbreviation: varchar("state_abbreviation", { length: 10 }),
    stateName: text("state_name"),
    zip: varchar("zip", { length: 20 }),
    county: text("county"),
    propertyType: jsonb("property_type"),
    listedDate: text("listed_date"),
    description: text("description"),
    activities: jsonb("activities"),
    propertyAmenities: jsonb("property_amenities"),
    mlsId: text("mlsId"),
    forSale: boolean("for_sale"),
    createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("land_updated_listings_url_key").on(table.url)]
);

/** Embeddings for updated land listing descriptions (Vertex AI; 768 dimensions). */
export const landUpdatedListingEmbeddings = pgTable(
  "land_updated_listings_embeddings",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    listingId: integer("listing_id")
      .notNull()
      .references(() => landUpdatedListings.id, { onDelete: "cascade" })
      .unique(),
    embedding: vector("embedding", { dimensions: 768 }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("land_updated_listings_embeddings_embedding_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops")
    ),
  ]
);
