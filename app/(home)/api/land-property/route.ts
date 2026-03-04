import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { and, arrayContains, desc, eq, gte, lte, or } from "drizzle-orm";
import { db } from "@/db";
import { favorites, landListings } from "@/db/schema";
import { authOptions } from "@/lib/auth";

function parseNumParam(value: string | null): number | null {
  if (value == null || value.trim() === "") return null;
  const num = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(num) && num >= 0 ? num : null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const type = searchParams.get("type")?.trim() ?? null;
    const propertyTypes = searchParams.getAll("propertyType").map((s) => s.trim()).filter(Boolean);
    const activities = searchParams.getAll("activity").map((s) => s.trim()).filter(Boolean);
    const minPrice = parseNumParam(searchParams.get("minPrice"));
    const maxPrice = parseNumParam(searchParams.get("maxPrice"));
    const minAcres = parseNumParam(searchParams.get("minAcres"));
    const maxAcres = parseNumParam(searchParams.get("maxAcres"));

    const conditions = [];
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

    const rows =
      conditions.length > 0
        ? await db
            .select()
            .from(landListings)
            .where(and(...conditions))
            .orderBy(desc(landListings.listingDate))
            .limit(100)
        : await db.select().from(landListings).orderBy(desc(landListings.listingDate)).limit(8);

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

    const list = rows.map((row) => ({
      ...row,
      isFavorite: favoriteIds.has(row.id),
    }));

    return NextResponse.json(list);
  } catch (error) {
    console.error("Land Property API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch listings" },
      { status: 500 }
    );
  }
}
