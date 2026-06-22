import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { buyerUtilitySearches, favorites, mergedListings } from "@/db/schema";
import { runUtilityDueDiligenceWithLlm } from "@/lib/ai-utility-due-diligence";
import { authOptions } from "@/lib/auth";
import type { UtilityDueDiligencePromptParams } from "@/lib/prompt/utility";

/** US assessor parcel numbers: alphanumeric with optional . - / and spaces (3–30 chars). */
const LISTING_APN_PATTERN = /^[A-Za-z0-9][A-Za-z0-9.\-/\s]{1,28}[A-Za-z0-9]$/;

type UtilitySearchJson = {
  ok: true;
  listingId: number;
  report: string;
  generatedAt: string;
  cached: boolean;
};

function normalizeListingApn(apn: string | null | undefined): string | null {
  if (typeof apn !== "string") return null;

  const trimmed = apn.trim();
  if (trimmed.length < 3 || trimmed.length > 30) return null;
  if (/^(unknown|n\/?a|none|null|tbd)$/i.test(trimmed)) return null;
  if (trimmed.includes(",") || /https?:\/\//i.test(trimmed)) return null;

  return LISTING_APN_PATTERN.test(trimmed) ? trimmed : null;
}

function formatListingAddress(listing: {
  address1: string | null;
  city: string | null;
  zip: string | null;
}): string | null {
  const parts = [listing.address1, listing.city, listing.zip].filter(
    (part): part is string => typeof part === "string" && part.trim().length > 0,
  );

  return parts.length > 0 ? parts.map((part) => part.trim()).join(", ") : null;
}

function listingToUtilityPromptParams(listing: {
  address1: string | null;
  city: string | null;
  zip: string | null;
  county: string | null;
  stateAbbreviation: string | null;
  stateName: string | null;
  latitude: number | null;
  longitude: number | null;
  apn: string | null;
}): UtilityDueDiligencePromptParams {
  return {
    address: formatListingAddress(listing),
    county: listing.county,
    state: listing.stateAbbreviation ?? listing.stateName,
    apn: normalizeListingApn(listing.apn),
    latitude: listing.latitude,
    longitude: listing.longitude,
  };
}

function parseListingId(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    return Number.parseInt(value.trim(), 10);
  }
  return null;
}

function toUtilitySearchJson(
  listingId: number,
  report: string,
  generatedAt: Date,
  cached: boolean,
): UtilitySearchJson {
  return {
    ok: true,
    listingId,
    report,
    generatedAt: generatedAt.toISOString(),
    cached,
  };
}

async function getBuyerId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return (session?.user as { id?: string } | undefined)?.id ?? null;
}

async function assertFavoriteAccess(buyerId: string, listingId: number) {
  const [favoriteRow] = await db
    .select({ id: favorites.id })
    .from(favorites)
    .where(and(eq(favorites.userId, buyerId), eq(favorites.landListingId, listingId)))
    .limit(1);

  if (!favoriteRow) {
    return NextResponse.json(
      { error: "You can only run a utility search for a saved property" },
      { status: 403 },
    );
  }

  return null;
}

async function getListingRow(listingId: number) {
  const [listingRow] = await db
    .select({
      id: mergedListings.id,
      address1: mergedListings.address1,
      city: mergedListings.city,
      zip: mergedListings.zip,
      county: mergedListings.county,
      stateAbbreviation: mergedListings.stateAbbreviation,
      stateName: mergedListings.stateName,
      latitude: mergedListings.latitude,
      longitude: mergedListings.longitude,
      apn: mergedListings.apn,
    })
    .from(mergedListings)
    .where(eq(mergedListings.id, listingId))
    .limit(1);

  if (!listingRow) {
    return { listingRow: null, error: NextResponse.json({ error: "Listing not found" }, { status: 404 }) };
  }

  return { listingRow, error: null };
}

async function getSavedUtilitySearch(buyerId: string, listingId: number) {
  const [savedRow] = await db
    .select({
      report: buyerUtilitySearches.report,
      createdAt: buyerUtilitySearches.createdAt,
    })
    .from(buyerUtilitySearches)
    .where(
      and(eq(buyerUtilitySearches.userId, buyerId), eq(buyerUtilitySearches.listingId, listingId)),
    )
    .limit(1);

  return savedRow ?? null;
}

async function generateAndSaveUtilitySearch(
  buyerId: string,
  listingId: number,
): Promise<{ report: string; generatedAt: Date } | { error: NextResponse }> {
  const { listingRow, error: listingError } = await getListingRow(listingId);
  if (listingError) return { error: listingError };
  if (!listingRow) {
    return { error: NextResponse.json({ error: "Listing not found" }, { status: 404 }) };
  }

  const promptParams = listingToUtilityPromptParams(listingRow);
  const report = await runUtilityDueDiligenceWithLlm(promptParams);

  if (!report) {
    return {
      error: NextResponse.json(
        { error: "Failed to generate utility due diligence report" },
        { status: 502 },
      ),
    };
  }

  const now = new Date();
  await db
    .insert(buyerUtilitySearches)
    .values({
      userId: buyerId,
      listingId,
      report,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [buyerUtilitySearches.userId, buyerUtilitySearches.listingId],
      set: {
        report,
        updatedAt: now,
      },
    });

  return { report, generatedAt: now };
}

export async function GET(request: Request) {
  const buyerId = await getBuyerId();
  if (!buyerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const listingId = parseListingId(new URL(request.url).searchParams.get("listingId"));
  if (listingId == null) {
    return NextResponse.json({ error: "listingId is required" }, { status: 400 });
  }

  try {
    const favoriteError = await assertFavoriteAccess(buyerId, listingId);
    if (favoriteError) return favoriteError;

    const savedRow = await getSavedUtilitySearch(buyerId, listingId);
    if (!savedRow) {
      return NextResponse.json({ error: "Utility search report not found" }, { status: 404 });
    }

    return NextResponse.json(
      toUtilitySearchJson(listingId, savedRow.report, savedRow.createdAt, true),
    );
  } catch (err) {
    console.error("Utility search GET error:", err);
    return NextResponse.json({ error: "Failed to fetch utility search report" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const buyerId = await getBuyerId();
  if (!buyerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { listingId?: unknown; regenerate?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const listingId = parseListingId(body.listingId);
  if (listingId == null) {
    return NextResponse.json({ error: "listingId is required" }, { status: 400 });
  }

  const regenerate = body.regenerate === true;

  try {
    const favoriteError = await assertFavoriteAccess(buyerId, listingId);
    if (favoriteError) return favoriteError;

    if (!regenerate) {
      const savedRow = await getSavedUtilitySearch(buyerId, listingId);
      if (savedRow) {
        return NextResponse.json(
          toUtilitySearchJson(listingId, savedRow.report, savedRow.createdAt, true),
        );
      }
    }

    const result = await generateAndSaveUtilitySearch(buyerId, listingId);
    if ("error" in result) return result.error;

    return NextResponse.json(
      toUtilitySearchJson(listingId, result.report, result.generatedAt, false),
    );
  } catch (err) {
    console.error("Utility search POST error:", err);
    return NextResponse.json({ error: "Failed to submit utility search request" }, { status: 500 });
  }
}
