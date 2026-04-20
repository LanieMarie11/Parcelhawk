import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { and, arrayContains, eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { favorites, landListings } from "@/db/schema";
import { authOptions } from "@/lib/auth";
import { getEmbedding } from "@/lib/embedding";
import { fetchCenterSatelliteMapDataUrl } from "@/lib/parcel-aerial-map";
import {
  extractFiltersWithLlm,
  type SearchQueryFilters,
} from "@/lib/searchQueryExtraction";

const EMBEDDING_SEARCH_LIMIT = 5;
const STATIC_MAP_FETCH_CONCURRENCY = 4;

function parseLatLon(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const n = Number(value.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

async function mapPool<T, R>(items: T[], concurrency: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]!, i);
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return out;
}

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

function getAcreageMatchPoints(listingAcres: number | null, targetAcres: number | null): number | null {
  if (listingAcres == null || targetAcres == null || targetAcres <= 0) return null;
  const ratio = Math.abs(listingAcres - targetAcres) / targetAcres;
  if (ratio <= 0.1) return 20;
  if (ratio <= 0.25) return 15;
  if (ratio <= 0.5) return 10;
  return 0;
}

function getSemanticMatchPoints(distance: number, minDistance: number, maxDistance: number): number {
  if (!Number.isFinite(distance)) return 0;
  if (!Number.isFinite(minDistance) || !Number.isFinite(maxDistance)) return 0;
  if (maxDistance <= minDistance) return 50;
  const normalized = (distance - minDistance) / (maxDistance - minDistance);
  const similarity = 1 - Math.min(Math.max(normalized, 0), 1);
  return Math.round(similarity * 50);
}

const FEATURE_SCORE_TOTAL = 30;

const FEATURE_DESCRIPTION_PATTERNS = {
  roadAccessConfirmed: {
    positive: [
      /road access/i,
      /\baccess road\b/i,
      /\bpaved road\b/i,
      /\bgravel road\b/i,
      /\bdriveway access\b/i,
      /\blegal access\b/i,
      /\bmaintained road\b/i,
      /\bcounty road frontage\b/i,
      /\bhighway frontage\b/i,
      /\beasy access\b/i,
      /\baccessible by road\b/i,
    ],
    negative: [
      /no road access/i,
      /without road access/i,
      /\blandlocked\b/i,
      /\bno legal access\b/i,
      /\baccess unknown\b/i,
      /\beasement required for access\b/i,
      /\bprivate easement required\b/i,
      /\blocked gate\b/i,
    ],
  },
  noFloodZone: {
    positive: [
      /not in (a )?flood zone/i,
      /outside (the )?flood zone/i,
      /no flood zone/i,
      /non[- ]flood zone/i,
      /outside (the )?fema floodplain/i,
      /not in (the )?floodplain/i,
      /\bx zone\b/i,
      /\bno flood risk\b/i,
      /\bhigh and dry\b/i,
    ],
    negative: [
      /in (a )?flood zone/i,
      /\bflood zone\b/i,
      /\bfema flood\b/i,
      /\bin (the )?floodplain\b/i,
      /\b100[- ]year floodplain\b/i,
      /\bflood[- ]prone\b/i,
      /\bsubject to flooding\b/i,
      /\bwetland/i,
    ],
  },
  utilitiesNearby: {
    positive: [
      /utilities (nearby|available)/i,
      /power (nearby|at (the )?(road|street))/i,
      /\belectric(ity)? at (the )?(road|street)\b/i,
      /\bpower at (the )?property line\b/i,
      /\butilities at (the )?street\b/i,
      /\bwater (and )?sewer nearby\b/i,
      /\bpublic utilities nearby\b/i,
      /\belectric service available\b/i,
    ],
    negative: [
      /\bno utilities\b/i,
      /\butilities not available\b/i,
      /\boff[- ]grid only\b/i,
      /\bno electric(ity)?\b/i,
      /\bno power nearby\b/i,
      /\bno public utilities\b/i,
      /\bwell and septic required\b/i,
      /\bseptic required\b/i,
    ],
  },
} as const;

type FeatureKey = keyof typeof FEATURE_DESCRIPTION_PATTERNS;

function parseTrueFeatureKeys(passedFeatureFilters: unknown): FeatureKey[] {
  if (!passedFeatureFilters || typeof passedFeatureFilters !== "object") return [];
  const filters = passedFeatureFilters as Record<string, unknown>;
  return (Object.keys(FEATURE_DESCRIPTION_PATTERNS) as FeatureKey[]).filter(
    (key) => filters[key] === true
  );
}

function getFeatureEvidence(description: string, featureKey: FeatureKey): "positive" | "negative" | "unknown" {
  const { positive, negative } = FEATURE_DESCRIPTION_PATTERNS[featureKey];
  if (negative.some((re) => re.test(description))) return "negative";
  if (positive.some((re) => re.test(description))) return "positive";
  return "unknown";
}

function getFeatureMatchScore(descriptionRaw: unknown, requiredFeatures: FeatureKey[]): number {
  if (requiredFeatures.length === 0) return 0;
  const description = typeof descriptionRaw === "string" ? descriptionRaw : "";
  const pointsPerFeature = FEATURE_SCORE_TOTAL / requiredFeatures.length;

  let total = 0;
  for (const featureKey of requiredFeatures) {
    const evidence = getFeatureEvidence(description, featureKey);
    if (evidence === "positive") total += pointsPerFeature;
    else if (evidence === "unknown") total += pointsPerFeature * 0.5;
  }

  return Math.round(total);
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
 * POST: prompt + optional feature flags. LLM extracts SQL filters from the prompt.
 * Body: { prompt: string, features?: object }
 * Returns { listings, promptFilters } where promptFilters mirrors extracted state/county/price/acres.
 * Vector search uses embedding text from the same LLM call (semantic remainder), not the raw prompt.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
    const passedFeatureFilters = body?.features;
    console.log("embedding-search passedFeatureFilters", passedFeatureFilters);
    if (!prompt) {
      return NextResponse.json({ error: "Missing or empty prompt" }, { status: 400 });
    }

    // Use Vertex LLM (Gemini) to extract structured SQL filters and a semantic-only string for embeddings.
    let extractedFilters: SearchQueryFilters | undefined;
    let embeddingQueryText = prompt;
    try {
      const extraction = await extractFiltersWithLlm(prompt);
      extractedFilters = extraction.filters;
      embeddingQueryText = extraction.embeddingQueryText;
      console.log("embedding-search llmExtractedFilters", extractedFilters, "embeddingQueryText", embeddingQueryText);
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
          return NextResponse.json({
            listings: [],
            promptFilters: buildPromptFiltersPayload(extractedFilters),
          });
        }
      }
    }

    const embedding = await getEmbedding(embeddingQueryText);
    const vectorStr = "[" + embedding.join(",") + "]";
    console.log("embedding-search vectorStr", embeddingQueryText);

    const rows =
      allowedListingIds != null && allowedListingIds.length > 0
        ? ((await db.execute(
            sql`SELECT listing_id, (embedding <=> ${vectorStr}::vector) AS distance FROM land_listing_embeddings WHERE listing_id IN (${sql.join(allowedListingIds.map((id) => sql`${id}`), sql`, `)}) ORDER BY embedding <=> ${vectorStr}::vector LIMIT ${EMBEDDING_SEARCH_LIMIT}`
          )) as { listing_id: number; distance: number }[])
        : ((await db.execute(
            sql`SELECT listing_id, (embedding <=> ${vectorStr}::vector) AS distance FROM land_listing_embeddings ORDER BY embedding <=> ${vectorStr}::vector LIMIT ${EMBEDDING_SEARCH_LIMIT}`
          )) as { listing_id: number; distance: number }[]);

    const listingIds = rows.map((r) => r.listing_id);
    if (listingIds.length === 0) {
      return NextResponse.json({
        listings: [],
        promptFilters: buildPromptFiltersPayload(extractedFilters),
      });
    }

    // Fetch full listings in the same order as vector search (by id order).
    const listings = await db
      .select()
      .from(landListings)
      .where(inArray(landListings.id, listingIds));

    const distanceByListingId = new Map(
      rows.map((r) => [r.listing_id, Number(r.distance)] as const)
    );
    const distances = rows
      .map((r) => Number(r.distance))
      .filter((d) => Number.isFinite(d));
    const minDistance = distances.length > 0 ? Math.min(...distances) : 0;
    const maxDistance = distances.length > 0 ? Math.max(...distances) : 0;
    const targetAcres = getTargetAcres(extractedFilters);
    const requiredFeatureKeys = parseTrueFeatureKeys(passedFeatureFilters);

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

    let list = listings
      .map((row) => {
        const distance = distanceByListingId.get(row.id) ?? Number.POSITIVE_INFINITY;
        const semanticMatchScore = getSemanticMatchPoints(distance, minDistance, maxDistance);
        const acreageMatchScore = getAcreageMatchPoints(
          parseNonNegativeNumber((row as { acres?: unknown } | null | undefined)?.acres),
          targetAcres
        );
        const featureMatchScore = getFeatureMatchScore(
          (row as { description?: unknown } | null | undefined)?.description,
          requiredFeatureKeys
        );
        const aiMatchingScore = semanticMatchScore + (acreageMatchScore ?? 0) + featureMatchScore;

        return {
          ...row,
          isFavorite: favoriteIds.has(row.id),
          semanticMatchScore,
          acreageMatchScore,
          featureMatchScore,
          aiMatchingScore,
        };
      })
      .sort((a, b) => b.aiMatchingScore - a.aiMatchingScore);

    const mapsApiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();
    if (mapsApiKey) {
      list = await mapPool(list, STATIC_MAP_FETCH_CONCURRENCY, async (row) => {
        const lat = parseLatLon(row.latitude);
        const lon = parseLatLon(row.longitude);
        if (lat == null || lon == null) {
          return { ...row, parcelSatelliteMapDataUrl: null as string | null };
        }
        const dataUrl = await fetchCenterSatelliteMapDataUrl(lat, lon, mapsApiKey);
        return { ...row, parcelSatelliteMapDataUrl: dataUrl };
      });
    }

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
