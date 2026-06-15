import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { and, asc, desc, eq, gt, gte, ilike, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { favorites, mergedListings, users } from "@/db/schema";
import { authOptions } from "@/lib/auth";
import { getBuyerViewingRequestListingIds } from "@/lib/get-buyer-viewing-request-listing-ids";
import {
  PREFERENCE_ACREAGE_TO_RANGE,
  PREFERENCE_BUDGET_TO_RANGE,
} from "@/lib/land-preference-buckets";
import { jsonbArrayContains } from "@/lib/land-updated-listing-filters";

function parseNumParam(value: string | null): number | null {
  if (value == null || value.trim() === "") return null;
  const num = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(num) && num >= 0 ? num : null;
}

function parsePositiveIntParam(
  value: string | null,
  fallback: number,
  { min = 1, max }: { min?: number; max?: number } = {}
): number {
  if (value == null || value.trim() === "") return fallback;
  const num = Number(value);
  if (!Number.isInteger(num) || num < min) return fallback;
  if (max != null && num > max) return max;
  return num;
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
    const page = parsePositiveIntParam(searchParams.get("page"), 1);
    const limit = parsePositiveIntParam(searchParams.get("limit"), 20, { max: 100 });
    const offset = (page - 1) * limit;

    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id ?? null;

    const conditions = [];

    // Exclude junk/invalid prices (0, 1, 2) from results
    conditions.push(gt(mergedListings.price, "2"));

    if (type) {
      conditions.push(jsonbArrayContains(mergedListings.propertyType, type));
    }
    // if (propertyTypes.length > 0) {
    //   conditions.push(or(...propertyTypes.map((t) => arrayContains(mergedListings.propertyType, [t])))!);
    // }
    // if (activities.length > 0) {
    //   conditions.push(or(...activities.map((a) => arrayContains(mergedListings.activities, [a])))!);
    // }
    if (minPrice != null) {
      conditions.push(gte(mergedListings.price, String(minPrice)));
    }
    if (maxPrice != null) {
      conditions.push(lte(mergedListings.price, String(maxPrice)));
    }
    if (minAcres != null) {
      conditions.push(gte(mergedListings.acres, minAcres));
    }
    if (maxAcres != null) {
      conditions.push(lte(mergedListings.acres, maxAcres));
    }

    // When the client sends no min/max for price or acres, apply signed-in user profile preferences.
    if (
      userId &&
      ((minPrice == null && maxPrice == null) && (minAcres == null && maxAcres == null))
    ) {
      const needBudgetFromUser = minPrice == null && maxPrice == null;
      const needAcresFromUser = minAcres == null && maxAcres == null;
      if (needBudgetFromUser || needAcresFromUser) {
        const [u] = await db
          .select({
            preferenceBudget: users.preferenceBudget,
            preferenceAcreage: users.preferenceAcreage,
          })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);
        if (needBudgetFromUser && u?.preferenceBudget) {
          const br = PREFERENCE_BUDGET_TO_RANGE[u.preferenceBudget];
          if (br) {
            conditions.push(gte(mergedListings.price, String(br.min)));
            if (br.max != null) {
              conditions.push(lte(mergedListings.price, String(br.max)));
            }
          }
        }
        if (needAcresFromUser && u?.preferenceAcreage) {
          const ar = PREFERENCE_ACREAGE_TO_RANGE[u.preferenceAcreage];
          if (ar) {
            conditions.push(gte(mergedListings.acres, ar.min));
            if (ar.max != null) {
              conditions.push(lte(mergedListings.acres, ar.max));
            }
          }
        }
      }
    }

    if (stateAbbrev && stateAbbrev.length >= 2) {
      conditions.push(eq(mergedListings.stateAbbreviation, stateAbbrev));
    }
    if (county && county.length > 0) {
      conditions.push(ilike(mergedListings.county, county));
    }

    // Location search: match "Dallas, TX" style (autocomplete) and single-field matches.
    // % in ILIKE = "any characters"; e.g. %Dallas% matches "Dallas", "Dallas City".
    // We match: (1) combined "City, ST" / "County, ST", (2) city, state, county, stateName.
    if (location && location.length > 0) {
      const pattern = `%${location}%`;
      conditions.push(
        or(
          sql`(${mergedListings.city} || ', ' || ${mergedListings.stateAbbreviation}) ILIKE ${pattern}`,
          sql`(${mergedListings.county} || ', ' || ${mergedListings.stateAbbreviation}) ILIKE ${pattern}`,
          ilike(mergedListings.city, pattern),
          ilike(mergedListings.stateAbbreviation, pattern),
          ilike(mergedListings.stateName, pattern),
          ilike(mergedListings.county, pattern),
        )!
      );
    }

    const pricePerAcreAsc = sql`(${mergedListings.price}::float / NULLIF(${mergedListings.acres}::float, 0)) ASC`;
    const pricePerAcreDesc = sql`(${mergedListings.price}::float / NULLIF(${mergedListings.acres}::float, 0)) DESC`;

    const orderBy =
      sort === "price-asc"
        ? asc(mergedListings.price)
        : sort === "price-desc"
          ? desc(mergedListings.price)
          : sort === "acres-asc"
            ? asc(mergedListings.acres)
            : sort === "acres-desc"
              ? desc(mergedListings.acres)
              : sort === "priceperacre-asc"
                ? pricePerAcreAsc
                : sort === "priceperacre-desc"
                  ? pricePerAcreDesc
                  : desc(mergedListings.listedDate);

    const filteredSelect =
      conditions.length > 0
        ? db.select().from(mergedListings).where(and(...conditions))
        : db.select().from(mergedListings);
    const countSelect =
      conditions.length > 0
        ? db
            .select({ totalListingsNumber: sql<number>`count(*)::int` })
            .from(mergedListings)
            .where(and(...conditions))
        : db.select({ totalListingsNumber: sql<number>`count(*)::int` }).from(mergedListings);

    const [rows, countRows] = await Promise.all([
      filteredSelect.orderBy(orderBy).limit(limit).offset(offset),
      countSelect,
    ]);
    const totalListingsNumber = Number(countRows[0]?.totalListingsNumber ?? 0);

    let favoriteIds = new Set<number>();
    let viewingRequestListingIds = new Set<number>();
    if (userId) {
      const listingIds = rows.map((row) => row.id);
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

    const list = rows.map((row) => ({
      ...row,
      isFavorite: favoriteIds.has(row.id),
      hasViewingRequest: viewingRequestListingIds.has(row.id),
    }));

    return NextResponse.json({ listings: list, totalListingsNumber });
  } catch (error) {
    console.error("Land location search API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch listings" },
      { status: 500 }
    );
  }
}
