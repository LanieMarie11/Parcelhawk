import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { favorites, landListings } from "@/db/schema";
import { authOptions } from "@/lib/auth";
import { getEmbedding } from "@/lib/embedding";

const EMBEDDING_SEARCH_LIMIT = 100;

/**
 * POST: prompt-only embedding search. No other filters.
 * Body: { prompt: string }
 * Returns listings ordered by description similarity (same shape as land-location-search).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
    if (!prompt) {
      return NextResponse.json({ error: "Missing or empty prompt" }, { status: 400 });
    }
//TODO: Have to update this for SQL search
    const embedding = await getEmbedding(prompt);
    console.log("embedding", embedding);
    const vectorStr = "[" + embedding.join(",") + "]";
    const rows = (await db.execute(
      sql`SELECT listing_id FROM land_listing_embeddings ORDER BY embedding <=> ${vectorStr}::vector LIMIT ${EMBEDDING_SEARCH_LIMIT}`
    )) as { listing_id: number }[];
    const listingIds = rows.map((r) => r.listing_id);
    if (listingIds.length === 0) {
      const list: unknown[] = [];
      return NextResponse.json(list);
    }
// TODO: Have to update this for SQL search
    // Fetch full listings in the same order as vector search (by id order).
    const listings = await db
      .select()
      .from(landListings)
      .where(inArray(landListings.id, listingIds));

    const orderMap = new Map(listingIds.map((id, i) => [id, i]));
    const sorted = [...listings].sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));

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

    const list = sorted.map((row) => ({
      ...row,
      isFavorite: favoriteIds.has(row.id),
    }));

    return NextResponse.json(list);
  } catch (error) {
    console.error("Embedding search API error:", error);
    return NextResponse.json(
      { error: "Embedding search failed" },
      { status: 500 }
    );
  }
}
