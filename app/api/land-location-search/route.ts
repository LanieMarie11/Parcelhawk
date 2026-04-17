import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { and, arrayContains, asc, desc, eq, gt, gte, ilike, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { favorites, landListings } from "@/db/schema";
import { authOptions } from "@/lib/auth";
import { fetchCenterSatelliteMapDataUrl } from "@/lib/parcel-aerial-map";

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

    const mapsApiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();
    if (mapsApiKey) {
      list = await mapPool(list, STATIC_MAP_FETCH_CONCURRENCY, async (row) => {
        const lat = parseLatLon(row.latitude);
        const lon = parseLatLon(row.longitude);
        if (lat == null || lon == null) {
          return { ...row, parcelSatelliteMapDataUrl: null };
        }
        const dataUrl = await fetchCenterSatelliteMapDataUrl(lat, lon, mapsApiKey);
        return { ...row, parcelSatelliteMapDataUrl: dataUrl };
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
