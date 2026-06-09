import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { and, eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { favorites, landUpdatedListings } from "@/db/schema";
import { authOptions } from "@/lib/auth";
import { getEmbedding } from "@/lib/embedding";
import { jsonbArrayContains } from "@/lib/land-updated-listing-filters";
import { getBuyerViewingRequestListingIds } from "@/lib/get-buyer-viewing-request-listing-ids";
import {
  extractFiltersFromPrompt,
  extractFiltersWithLlm,
  type SearchQueryFilters,
} from "@/lib/searchQueryExtraction";

const SEMANTIC_PRESELECT_LIMIT = 100;
const FINAL_RETURN_LIMIT = 20;

function toTokenContainsPattern(raw: string): string {
  // Turn "St. Louis" into "%st%louis%" so it matches across punctuation differences.
  const tokens = raw
    .trim()
    .split(/[^a-zA-Z0-9]+/g)
    .filter(Boolean);
  if (tokens.length === 0) return `%${raw}%`;
  return `%${tokens.join("%")}%`;
}

function parseNonNegativeNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) && value >= 0 ? value : null;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.]/g, ""));
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  }
  return null;
}

function getTargetAcres(filters: SearchQueryFilters | undefined): number | null {
  const minAcres = filters?.minAcres ?? null;
  const maxAcres = filters?.maxAcres ?? null;
  if (minAcres != null && maxAcres != null) {
    const mid = (minAcres + maxAcres) / 2;
    return mid > 0 ? mid : null;
  }
  const single = minAcres ?? maxAcres ?? null;
  return single != null && single > 0 ? single : null;
}

const AI_MATCHING_SCORE_TOTAL = 100;
const SEMANTIC_SCORE_TOTAL = 70;
const ACREAGE_SCORE_TOTAL = 30;

function getAcreageMatchPoints(listingAcres: number | null, targetAcres: number | null): number | null {
  if (listingAcres == null || targetAcres == null || targetAcres <= 0) return null;
  const ratio = Math.abs(listingAcres - targetAcres) / targetAcres;
  if (ratio <= 0.1) return ACREAGE_SCORE_TOTAL;
  if (ratio <= 0.25) return Math.round(ACREAGE_SCORE_TOTAL * 0.75);
  if (ratio <= 0.5) return Math.round(ACREAGE_SCORE_TOTAL * 0.5);
  return 0;
}

function getSemanticMatchPoints(distance: number, minDistance: number, maxDistance: number): number {
  if (!Number.isFinite(distance)) return 0;
  if (!Number.isFinite(minDistance) || !Number.isFinite(maxDistance)) return 0;
  if (maxDistance <= minDistance) return SEMANTIC_SCORE_TOTAL;
  const normalized = (distance - minDistance) / (maxDistance - minDistance);
  const similarity = 1 - Math.min(Math.max(normalized, 0), 1);
  return Math.round(similarity * SEMANTIC_SCORE_TOTAL);
}

function buildSqlFilterConditions(filters: SearchQueryFilters) {
  const conditions = [];
  if (filters.minPrice != null) {
    conditions.push(gte(landUpdatedListings.price, String(filters.minPrice)));
  }
  if (filters.maxPrice != null) {
    conditions.push(lte(landUpdatedListings.price, String(filters.maxPrice)));
  }
  if (filters.minAcres != null) {
    conditions.push(gte(landUpdatedListings.acres, filters.minAcres));
  }
  if (filters.maxAcres != null) {
    conditions.push(lte(landUpdatedListings.acres, filters.maxAcres));
  }
  if (filters.activities != null && filters.activities.length > 0) {
    conditions.push(
      or(...filters.activities.map((a) => jsonbArrayContains(landUpdatedListings.activities, a)))!
    );
  }
  if (filters.propertyTypes != null && filters.propertyTypes.length > 0) {
    conditions.push(
      or(
        ...filters.propertyTypes.map((t) =>
          jsonbArrayContains(landUpdatedListings.propertyType, t)
        )
      )!
    );
  }

  if (filters.stateNames != null && filters.stateNames.length > 0) {
    conditions.push(
      or(
        ...filters.stateNames.map((sn) =>
          ilike(landUpdatedListings.stateName, toTokenContainsPattern(sn))
        )
      )!
    );
  }

  if (filters.stateAbbreviations != null && filters.stateAbbreviations.length > 0) {
    conditions.push(
      or(
        ...filters.stateAbbreviations.map((abbr) =>
          ilike(landUpdatedListings.stateAbbreviation, toTokenContainsPattern(abbr))
        )
      )!
    );
  }

  if (filters.cities != null && filters.cities.length > 0) {
    conditions.push(
      or(
        ...filters.cities.map((city) =>
          ilike(landUpdatedListings.city, toTokenContainsPattern(city))
        )
      )!
    );
  }

  if (filters.counties != null && filters.counties.length > 0) {
    conditions.push(
      or(
        ...filters.counties.map((county) =>
          ilike(landUpdatedListings.county, toTokenContainsPattern(county))
        )
      )!
    );
  }

  return conditions;
}

