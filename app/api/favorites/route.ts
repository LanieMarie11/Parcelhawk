import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { db } from "@/db";
import {
  buyerInvestorLinks,
  favorites,
  landUpdatedListings,
  viewingRequests,
} from "@/db/schema";
import { and, desc, eq, inArray } from "drizzle-orm";
import { authOptions } from "@/lib/auth";
import { jsonbArrayFirst } from "@/lib/land-updated-listing-filters";

function getUserId(session: Session | null): string | null {
  return (session?.user as { id?: string } | undefined)?.id ?? null;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [rows, linkRow] = await Promise.all([
      db
        .select({
          id: landUpdatedListings.id,
          title: landUpdatedListings.title,
          price: landUpdatedListings.price,
          acres: landUpdatedListings.acres,
          address1: landUpdatedListings.address1,
          city: landUpdatedListings.city,
          stateAbbreviation: landUpdatedListings.stateAbbreviation,
          stateName: landUpdatedListings.stateName,
          zip: landUpdatedListings.zip,
          latitude: landUpdatedListings.latitude,
          longitude: landUpdatedListings.longitude,
          propertyType: landUpdatedListings.propertyType,
          url: landUpdatedListings.url,
          description: landUpdatedListings.description,
          updatedAt: landUpdatedListings.updatedAt,
          createdAt: favorites.createdAt,
        })
        .from(favorites)
        .innerJoin(landUpdatedListings, eq(favorites.landListingId, landUpdatedListings.id))
        .where(eq(favorites.userId, userId))
        .orderBy(desc(landUpdatedListings.listedDate)),
      db
        .select({ investorId: buyerInvestorLinks.investorId })
        .from(buyerInvestorLinks)
        .where(
          and(
            eq(buyerInvestorLinks.buyerId, userId),
            eq(buyerInvestorLinks.status, "active"),
            eq(buyerInvestorLinks.realtorFlag, "active")
          )
        )
        .orderBy(desc(buyerInvestorLinks.linkedAt))
        .limit(1),
    ]);

    const realtorId = linkRow[0]?.investorId;
    const viewingRequestListingIds = new Set<number>();

    if (realtorId && rows.length > 0) {
      const listingIds = rows.map((row) => row.id);
      const viewingRows = await db
        .select({ listingId: viewingRequests.listingId })
        .from(viewingRequests)
        .where(
          and(
            eq(viewingRequests.buyerId, userId),
            eq(viewingRequests.realtorId, realtorId),
            inArray(viewingRequests.listingId, listingIds)
          )
        );
      for (const row of viewingRows) {
        viewingRequestListingIds.add(row.listingId);
      }
    }

    const listings = rows.map((row) => ({
      id: row.id,
      images: undefined,
      category: jsonbArrayFirst(row.propertyType),
      categoryColor: "#3b8a6e",
      name: row.title ?? "",
      price: row.price != null ? String(row.price) : "",
      location: row.city ?? "",
      address1: row.address1 ?? null,
      city: row.city ?? null,
      stateAbbreviation: row.stateAbbreviation ?? null,
      stateName: row.stateName ?? null,
      zip: row.zip ?? null,
      acreage: row.acres != null ? String(row.acres) : "",
      latitude: row.latitude != null ? Number(row.latitude) : null,
      longitude: row.longitude != null ? Number(row.longitude) : null,
      isFavorite: true,
      hasViewingRequest: viewingRequestListingIds.has(row.id),
      url: row.url ?? undefined,
      description: row.description ?? undefined,
      updatedAt:
        row.updatedAt != null
          ? row.updatedAt instanceof Date
            ? row.updatedAt.toISOString()
            : String(row.updatedAt)
          : null,
      createdAt:
        row.createdAt != null
          ? row.createdAt instanceof Date
            ? row.createdAt.toISOString()
            : String(row.createdAt)
          : null,
    }));

    return NextResponse.json(listings);
  } catch (err) {
    console.error("Favorites GET error:", err);
    return NextResponse.json(
      { error: "Failed to load favorites" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { landListingIds?: number[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const landListingIds = Array.isArray(body.landListingIds)
    ? body.landListingIds.filter((id): id is number => Number.isInteger(id) && id > 0)
    : [];
  if (landListingIds.length === 0) {
    return NextResponse.json(
      { error: "landListingIds array required" },
      { status: 400 }
    );
  }

  try {
    const existing = await db
      .select({ landListingId: favorites.landListingId })
      .from(favorites)
      .where(
        and(
          eq(favorites.userId, userId),
          inArray(favorites.landListingId, landListingIds)
        )
      );
    const existingIds = new Set(existing.map((r) => r.landListingId));

    const toRemove = landListingIds.filter((id) => existingIds.has(id));
    const toAdd = landListingIds.filter((id) => !existingIds.has(id));

    for (const landListingId of toRemove) {
      await db
        .delete(favorites)
        .where(
          and(
            eq(favorites.userId, userId),
            eq(favorites.landListingId, landListingId)
          )
        );
    }
    if (toAdd.length > 0) {
      await db
        .insert(favorites)
        .values(
          toAdd.map((landListingId) => ({ userId, landListingId }))
        )
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Favorites toggle error:", err);
    return NextResponse.json(
      { error: "Failed to update favorites" },
      { status: 500 }
    );
  }
}
