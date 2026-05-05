import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { and, desc, eq } from "drizzle-orm"
import { db } from "@/db"
import {
  buyerInvestorLinks,
  favorites,
  landListings,
  viewingRequests,
} from "@/db/schema"
import { authOptions } from "@/lib/auth"

type SessionUser = {
  id?: string
  role?: string
}

const BUYER_NOTE_MAX = 2000

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  const sessionUser = (session?.user as SessionUser | undefined) ?? {}
  const buyerId = sessionUser.id

  if (!buyerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (sessionUser.role !== "buyer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let body: { listingId?: unknown; buyerNote?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const listingIdRaw = body.listingId
  const listingId =
    typeof listingIdRaw === "number" && Number.isInteger(listingIdRaw) && listingIdRaw > 0
      ? listingIdRaw
      : typeof listingIdRaw === "string" && /^\d+$/.test(listingIdRaw.trim())
        ? Number.parseInt(listingIdRaw.trim(), 10)
        : null

  if (listingId == null) {
    return NextResponse.json({ error: "listingId is required" }, { status: 400 })
  }

  let buyerNote: string | null = null
  if (body.buyerNote != null) {
    if (typeof body.buyerNote !== "string") {
      return NextResponse.json({ error: "buyerNote must be a string" }, { status: 400 })
    }
    const trimmed = body.buyerNote.trim()
    if (trimmed.length > BUYER_NOTE_MAX) {
      return NextResponse.json(
        { error: `buyerNote must be at most ${BUYER_NOTE_MAX} characters` },
        { status: 400 }
      )
    }
    buyerNote = trimmed.length > 0 ? trimmed : null
  }

  try {
    const [linkRow] = await db
      .select({ investorId: buyerInvestorLinks.investorId })
      .from(buyerInvestorLinks)
      .where(
        and(
          eq(buyerInvestorLinks.buyerId, buyerId),
          eq(buyerInvestorLinks.status, "active"),
          eq(buyerInvestorLinks.realtorFlag, "active")
        )
      )
      .orderBy(desc(buyerInvestorLinks.linkedAt))
      .limit(1)

    if (!linkRow) {
      return NextResponse.json(
        { error: "No active realtor is linked to your account" },
        { status: 409 }
      )
    }

    const [favRow] = await db
      .select({ id: favorites.id })
      .from(favorites)
      .where(and(eq(favorites.userId, buyerId), eq(favorites.landListingId, listingId)))
      .limit(1)

    if (!favRow) {
      return NextResponse.json(
        { error: "You can only request a viewing for a listing in your favorites" },
        { status: 403 }
      )
    }

    const [listingRow] = await db
      .select({ id: landListings.id })
      .from(landListings)
      .where(eq(landListings.id, listingId))
      .limit(1)

    if (!listingRow) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 })
    }

    const [inserted] = await db
      .insert(viewingRequests)
      .values({
        buyerId,
        realtorId: linkRow.investorId,
        listingId,
        buyerNote,
      })
      .returning({ id: viewingRequests.id })

    if (!inserted) {
      return NextResponse.json({ error: "Failed to create viewing request" }, { status: 500 })
    }

    return NextResponse.json({ id: inserted.id })
  } catch (err) {
    console.error("Viewing request POST error:", err)
    return NextResponse.json({ error: "Failed to create viewing request" }, { status: 500 })
  }
}