/** Location/price/acreage fields extracted from the prompt and used for SQL pre-filtering. */
export type EmbeddingSearchPromptFilters = {
  stateNames: string[] | null;
  stateAbbreviations: string[] | null;
  counties: string[] | null;
  minPrice: number | null;
  maxPrice: number | null;
  minAcres: number | null;
  maxAcres: number | null;
};

function buildPromptFiltersPayload(
  filters: SearchQueryFilters | undefined
): EmbeddingSearchPromptFilters {
  return {
    stateNames: filters?.stateNames?.length ? filters.stateNames : null,
    stateAbbreviations: filters?.stateAbbreviations?.length ? filters.stateAbbreviations : null,
    counties: filters?.counties?.length ? filters.counties : null,
    minPrice: filters?.minPrice ?? null,
    maxPrice: filters?.maxPrice ?? null,
    minAcres: filters?.minAcres ?? null,
    maxAcres: filters?.maxAcres ?? null,
  };
}

/**
 * POST: natural-language search. LLM extracts SQL filters from the prompt.
 * Body: { prompt: string }
 * Returns { listings, promptFilters } where promptFilters mirrors extracted state/county/price/acres.
 * Vector search uses embedding text from the same LLM call (semantic remainder), not the raw prompt.
 * aiMatchingScore max 100: semantic (0–70) + acreage (0–30) when acres in query; else semantic scaled to 100.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
    if (!prompt) {
      return NextResponse.json({ error: "Missing or empty prompt" }, { status: 400 });
    }

    // Use Vertex LLM (Gemini) to extract structured SQL filters and a semantic-only string for embeddings.
    let extractedFilters: SearchQueryFilters | undefined;
    let embeddingQueryText: string | null = prompt;
    try {
      const extraction = await extractFiltersWithLlm(prompt);
      extractedFilters = extraction.filters;
      embeddingQueryText = extraction.embeddingQueryText;
      console.log("embedding-search llmExtractedFilters", extractedFilters, "embeddingQueryText", embeddingQueryText);
    } catch (llmError) {
      console.error("LLM filter extraction failed, using heuristic filters:", llmError);
      extractedFilters = extractFiltersFromPrompt(prompt);
    }

    // SQL filter: get listing IDs that match extracted filters (price, acres, activities, propertyType).
    let allowedListingIds: number[] | null = null;
    if (extractedFilters) {
      const conditions = buildSqlFilterConditions(extractedFilters);
      if (conditions.length > 0) {
        const filtered = await db
          .select({ id: landUpdatedListings.id })
          .from(landUpdatedListings)
          .where(and(...conditions));
        console.log("embedding-search sqlFilteredRowCount", filtered.length);
        allowedListingIds = filtered.map((r) => r.id);
        if (allowedListingIds.length === 0) {
          return NextResponse.json({
            listings: [],
            promptFilters: buildPromptFiltersPayload(extractedFilters),
          });
        }
      }
    }

    const embeddingInput =
      typeof embeddingQueryText === "string" ? embeddingQueryText : null;
    const hasEmbeddingInput = embeddingInput != null && embeddingInput.trim().length > 0;
    let rows: { listing_id: number; distance: number }[] = [];

    if (hasEmbeddingInput) {
      const embedding = await getEmbedding(embeddingInput);
      const vectorStr = "[" + embedding.join(",") + "]";
      console.log("embedding-search vectorStr", embeddingInput);

      rows =
        allowedListingIds != null && allowedListingIds.length > 0
          ? ((await db.execute(
              sql`SELECT listing_id, (embedding <=> ${vectorStr}::vector) AS distance FROM land_updated_listings_embeddings WHERE listing_id IN (${sql.join(allowedListingIds.map((id) => sql`${id}`), sql`, `)}) ORDER BY embedding <=> ${vectorStr}::vector LIMIT ${SEMANTIC_PRESELECT_LIMIT}`
            )) as { listing_id: number; distance: number }[])
          : ((await db.execute(
              sql`SELECT listing_id, (embedding <=> ${vectorStr}::vector) AS distance FROM land_updated_listings_embeddings ORDER BY embedding <=> ${vectorStr}::vector LIMIT ${SEMANTIC_PRESELECT_LIMIT}`
            )) as { listing_id: number; distance: number }[]);
    }

    const listingIds = hasEmbeddingInput
      ? rows.map((r) => r.listing_id)
      : allowedListingIds != null && allowedListingIds.length > 0
        ? allowedListingIds.slice(0, SEMANTIC_PRESELECT_LIMIT)
        : [];
    if (listingIds.length === 0) {
      return NextResponse.json({
        listings: [],
        promptFilters: buildPromptFiltersPayload(extractedFilters),
      });
    }

    // Fetch full listings in the same order as vector search (by id order).
    const listings = await db
      .select()
      .from(landUpdatedListings)
      .where(inArray(landUpdatedListings.id, listingIds));

    const distanceByListingId = new Map(
      rows.map((r) => [r.listing_id, Number(r.distance)] as const)
    );
    const distances = rows
      .map((r) => Number(r.distance))
      .filter((d) => Number.isFinite(d));
    const minDistance = distances.length > 0 ? Math.min(...distances) : 0;
    const maxDistance = distances.length > 0 ? Math.max(...distances) : 0;
    const targetAcres = getTargetAcres(extractedFilters);

    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id ?? null;
    let favoriteIds = new Set<number>();
    let viewingRequestListingIds = new Set<number>();
    if (userId) {
      const listingIds = listings.map((row) => row.id);
      const [favRows, viewingIds] = await Promise.all([
        db
          .select({ landListingId: favorites.landListingId })
          .from(favorites)
          .where(eq(favorites.userId, userId)),
        getBuyerViewingRequestListingIds(userId, listingIds),
      ]);
      favoriteIds = new Set(favRows.map((r) => r.landListingId));
      viewingRequestListingIds = viewingIds;
    }

    const hasTargetAcres = targetAcres != null && targetAcres > 0;

    const list = listings
      .map((row) => {
        const distance = distanceByListingId.get(row.id) ?? Number.POSITIVE_INFINITY;
        const semanticMatchScore = hasEmbeddingInput
          ? getSemanticMatchPoints(distance, minDistance, maxDistance)
          : SEMANTIC_SCORE_TOTAL;
        const acreageMatchScore =
          !hasTargetAcres
            ? 0
            : (getAcreageMatchPoints(
                parseNonNegativeNumber((row as { acres?: unknown } | null | undefined)?.acres),
                targetAcres
              ) ?? 0);
        const aiMatchingScore = hasTargetAcres
          ? semanticMatchScore + acreageMatchScore
          : Math.round((semanticMatchScore / SEMANTIC_SCORE_TOTAL) * AI_MATCHING_SCORE_TOTAL);
        console.log("👍semanticMatchScore", semanticMatchScore, "acreageMatchScore", acreageMatchScore, "aiMatchingScore", aiMatchingScore);

        return {
          ...row,
          isFavorite: favoriteIds.has(row.id),
          hasViewingRequest: viewingRequestListingIds.has(row.id),
          semanticMatchScore,
          acreageMatchScore,
          aiMatchingScore,
        };
      })
      .sort((a, b) => b.aiMatchingScore - a.aiMatchingScore)
      .slice(0, FINAL_RETURN_LIMIT);

    return NextResponse.json({
      listings: list,
      promptFilters: buildPromptFiltersPayload(extractedFilters),
    });
  } catch (error) {
    console.error("Embedding search API error:", error);
    return NextResponse.json(
      { error: "Embedding search failed" },
      { status: 500 }
    );
  }
}
