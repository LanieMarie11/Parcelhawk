import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  buyerInvestorLinks,
  favorites,
  messageThreads,
  messages,
  savedSearches,
  users,
  viewingRequests,
} from "@/db/schema";
import { authOptions } from "@/lib/auth";

/** Only events on or after this rolling window are loaded (trend chart, counts, totals). */
const ANALYTICS_LOOKBACK_DAYS = 30;

type SessionUser = {
  id?: string;
  role?: string;
};

type AnalyticsBuyer = {
  id: string;
  lastActiveAt: string;
  viewingRequestCount: number;
};

type WeeklyTrendPoint = {
  week: string;
  searches: number;
  saves: number;
  viewingRequests: number;
  messages: number;
};

/** Same 7-day bands as the chart: Week 4 = last 7d, … Week 1 = 22–28d ago (older → bucket 0). */
function weekBucketIndexFromEventTime(eventMs: number, nowMs: number): number {
  const dayMs = 86_400_000;
  const dayDiff = Number.isFinite(eventMs) ? Math.max(0, Math.floor((nowMs - eventMs) / dayMs)) : 27;
  return dayDiff <= 6 ? 3 : dayDiff <= 13 ? 2 : dayDiff <= 20 ? 1 : 0;
}

function buildWeeklyTrendData(
  savedSearchCreatedAts: Date[],
  favoriteCreatedAts: Date[],
  messageCreatedAts: Date[],
  viewingRequestCreatedAts: Date[],
): WeeklyTrendPoint[] {
  const points: WeeklyTrendPoint[] = [
    { week: "Week 1", searches: 0, saves: 0, viewingRequests: 0, messages: 0 },
    { week: "Week 2", searches: 0, saves: 0, viewingRequests: 0, messages: 0 },
    { week: "Week 3", searches: 0, saves: 0, viewingRequests: 0, messages: 0 },
    { week: "Week 4", searches: 0, saves: 0, viewingRequests: 0, messages: 0 },
  ];

  const now = Date.now();

  for (const createdAt of savedSearchCreatedAts) {
    const idx = weekBucketIndexFromEventTime(createdAt.getTime(), now);
    points[idx].searches += 1;
  }

  for (const createdAt of favoriteCreatedAts) {
    const idx = weekBucketIndexFromEventTime(createdAt.getTime(), now);
    points[idx].saves += 1;
  }

  for (const createdAt of messageCreatedAts) {
    const idx = weekBucketIndexFromEventTime(createdAt.getTime(), now);
    points[idx].messages += 1;
  }

  for (const createdAt of viewingRequestCreatedAts) {
    const idx = weekBucketIndexFromEventTime(createdAt.getTime(), now);
    points[idx].viewingRequests += 1;
  }

  return points;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const sessionUser = (session?.user as SessionUser | undefined) ?? {};
  const investorId = sessionUser.id;

  if (!investorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (sessionUser.role !== "investor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const dayMs = 86_400_000;
    const analyticsWindowStart = new Date(Date.now() - ANALYTICS_LOOKBACK_DAYS * dayMs);

    const buyerRows = await db
      .select({
        buyerId: users.id,
        lastActiveAt: users.lastActiveAt,
        updatedAt: users.updatedAt,
      })
      .from(buyerInvestorLinks)
      .innerJoin(users, eq(users.id, buyerInvestorLinks.buyerId))
      .where(and(eq(buyerInvestorLinks.investorId, investorId), eq(buyerInvestorLinks.status, "active")))
      .groupBy(users.id, users.lastActiveAt, users.updatedAt);

    const uniqueBuyerIds = [...new Set(buyerRows.map((buyer) => buyer.buyerId))];
    const viewingCountRows =
      uniqueBuyerIds.length === 0
        ? []
        : await db
            .select({
              buyerId: viewingRequests.buyerId,
              viewingRequestCount: sql<number>`count(*)::int`,
            })
            .from(viewingRequests)
            .where(
              and(
                eq(viewingRequests.realtorId, investorId),
                inArray(viewingRequests.buyerId, uniqueBuyerIds),
                gte(viewingRequests.createdAt, analyticsWindowStart),
              ),
            )
            .groupBy(viewingRequests.buyerId);

    const viewingCountByBuyer = new Map(
      viewingCountRows.map((row) => [row.buyerId, Number(row.viewingRequestCount ?? 0)]),
    );

    const buyers: AnalyticsBuyer[] = buyerRows.map((buyer) => ({
      id: buyer.buyerId,
      lastActiveAt: (buyer.lastActiveAt ?? buyer.updatedAt).toISOString(),
      viewingRequestCount: viewingCountByBuyer.get(buyer.buyerId) ?? 0,
    }));

    const [savedSearchRows, favoriteRows, messageRows, viewingRequestTrendRows] =
      uniqueBuyerIds.length === 0
        ? [[], [], [], []]
        : await Promise.all([
            db
              .select({ createdAt: savedSearches.createdAt })
              .from(savedSearches)
              .where(
                and(inArray(savedSearches.userId, uniqueBuyerIds), gte(savedSearches.createdAt, analyticsWindowStart)),
              ),
            db
              .select({ createdAt: favorites.createdAt })
              .from(favorites)
              .where(
                and(inArray(favorites.userId, uniqueBuyerIds), gte(favorites.createdAt, analyticsWindowStart)),
              ),
            db
              .select({ createdAt: messages.createdAt })
              .from(messages)
              .innerJoin(messageThreads, eq(messages.threadId, messageThreads.id))
              .where(
                and(
                  eq(messageThreads.investorId, investorId),
                  inArray(messageThreads.buyerUserId, uniqueBuyerIds),
                  gte(messages.createdAt, analyticsWindowStart),
                ),
              ),
            db
              .select({ createdAt: viewingRequests.createdAt })
              .from(viewingRequests)
              .where(
                and(
                  eq(viewingRequests.realtorId, investorId),
                  inArray(viewingRequests.buyerId, uniqueBuyerIds),
                  gte(viewingRequests.createdAt, analyticsWindowStart),
                ),
              ),
          ]);

    const totalViewingRequests = viewingRequestTrendRows.length;

    const trendData = buildWeeklyTrendData(
      savedSearchRows.map((row) => row.createdAt),
      favoriteRows.map((row) => row.createdAt),
      messageRows.map((row) => row.createdAt),
      viewingRequestTrendRows.map((row) => row.createdAt),
    );

    return NextResponse.json({
      buyers,
      totalViewingRequests,
      trendData,
    });
  } catch (error) {
    console.error("Realtor analytics summary fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch analytics summary" }, { status: 500 });
  }
}
