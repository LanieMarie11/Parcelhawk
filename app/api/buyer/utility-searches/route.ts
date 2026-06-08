import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { favorites, landListings } from "@/db/schema";
import { authOptions } from "@/lib/auth";

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
      .select({ id: landListings.id })
      .from(landListings)
      .where(eq(landListings.id, listingId))
      .limit(1);

    if (!listingRow) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    

    return NextResponse.json({ ok: true, listingId });
  } catch (err) {
    console.error("Utility search POST error:", err);
    return NextResponse.json({ error: "Failed to submit utility search request" }, { status: 500 });
  }
}
