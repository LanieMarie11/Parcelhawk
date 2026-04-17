import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { db } from "@/db";
import { favorites, landListings } from "@/db/schema";
import { and, desc, eq, inArray } from "drizzle-orm";
import { authOptions } from "@/lib/auth";
import { fetchCenterSatelliteMapDataUrl } from "@/lib/parcel-aerial-map";

const STATIC_MAP_FETCH_CONCURRENCY = 4;

function getUserId(session: Session | null): string | null {
  return (session?.user as { id?: string } | undefined)?.id ?? null;
}

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

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rows = await db
      .select({
        id: landListings.id,
        title: landListings.title,
        price: landListings.price,
        acres: landListings.acres,
        address1: landListings.address1,
        city: landListings.city,
        stateAbbreviation: landListings.stateAbbreviation,
        stateName: landListings.stateName,
        zip: landListings.zip,
        latitude: landListings.latitude,
        longitude: landListings.longitude,
        photos: landListings.photos,
        propertyType: landListings.propertyType,
        url: landListings.url,
        description: landListings.description,
      })
      .from(favorites)
      .innerJoin(landListings, eq(favorites.landListingId, landListings.id))
      .where(eq(favorites.userId, userId))
      .orderBy(desc(landListings.listingDate));

    let listings = rows.map((row) => ({
      id: row.id,
      images: row.photos ?? undefined,
      category: row.propertyType?.[0],
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
      url: row.url ?? undefined,
      description: row.description ?? undefined,
    }));

    const mapsApiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();
    if (mapsApiKey) {
      listings = await mapPool(listings, STATIC_MAP_FETCH_CONCURRENCY, async (item) => {
        const lat = parseLatLon(item.latitude);
        const lon = parseLatLon(item.longitude);
        if (lat == null || lon == null) {
          return { ...item, parcelSatelliteMapDataUrl: null as string | null };
        }
        const dataUrl = await fetchCenterSatelliteMapDataUrl(lat, lon, mapsApiKey);
        return { ...item, parcelSatelliteMapDataUrl: dataUrl };
      });
    }

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
