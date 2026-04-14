import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { and, arrayContains, asc, desc, eq, gt, gte, ilike, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { favorites, landListings } from "@/db/schema";
import { authOptions } from "@/lib/auth";
import { fetchParcelSatelliteMapDataUrl } from "@/lib/parcel-aerial-map";

const REGRID_POINT_URL = "https://app.regrid.com/api/v2/parcels/point";
/** Max concurrent Regrid calls per request (avoids rate limits and long hangs). */
const REGRID_FETCH_CONCURRENCY = 6;
const STATIC_MAP_FETCH_CONCURRENCY = 4;

function parseNumParam(value: string | null): number | null {
  if (value == null || value.trim() === "") return null;
  const num = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(num) && num >= 0 ? num : null;
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

/**
 * Regrid Parcel API: reverse geocode a point to parcel GeoJSON (FeatureCollection).
 * `listingLat` / `listingLon` must come from `land_listings.latitude` / `land_listings.longitude`
 * on each row returned by the DB query — not from the browser request to this route.
 * (Regrid’s own HTTP API requires lat/lon as query params; that is unrelated to our GET filters.)
 * @see https://support.regrid.com/api/parcel-api-endpoints
 */
async function fetchRegridParcelsAtPoint(
  listingLat: number,
  listingLon: number,
  token: string
): Promise<Record<string, unknown> | null> {
  const url = new URL(REGRID_POINT_URL);
  url.searchParams.set("lat", String(listingLat));
  url.searchParams.set("lon", String(listingLon));
  url.searchParams.set("radius", "250");
  url.searchParams.set("limit", "5");
  url.searchParams.set("token", token);
  url.searchParams.set("return_geometry", "true");

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    return null;
  }
  const data = (await res.json()) as { parcels?: Record<string, unknown> };
  const parcels = data?.parcels;
  if (parcels && typeof parcels === "object" && parcels.type === "FeatureCollection") {
    return parcels;
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const location = searchParams.get("location")?.trim() ?? null;
    const type = searchParams.get("type")?.trim() ?? null;
    const propertyTypes = searchParams.getAll("propertyType").map((s) => s.trim()).filter(Boolean);
    const activities = searchParams.getAll("activity").map((s) => s.trim()).filter(Boolean);
    const minPrice = parseNumParam(searchParams.get("minPrice"));
    const maxPrice = parseNumParam(searchParams.get("maxPrice"));
    const minAcres = parseNumParam(searchParams.get("minAcres"));
    const maxAcres = parseNumParam(searchParams.get("maxAcres"));
    const stateAbbrev = searchParams.get("state")?.trim().toUpperCase() ?? null;
    const county = searchParams.get("county")?.trim() ?? null;
    const sort = (searchParams.get("sort") ?? "default").trim().toLowerCase();

    const conditions = [];

    // Exclude junk/invalid prices (0, 1, 2) from results
    conditions.push(gt(landListings.price, "2"));

    if (type) {
      conditions.push(arrayContains(landListings.propertyType, [type]));
    }
    if (propertyTypes.length > 0) {
      conditions.push(or(...propertyTypes.map((t) => arrayContains(landListings.propertyType, [t])))!);
    }
    if (activities.length > 0) {
      conditions.push(or(...activities.map((a) => arrayContains(landListings.activities, [a])))!);
    }
    if (minPrice != null) {
      conditions.push(gte(landListings.price, String(minPrice)));
    }
    if (maxPrice != null) {
      conditions.push(lte(landListings.price, String(maxPrice)));
    }
    if (minAcres != null) {
      conditions.push(gte(landListings.acres, String(minAcres)));
    }
    if (maxAcres != null) {
      conditions.push(lte(landListings.acres, String(maxAcres)));
    }
    if (stateAbbrev && stateAbbrev.length >= 2) {
      conditions.push(eq(landListings.stateAbbreviation, stateAbbrev));
    }
    if (county && county.length > 0) {
      conditions.push(ilike(landListings.county, county));
    }

    // Location search: match "Dallas, TX" style (autocomplete) and single-field matches.
    // % in ILIKE = "any characters"; e.g. %Dallas% matches "Dallas", "Dallas City".
    // We match: (1) combined "City, ST" / "County, ST", (2) city, state, county, stateName.
    if (location && location.length > 0) {
      const pattern = `%${location}%`;
      conditions.push(
        or(
          sql`(${landListings.city} || ', ' || ${landListings.stateAbbreviation}) ILIKE ${pattern}`,
          sql`(${landListings.county} || ', ' || ${landListings.stateAbbreviation}) ILIKE ${pattern}`,
          ilike(landListings.city, pattern),
          ilike(landListings.stateAbbreviation, pattern),
          ilike(landListings.stateName, pattern),
          ilike(landListings.county, pattern),
        )!
      );
    }

    const pricePerAcreAsc = sql`(${landListings.price}::float / NULLIF(${landListings.acres}::float, 0)) ASC`;
    const pricePerAcreDesc = sql`(${landListings.price}::float / NULLIF(${landListings.acres}::float, 0)) DESC`;

    const orderBy =
      sort === "price-asc"
        ? asc(landListings.price)
        : sort === "price-desc"
          ? desc(landListings.price)
          : sort === "acres-asc"
            ? asc(landListings.acres)
            : sort === "acres-desc"
              ? desc(landListings.acres)
              : sort === "priceperacre-asc"
                ? pricePerAcreAsc
                : sort === "priceperacre-desc"
                  ? pricePerAcreDesc
                  : desc(landListings.listingDate);

    const baseQuery =
      conditions.length > 0
        ? db.select().from(landListings).where(and(...conditions))
        : db.select().from(landListings);
    const rows = await baseQuery.orderBy(orderBy).limit(5);

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

    let list = rows.map((row) => ({
      ...row,
      isFavorite: favoriteIds.has(row.id),
    }));

    // When REGRID_API_TOKEN is set, every listing with coordinates gets a Regrid parcels/point call (batched concurrency below).
    const regridToken = process.env.REGRID_API_TOKEN?.trim();
    if (regridToken) {
      const base = list.map((row) => ({
        ...row,
        regridParcels: null as Record<string, unknown> | null,
      }));
      // Coordinates: only from land_listings rows (schema: latitude, longitude), never from searchParams.
      const enrichedList = await mapPool(base, REGRID_FETCH_CONCURRENCY, async (row) => {
        const lat = parseLatLon(row.latitude);
        const lon = parseLatLon(row.longitude);
        if (lat == null || lon == null) {
          return { ...row, regridParcels: null };
        }
        const parcels = await fetchRegridParcelsAtPoint(lat, lon, regridToken);
        return { ...row, regridParcels: parcels };
      });
      list = enrichedList;
    }

    /** Maps Static API uses a Maps Platform API key, not a service account JSON. */
    const mapsApiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();
    if (mapsApiKey && regridToken) {
      list = await mapPool(list, STATIC_MAP_FETCH_CONCURRENCY, async (row) => {
        const r = row as (typeof row) & {
          regridParcels?: Record<string, unknown> | null;
          parcelSatelliteMapDataUrl?: string | null;
        };
        const lat = parseLatLon(r.latitude);
        const lon = parseLatLon(r.longitude);
        if (!r.regridParcels || lat == null || lon == null) {
          return { ...r, parcelSatelliteMapDataUrl: null };
        }
        const dataUrl = await fetchParcelSatelliteMapDataUrl(r.regridParcels, lat, lon, mapsApiKey);
        return { ...r, parcelSatelliteMapDataUrl: dataUrl };
      });
    }

    return NextResponse.json(list);
  } catch (error) {
    console.error("Land location search API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch listings" },
      { status: 500 }
    );
  }
}
