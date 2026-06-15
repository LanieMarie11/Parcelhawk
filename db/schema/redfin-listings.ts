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
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const redfinUpdatedListings = pgTable(
  "redfin_updated_listings",
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
    stateAbbreviation: text("state_abbreviation"),
    stateName: text("state_name"),
    zip: text("zip"),
    county: text("county"),
    propertyType: jsonb("property_type"),
    listedDate: text("listed_date"),
    description: text("description"),
    activities: jsonb("activities"),
    propertyAmenities: jsonb("property_amenities"),
    mlsId: text("mlsId"),
    apn: text("apn"),
    forSale: boolean("for_sale"),
    createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("redfin_updated_listings_url_key").on(table.url),
    index("redfin_updated_listings_state_zip_idx").on(table.stateAbbreviation, table.zip),
    index("redfin_updated_listings_mlsid_idx")
      .on(table.mlsId)
      .where(sql`${table.mlsId} IS NOT NULL AND ${table.mlsId} <> ''`),
    index("redfin_updated_listings_apn_idx")
      .on(table.apn)
      .where(sql`${table.apn} IS NOT NULL AND ${table.apn} <> ''`),
  ]
);

/** Embeddings for Redfin updated listing descriptions (Vertex AI; 768 dimensions). */
export const redfinUpdatedListingEmbeddings = pgTable(
  "redfin_updated_listings_embeddings",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    listingId: integer("listing_id")
      .notNull()
      .references(() => redfinUpdatedListings.id, { onDelete: "cascade" })
      .unique(),
    embedding: vector("embedding", { dimensions: 768 }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("redfin_updated_listings_embeddings_embedding_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops")
    ),
  ]
);
