import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { landUpdatedListings, viewingRequests } from "@/db/schema";
import { buildLandListingFullAddress } from "@/lib/format-thread-message";
import type { ThreadViewingRowForMerge } from "@/lib/thread-timeline";

export async function fetchViewingRowsWithListingsForThread(
  buyerId: string,
  realtorId: string,
): Promise<ThreadViewingRowForMerge[]> {
  const rows = await db
    .select({
      id: viewingRequests.id,
      listingId: viewingRequests.listingId,
      status: viewingRequests.status,
      buyerNote: viewingRequests.buyerNote,
      scheduledAt: viewingRequests.scheduledAt,
      completedAt: viewingRequests.completedAt,
      createdAt: viewingRequests.createdAt,
      updatedAt: viewingRequests.updatedAt,
      listingPrice: landUpdatedListings.price,
      listingAcres: landUpdatedListings.acres,
      address1: landUpdatedListings.address1,
      city: landUpdatedListings.city,
      stateAbbreviation: landUpdatedListings.stateAbbreviation,
      stateName: landUpdatedListings.stateName,
      zip: landUpdatedListings.zip,
      url: landUpdatedListings.url,
      latitude: landUpdatedListings.latitude,
      longitude: landUpdatedListings.longitude,
    })
    .from(viewingRequests)
    .leftJoin(landUpdatedListings, eq(viewingRequests.listingId, landUpdatedListings.id))
    .where(and(eq(viewingRequests.buyerId, buyerId), eq(viewingRequests.realtorId, realtorId)))
    .orderBy(asc(viewingRequests.createdAt));

  const withListing: ThreadViewingRowForMerge[] = rows.map((row) => {
    const fullAddress = buildLandListingFullAddress({
      address1: row.address1,
      city: row.city,
      stateAbbreviation: row.stateAbbreviation,
      stateName: row.stateName,
      zip: row.zip,
    });
    return {
      id: row.id,
      listingId: row.listingId,
      status: row.status,
      buyerNote: row.buyerNote,
      scheduledAt: row.scheduledAt,
      completedAt: row.completedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      price: row.listingPrice != null ? String(row.listingPrice) : "",
      acres: row.listingAcres != null ? String(row.listingAcres) : "",
      fullAddress,
      url: row.url ?? null,
      latitude: row.latitude != null ? Number(row.latitude) : null,
      longitude: row.longitude != null ? Number(row.longitude) : null,
      /** Filled on the client from lat/lng + `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (see ThreadConversationTimeline). */
      parcelSatelliteMapDataUrl: null,
    };
  });

  return withListing;
}
