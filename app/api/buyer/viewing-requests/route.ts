import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { and, eq } from "drizzle-orm"
import { db } from "@/db"
import {
  favorites,
  investors,
  landListings,
  notifications,
  users,
  viewingRequests,
} from "@/db/schema"
import { authOptions } from "@/lib/auth"
import { ensureActiveRealtorInvestorId } from "@/lib/buyer-investor-connection"
import { sendViewingRequestCreatedNotification } from "@/lib/email/send-viewing-request-notification"

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
    const realtorId = await ensureActiveRealtorInvestorId(buyerId)

    if (!realtorId) {
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
// TODO : check this with client.
    // if (!favRow) {
    //   return NextResponse.json(
    //     { error: "You can only request a viewing for a listing in your favorites" },
    //     { status: 403 }
    //   )
    // }

    const [listingRow] = await db
      .select({
        id: landListings.id,
        title: landListings.title,
        address1: landListings.address1,
        city: landListings.city,
        stateAbbreviation: landListings.stateAbbreviation,
      })
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
        realtorId,
        listingId,
        buyerNote,
      })
      .returning({ id: viewingRequests.id })

    if (!inserted) {
      return NextResponse.json({ error: "Failed to create viewing request" }, { status: 500 })
    }

    const listingTitle = listingRow.title?.trim() || null
    await db.insert(notifications).values({
      type: "viewing_request",
      userId: buyerId,
      investorId: realtorId,
      listingId,
      viewingRequestId: inserted.id,
      title: "Viewing request submitted",
      body: listingTitle
        ? `Your viewing request for ${listingTitle} has been sent to your realtor.`
        : "Your viewing request has been sent to your realtor.",
      metadata: {
        type: "viewing-requests",
        sender: "buyer",
        status: "pending",
        listingId,
        listingTitle: listingTitle ?? undefined,
      },
    })

    const locationParts = [
      listingRow.address1,
      listingRow.city,
      listingRow.stateAbbreviation,
    ].filter((p): p is string => typeof p === "string" && p.trim().length > 0)
    const listingLocation =
      locationParts.length > 0 ? locationParts.map((p) => p.trim()).join(", ") : null

    const [[buyerNameRow], [realtorNameRow]] = await Promise.all([
      db
        .select({ firstName: users.firstName, lastName: users.lastName })
        .from(users)
        .where(eq(users.id, buyerId))
        .limit(1),
      db
        .select({
          firstName: investors.firstName,
          lastName: investors.lastName,
          email: investors.email,
        })
        .from(investors)
        .where(eq(investors.id, realtorId))
        .limit(1),
    ])

    const formatPersonName = (
      row: { firstName: string; lastName: string } | undefined
    ) => {
      if (!row) return "(unknown)"
      const name = `${row.firstName} ${row.lastName}`.trim()
      return name.length > 0 ? name : "(unknown)"
    }

    const realtorEmail = realtorNameRow?.email?.trim() ?? ""

    await sendViewingRequestCreatedNotification({
      viewingRequestId: inserted.id,
      listingId,
      listingTitle: listingRow.title,
      listingLocation,
      buyerName: formatPersonName(buyerNameRow),
      realtorName: formatPersonName(realtorNameRow),
      realtorEmail,
      buyerNote,
    })

    return NextResponse.json({ id: inserted.id })
  } catch (err) {
    console.error("Viewing request POST error:", err)
    return NextResponse.json({ error: "Failed to create viewing request" }, { status: 500 })
  }
}
