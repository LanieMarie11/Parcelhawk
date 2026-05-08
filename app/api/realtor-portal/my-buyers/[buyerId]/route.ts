import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { and, desc, eq, gt, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  buyerInvestorLinks,
  favorites,
  landListings,
  messageThreads,
  messages,
  savedSearches,
  users,
  viewingRequests,
} from "@/db/schema";
import { authOptions } from "@/lib/auth";
import { fetchCenterSatelliteMapDataUrl } from "@/lib/parcel-aerial-map";

type SessionUser = {
  id?: string;
  role?: string;
};

const STATIC_MAP_FETCH_CONCURRENCY = 4;

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

function formatPrice(value: string | null): string {
  if (!value) return "-";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "-";
  return `$${Math.round(amount).toLocaleString("en-US")}`;
}

function formatAcreage(value: string | null): string {
  if (!value) return "-";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "-";
  return `${amount} ac`;
}

function buildSubtitle(city: string | null, state: string | null): string {
  return [city, state].filter(Boolean).join(", ") || "Location unavailable";
}

export async function GET(_: Request, { params }: { params: Promise<{ buyerId: string }> }) {
  const session = await getServerSession(authOptions);
  const sessionUser = (session?.user as SessionUser | undefined) ?? {};
  const investorId = sessionUser.id;
  const { buyerId } = await params;

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

    const favoriteRows = await db
      .select({
        favoriteId: favorites.id,
        listingId: landListings.id,
        photo: landListings.photos,
        url: landListings.url,
        price: landListings.price,
        city: landListings.city,
        state: landListings.stateAbbreviation,
        address: landListings.address1,
        acreage: landListings.acres,
        latitude: landListings.latitude,
        longitude: landListings.longitude,
      })
      .from(favorites)
      .innerJoin(landListings, eq(landListings.id, favorites.landListingId))
      .where(eq(favorites.userId, buyerId))
      .orderBy(desc(favorites.createdAt));

    const viewingRequestRowsForSavedProperties = await db
      .select({
        listingId: viewingRequests.listingId,
        status: viewingRequests.status,
        updatedAt: viewingRequests.updatedAt,
      })
      .from(viewingRequests)
      .where(and(eq(viewingRequests.realtorId, investorId), eq(viewingRequests.buyerId, buyerId)))
      .orderBy(desc(viewingRequests.updatedAt));

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

    const mapsApiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();
    const savedProperties = await mapPool(favoriteRows, STATIC_MAP_FETCH_CONCURRENCY, async (fav) => {
      let thumbnailSrc = fav.photo?.[0] ?? "";
      if (mapsApiKey) {
        const lat = parseLatLon(fav.latitude);
        const lon = parseLatLon(fav.longitude);
        if (lat != null && lon != null) {
          const dataUrl = await fetchCenterSatelliteMapDataUrl(lat, lon, mapsApiKey);
          if (dataUrl) thumbnailSrc = dataUrl;
        }
      }
      return {
        id: fav.favoriteId,
        thumbnailSrc,
        url: fav.url ?? undefined,
        price: formatPrice(fav.price),
        subtitle: buildSubtitle(fav.city, fav.state),
        address: fav.address ?? `Listing #${fav.listingId}`,
        acreageLabel: formatAcreage(fav.acreage),
        viewingRequest: viewingStatusByListingId.get(fav.listingId) ?? "none",
      };
    });
    const savedPropertiesCount = savedProperties.length;

    const [savedSearchesResult] = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(savedSearches)
      .where(eq(savedSearches.userId, buyerId));
    const savedSearchesCount = Number(savedSearchesResult?.count ?? 0);

    const [messageUnreadResult] = await db
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
      );

    const [viewingRequestUnreadResult] = await db
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
          or(
            isNull(messageThreads.investorLastReadAt),
            gt(viewingRequests.createdAt, messageThreads.investorLastReadAt),
          ),
        ),
      );

    const unreadMessages =
      Number(messageUnreadResult?.unreadCount ?? 0) + Number(viewingRequestUnreadResult?.unreadCount ?? 0);

    const viewingRequestRows = await db
      .select({
        status: viewingRequests.status,
        count: sql<number>`count(*)`,
      })
      .from(viewingRequests)
      .where(and(eq(viewingRequests.realtorId, investorId), eq(viewingRequests.buyerId, buyerId)))
      .groupBy(viewingRequests.status);

    const viewingRequestSummary = { pending: 0, scheduled: 0, completed: 0 };
    for (const row of viewingRequestRows) {
      const count = Number(row.count ?? 0);
      if (row.status === "pending") viewingRequestSummary.pending = count;
      if (row.status === "scheduled") viewingRequestSummary.scheduled = count;
      if (row.status === "completed") viewingRequestSummary.completed = count;
    }

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
      activity: [],
    };

    return NextResponse.json({ buyer });
  } catch (error) {
    console.error("Realtor my-buyers detail fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch buyer detail" }, { status: 500 });
  }
}
