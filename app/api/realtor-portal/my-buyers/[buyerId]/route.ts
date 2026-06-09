import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { and, desc, eq, gt, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  buyerInvestorLinks,
  favorites,
  landUpdatedListings,
  messageThreads,
  messages,
  savedSearches,
  users,
  viewingRequests,
} from "@/db/schema";
import { authOptions } from "@/lib/auth";

type SessionUser = {
  id?: string;
  role?: string;
};

function coords(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function formatPrice(value: string | null): string {
  if (!value) return "-";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "-";
  return `$${Math.round(amount).toLocaleString("en-US")}`;
}

function formatAcreage(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "-";
  return `${value} ac`;
}

function buildSubtitle(city: string | null, state: string | null): string {
  return [city, state].filter(Boolean).join(", ") || "Location unavailable";
}

export async function GET(request: Request, { params }: { params: Promise<{ buyerId: string }> }) {
  const session = await getServerSession(authOptions);
  const sessionUser = (session?.user as SessionUser | undefined) ?? {};
  const investorId = sessionUser.id;
  const { buyerId } = await params;
  const detailLevel = new URL(request.url).searchParams.get("detailLevel") === "core" ? "core" : "full";

  if (!investorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (sessionUser.role !== "investor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!buyerId) {
    return NextResponse.json({ error: "Buyer id is required" }, { status: 400 });
  }

  try {
    const [row] = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phone: users.phone,
        location: users.location,
        preferenceBudget: users.preferenceBudget,
        preferenceAcreage: users.preferenceAcreage,
        preferencePurpose: users.preferencePurpose,
        preferenceTimeframe: users.preferenceTimeframe,
        lastActiveAt: users.lastActiveAt,
      })
      .from(buyerInvestorLinks)
      .innerJoin(users, eq(users.id, buyerInvestorLinks.buyerId))
      .where(
        and(
          eq(buyerInvestorLinks.investorId, investorId),
          eq(buyerInvestorLinks.buyerId, buyerId),
          eq(buyerInvestorLinks.status, "active"),
        ),
      )
      .limit(1);

    if (!row) {
      return NextResponse.json({ error: "Buyer not found" }, { status: 404 });
    }

    const [messageUnreadResult, viewingRequestUnreadResult, viewingRequestRows] = await Promise.all([
      db
        .select({
          unreadCount: sql<number>`count(*)`,
        })
        .from(messages)
        .innerJoin(messageThreads, eq(messages.threadId, messageThreads.id))
        .where(
          and(
            eq(messageThreads.investorId, investorId),
            eq(messageThreads.buyerUserId, buyerId),
            eq(messages.senderRole, "buyer"),
            or(isNull(messageThreads.investorLastReadAt), gt(messages.createdAt, messageThreads.investorLastReadAt)),
          ),
        ),
      db
        .select({
          unreadCount: sql<number>`count(*)`,
        })
        .from(viewingRequests)
        .innerJoin(
          messageThreads,
          and(eq(messageThreads.investorId, investorId), eq(viewingRequests.buyerId, messageThreads.buyerUserId)),
        )
        .where(
          and(
            eq(viewingRequests.realtorId, investorId),
            eq(viewingRequests.buyerId, buyerId),
            or(isNull(messageThreads.investorLastReadAt), gt(viewingRequests.createdAt, messageThreads.investorLastReadAt)),
          ),
        ),
      db
        .select({
          status: viewingRequests.status,
          count: sql<number>`count(*)`,
        })
        .from(viewingRequests)
        .where(and(eq(viewingRequests.realtorId, investorId), eq(viewingRequests.buyerId, buyerId)))
        .groupBy(viewingRequests.status),
    ]);

    const unreadMessages =
      Number(messageUnreadResult?.[0]?.unreadCount ?? 0) + Number(viewingRequestUnreadResult?.[0]?.unreadCount ?? 0);

    const viewingRequestSummary = { pending: 0, scheduled: 0, completed: 0 };
    for (const row of viewingRequestRows) {
      const count = Number(row.count ?? 0);
      if (row.status === "pending") viewingRequestSummary.pending = count;
      if (row.status === "scheduled") viewingRequestSummary.scheduled = count;
      if (row.status === "completed") viewingRequestSummary.completed = count;
    }

    if (detailLevel === "core") {
      const [savedPropertiesCountResult, savedSearchesCountResult] = await Promise.all([
        db
          .select({
            count: sql<number>`count(*)`,
          })
          .from(favorites)
          .where(eq(favorites.userId, buyerId)),
        db
          .select({
            count: sql<number>`count(*)`,
          })
          .from(savedSearches)
          .where(eq(savedSearches.userId, buyerId)),
      ]);

      const buyer = {
        id: row.id,
        name: [row.firstName, row.lastName].filter(Boolean).join(" ").trim() || "Unknown buyer",
        email: row.email,
        phone: row.phone ?? "",
        location: row.location ?? "",
        lastActiveAt: row.lastActiveAt ? row.lastActiveAt.toISOString() : "",
        preferenceBudget: row.preferenceBudget ?? "",
        preferenceAcreage: row.preferenceAcreage ?? "",
        preferencePurpose: row.preferencePurpose ?? "",
        preferenceTimeframe: row.preferenceTimeframe ?? "",
        unreadMessages,
        viewingRequests: viewingRequestSummary,
        savedPropertiesCount: Number(savedPropertiesCountResult?.[0]?.count ?? 0),
        savedSearches: Number(savedSearchesCountResult?.[0]?.count ?? 0),
        savedProperties: [],
        activity: [],
      };

      return NextResponse.json({ buyer, detailLevel });
    }

    const favoriteRows = await db
      .select({
        favoriteId: favorites.id,
        listingId: landUpdatedListings.id,
        createdAt: favorites.createdAt,
        url: landUpdatedListings.url,
        price: landUpdatedListings.price,
        city: landUpdatedListings.city,
        state: landUpdatedListings.stateAbbreviation,
        address: landUpdatedListings.address1,
        acreage: landUpdatedListings.acres,
        latitude: landUpdatedListings.latitude,
        longitude: landUpdatedListings.longitude,
      })
      .from(favorites)
      .innerJoin(landUpdatedListings, eq(landUpdatedListings.id, favorites.landListingId))
      .where(eq(favorites.userId, buyerId))
      .orderBy(desc(favorites.createdAt));

    const [viewingRequestRowsForSavedProperties, viewingRequestActivityRows, savedSearchRows] = await Promise.all([
      db
        .select({
          listingId: viewingRequests.listingId,
          status: viewingRequests.status,
          updatedAt: viewingRequests.updatedAt,
        })
        .from(viewingRequests)
        .where(and(eq(viewingRequests.realtorId, investorId), eq(viewingRequests.buyerId, buyerId)))
        .orderBy(desc(viewingRequests.updatedAt)),
      db
        .select({
          id: viewingRequests.id,
          listingId: viewingRequests.listingId,
          status: viewingRequests.status,
          createdAt: viewingRequests.createdAt,
        })
        .from(viewingRequests)
        .where(and(eq(viewingRequests.realtorId, investorId), eq(viewingRequests.buyerId, buyerId)))
        .orderBy(desc(viewingRequests.createdAt)),
      db
        .select({
          id: savedSearches.id,
          name: savedSearches.name,
          createdAt: savedSearches.createdAt,
        })
        .from(savedSearches)
        .where(eq(savedSearches.userId, buyerId)),
    ]);

    const viewingStatusByListingId = new Map<number, "pending" | "scheduled" | "completed" | "none">();
    for (const row of viewingRequestRowsForSavedProperties) {
      const listingId = row.listingId;
      if (viewingStatusByListingId.has(listingId)) continue;
      if (row.status === "pending" || row.status === "scheduled" || row.status === "completed") {
        viewingStatusByListingId.set(listingId, row.status);
      } else {
        viewingStatusByListingId.set(listingId, "none");
      }
    }

    const savedProperties = favoriteRows.map((fav) => ({
      id: String(fav.favoriteId),
      thumbnailSrc: "",
      url: fav.url ?? undefined,
      price: formatPrice(fav.price),
      subtitle: buildSubtitle(fav.city, fav.state),
      address: fav.address ?? `Listing #${fav.listingId}`,
      acreageLabel: formatAcreage(fav.acreage),
      viewingRequest: viewingStatusByListingId.get(fav.listingId) ?? "none",
      latitude: coords(fav.latitude),
      longitude: coords(fav.longitude),
    }));
    const savedPropertiesCount = savedProperties.length;
    const savedSearchesCount = savedSearchRows.length;

    const activity = [
      ...favoriteRows.map((fav) => ({
        id: `favorite:${fav.favoriteId}`,
        kind: "saved" as const,
        text: `Saved property in ${buildSubtitle(fav.city, fav.state)}`,
        createdAt: fav.createdAt,
      })),
      ...savedSearchRows.map((savedSearch) => ({
        id: `search:${savedSearch.id}`,
        kind: "searched" as const,
        text: `Saved search: ${savedSearch.name}`,
        createdAt: savedSearch.createdAt,
      })),
      ...viewingRequestActivityRows.map((request) => ({
        id: `viewing-request:${request.id}`,
        kind: "viewed" as const,
        text: `Viewing request ${request.status} for listing #${request.listingId}`,
        createdAt: request.createdAt,
      })),
    ]
      .sort((a, b) => {
        const aTime = a.createdAt ? a.createdAt.getTime() : 0;
        const bTime = b.createdAt ? b.createdAt.getTime() : 0;
        return bTime - aTime;
      })
      .map((item) => ({
        id: item.id,
        kind: item.kind,
        text: item.text,
        when: item.createdAt?.toISOString() ?? "",
      }));

    const buyer = {
      id: row.id,
      name: [row.firstName, row.lastName].filter(Boolean).join(" ").trim() || "Unknown buyer",
      email: row.email,
      phone: row.phone ?? "",
      location: row.location ?? "",
      lastActiveAt: row.lastActiveAt ? row.lastActiveAt.toISOString() : "",
      preferenceBudget: row.preferenceBudget ?? "",
      preferenceAcreage: row.preferenceAcreage ?? "",
      preferencePurpose: row.preferencePurpose ?? "",
      preferenceTimeframe: row.preferenceTimeframe ?? "",
      unreadMessages,
      viewingRequests: viewingRequestSummary,
      savedPropertiesCount,
      savedSearches: savedSearchesCount,
      savedProperties,
      activity,
    };

    return NextResponse.json({ buyer, detailLevel: "full" });
  } catch (error) {
    console.error("Realtor my-buyers detail fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch buyer detail" }, { status: 500 });
  }
}
