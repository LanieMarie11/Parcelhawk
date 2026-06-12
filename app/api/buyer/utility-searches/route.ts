import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { favorites, landUpdatedListings } from "@/db/schema";
import { runUtilityDueDiligenceWithLlm } from "@/lib/ai-utility-due-diligence";
import { authOptions } from "@/lib/auth";
import type { UtilityDueDiligencePromptParams } from "@/lib/prompt/utility";

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
}): UtilityDueDiligencePromptParams {
  return {
    address: formatListingAddress(listing),
    county: listing.county,
    state: listing.stateAbbreviation ?? listing.stateName,
    apn: null,
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

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const buyerId = (session?.user as { id?: string } | undefined)?.id;

  if (!buyerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { listingId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const listingId = parseListingId(body.listingId);
  if (listingId == null) {
    return NextResponse.json({ error: "listingId is required" }, { status: 400 });
  }

  try {
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

    const [listingRow] = await db
      .select({
        id: landUpdatedListings.id,
        address1: landUpdatedListings.address1,
        city: landUpdatedListings.city,
        zip: landUpdatedListings.zip,
        county: landUpdatedListings.county,
        stateAbbreviation: landUpdatedListings.stateAbbreviation,
        stateName: landUpdatedListings.stateName,
        latitude: landUpdatedListings.latitude,
        longitude: landUpdatedListings.longitude,
      })
      .from(landUpdatedListings)
      .where(eq(landUpdatedListings.id, listingId))
      .limit(1);

    if (!listingRow) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    const promptParams = listingToUtilityPromptParams(listingRow);
    const report = await runUtilityDueDiligenceWithLlm(promptParams);

    if (!report) {
      return NextResponse.json(
        { error: "Failed to generate utility due diligence report" },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true, listingId, report });
  } catch (err) {
    console.error("Utility search POST error:", err);
    return NextResponse.json({ error: "Failed to submit utility search request" }, { status: 500 });
  }
}
