import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { and, arrayContains, eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { favorites, landListings } from "@/db/schema";
import { authOptions } from "@/lib/auth";
import { getEmbedding } from "@/lib/embedding";
import {
  extractFiltersWithLlm,
  type SearchQueryFilters,
} from "@/lib/searchQueryExtraction";

const EMBEDDING_SEARCH_LIMIT = 100;

function toTokenContainsPattern(raw: string): string {
  // Turn "St. Louis" into "%st%louis%" so it matches across punctuation differences.
  const tokens = raw
    .trim()
    .split(/[^a-zA-Z0-9]+/g)
    .filter(Boolean);
  if (tokens.length === 0) return `%${raw}%`;
  return `%${tokens.join("%")}%`;
}

function buildSqlFilterConditions(filters: SearchQueryFilters) {
  const conditions = [];
  if (filters.minPrice != null) {
    conditions.push(gte(landListings.price, String(filters.minPrice)));
  }
  if (filters.maxPrice != null) {
    conditions.push(lte(landListings.price, String(filters.maxPrice)));
  }
  if (filters.minAcres != null) {
    conditions.push(gte(landListings.acres, String(filters.minAcres)));
  }
  if (filters.maxAcres != null) {
    conditions.push(lte(landListings.acres, String(filters.maxAcres)));
  }
  if (filters.activities != null && filters.activities.length > 0) {
    conditions.push(
      or(...filters.activities.map((a) => arrayContains(landListings.activities, [a])))!
    );
  }
  if (filters.propertyTypes != null && filters.propertyTypes.length > 0) {
    conditions.push(
      or(
        ...filters.propertyTypes.map((t) => arrayContains(landListings.propertyType, [t]))
      )!
    );
  }

  if (filters.stateNames != null && filters.stateNames.length > 0) {
    conditions.push(
      or(
        ...filters.stateNames.map((sn) => ilike(landListings.stateName, toTokenContainsPattern(sn)))
      )!
    );
  }

  if (filters.stateAbbreviations != null && filters.stateAbbreviations.length > 0) {
    conditions.push(
      or(
        ...filters.stateAbbreviations.map((abbr) =>
          ilike(landListings.stateAbbreviation, toTokenContainsPattern(abbr))
        )
      )!
    );
  }

  if (filters.cities != null && filters.cities.length > 0) {
    conditions.push(
      or(
        ...filters.cities.map((city) => ilike(landListings.city, toTokenContainsPattern(city)))
      )!
    );
  }

  if (filters.counties != null && filters.counties.length > 0) {
    conditions.push(
      or(
        ...filters.counties.map((county) => ilike(landListings.county, toTokenContainsPattern(county)))
      )!
    );
  }

  return conditions;
}

/**
 * POST: prompt-only embedding search. No other filters.
 * Body: { prompt: string }
 * Returns listings ordered by description similarity (same shape as land-location-search).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
    if (!prompt) {
      return NextResponse.json({ error: "Missing or empty prompt" }, { status: 400 });
    }

    // Use Vertex LLM (Gemini) to extract structured SQL filters from the prompt.
    let extractedFilters: SearchQueryFilters | undefined;
    try {
      extractedFilters = await extractFiltersWithLlm(prompt);
      console.log("embedding-search llmExtractedFilters", extractedFilters);
    } catch (llmError) {
      console.error("LLM filter extraction failed, continuing with embedding-only search:", llmError);
    }

    // SQL filter: get listing IDs that match extracted filters (price, acres, activities, propertyType).
    let allowedListingIds: number[] | null = null;
    if (extractedFilters) {
      const conditions = buildSqlFilterConditions(extractedFilters);
      if (conditions.length > 0) {
        const filtered = await db
          .select({ id: landListings.id })
          .from(landListings)
          .where(and(...conditions));
        allowedListingIds = filtered.map((r) => r.id);
        if (allowedListingIds.length === 0) {
          return NextResponse.json([]);
        }
      }
    }

    const embedding = await getEmbedding(prompt);
    const vectorStr = "[" + embedding.join(",") + "]";

    const rows =
      allowedListingIds != null && allowedListingIds.length > 0
        ? ((await db.execute(
            sql`SELECT listing_id FROM land_listing_embeddings WHERE listing_id IN (${sql.join(allowedListingIds.map((id) => sql`${id}`), sql`, `)}) ORDER BY embedding <=> ${vectorStr}::vector LIMIT ${EMBEDDING_SEARCH_LIMIT}`
          )) as { listing_id: number }[])
        : ((await db.execute(
            sql`SELECT listing_id FROM land_listing_embeddings ORDER BY embedding <=> ${vectorStr}::vector LIMIT ${EMBEDDING_SEARCH_LIMIT}`
          )) as { listing_id: number }[]);

    const listingIds = rows.map((r) => r.listing_id);
    if (listingIds.length === 0) {
      return NextResponse.json([]);
    }

    // Fetch full listings in the same order as vector search (by id order).
    const listings = await db
      .select()
      .from(landListings)
      .where(inArray(landListings.id, listingIds));

    const orderMap = new Map(listingIds.map((id, i) => [id, i]));
    const sorted = [...listings].sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));

    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id ?? null;
    let favoriteIds = new Set<number>();
    if (userId) {
      const favRows = await db
        .select({ landListingId: favorites.landListingId })
        .from(favorites)
        .where(eq(favorites.userId, userId));
      favoriteIds = new Set(favRows.map((r) => r.landListingId));
    }

    const list = sorted.map((row) => ({
      ...row,
      isFavorite: favoriteIds.has(row.id),
    }));

    return NextResponse.json(list);
  } catch (error) {
    console.error("Embedding search API error:", error);
    return NextResponse.json(
      { error: "Embedding search failed" },
      { status: 500 }
    );
  }
}
