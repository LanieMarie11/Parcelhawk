import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { landListings, viewingRequests } from "@/db/schema";
import { buildLandListingFullAddress } from "@/lib/format-thread-message";
import { fetchCenterSatelliteMapDataUrl } from "@/lib/parcel-aerial-map";
import type { ThreadViewingRowForMerge } from "@/lib/thread-timeline";

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

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, i: number) => Promise<R>,
): Promise<R[]> {
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
      listingPrice: landListings.price,
      listingAcres: landListings.acres,
      address1: landListings.address1,
      city: landListings.city,
      stateAbbreviation: landListings.stateAbbreviation,
      stateName: landListings.stateName,
      zip: landListings.zip,
      url: landListings.url,
      latitude: landListings.latitude,
      longitude: landListings.longitude,
    })
    .from(viewingRequests)
    .leftJoin(landListings, eq(viewingRequests.listingId, landListings.id))
    .where(and(eq(viewingRequests.buyerId, buyerId), eq(viewingRequests.realtorId, realtorId)))
    .orderBy(asc(viewingRequests.createdAt));

  let withListing: ThreadViewingRowForMerge[] = rows.map((row) => {
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
      parcelSatelliteMapDataUrl: null,
    };
  });

  const mapsApiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (mapsApiKey) {
    withListing = await mapPool(withListing, STATIC_MAP_FETCH_CONCURRENCY, async (item) => {
      const lat = parseLatLon(item.latitude);
      const lon = parseLatLon(item.longitude);
      if (lat == null || lon == null) {
        return { ...item, parcelSatelliteMapDataUrl: null as string | null };
      }
      const dataUrl = await fetchCenterSatelliteMapDataUrl(lat, lon, mapsApiKey);
      return { ...item, parcelSatelliteMapDataUrl: dataUrl };
    });
  }

  return withListing;
}
