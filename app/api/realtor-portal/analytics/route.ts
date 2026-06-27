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
import { formatUsStateDisplay } from "@/lib/us-state-abbreviation-to-name";

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

type PreferenceInsightRow = { label: string; value: number; width: number };

type PreferenceInsights = {
  states: PreferenceInsightRow[];
  acreage: PreferenceInsightRow[];
  priceBands: PreferenceInsightRow[];
};

type HighestIntentBuyer = {
  id: string;
  name: string;
  joined: string;
  lastActive: string;
  searches: number;
  saves: number;
  requests: number;
};

type SavedSearchAnalyticsRow = {
  userId: string;
  createdAt: Date;
  state: string | null;
  minPrice: string | number | null;
  maxPrice: string | number | null;
  minAcres: string | number | null;
  maxAcres: string | number | null;
};

function parseDbNumeric(raw: string | number | null): number | null {
  if (raw == null || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(String(raw));
  return Number.isFinite(n) ? n : null;
}

function midpointOrSingle(min: number | null, max: number | null): number | null {
  if (min != null && max != null) return (min + max) / 2;
  if (min != null) return min;
  if (max != null) return max;
  return null;
}

function addBarWidths(rows: { label: string; value: number }[]): PreferenceInsightRow[] {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return rows.map((r) => ({
    ...r,
    width: Math.round((r.value / max) * 100),
  }));
}

function buildStatePreferenceRows(rows: SavedSearchAnalyticsRow[]): PreferenceInsightRow[] {
  const counts = new Map<string, number>();
  for (const r of rows) {
    if (!r.state?.trim()) continue;
    const display = formatUsStateDisplay(r.state.trim());
    if (!display) continue;
    counts.set(display, (counts.get(display) ?? 0) + 1);
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  const ranked = sorted.map(([name, value], i) => ({
    label: `#${i + 1}. ${name}`,
    value,
  }));
  return addBarWidths(ranked);
}

function buildAcreagePreferenceRows(rows: SavedSearchAnalyticsRow[]): PreferenceInsightRow[] {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const mid = midpointOrSingle(parseDbNumeric(r.minAcres), parseDbNumeric(r.maxAcres));
    if (mid == null) continue;
    let label: string;
    if (mid < 10) label = "0-10 acres";
    else if (mid < 20) label = "10-20 acres";
    else if (mid < 50) label = "20-50 acres";
    else if (mid < 100) label = "50-100 acres";
    else label = "100+ acres";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  return addBarWidths(sorted.map(([label, value]) => ({ label, value })));
}

function buildPricePreferenceRows(rows: SavedSearchAnalyticsRow[]): PreferenceInsightRow[] {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const mid = midpointOrSingle(parseDbNumeric(r.minPrice), parseDbNumeric(r.maxPrice));
    if (mid == null) continue;
    let label: string;
    if (mid < 50_000) label = "Under $50k";
    else if (mid < 100_000) label = "$50k-$100k";
    else if (mid < 250_000) label = "$100k-$250k";
    else if (mid < 500_000) label = "$250k-$500k";
    else label = "Over $500k";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  return addBarWidths(sorted.map(([label, value]) => ({ label, value })));
}

function buildPreferenceInsights(rows: SavedSearchAnalyticsRow[]): PreferenceInsights {
  return {
    states: buildStatePreferenceRows(rows),
    acreage: buildAcreagePreferenceRows(rows),
    priceBands: buildPricePreferenceRows(rows),
  };
}

const HIGHEST_INTENT_BUYERS_LIMIT = 10;

function formatJoinedLabel(createdAt: Date): string {
  const label = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(createdAt);
  return `Joined ${label}`;
}

function formatRelativeTime(value: Date): string {
  const now = Date.now();
  const diffMs = now - value.getTime();
  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;

  if (diffMs < minuteMs) {
    return "just now";
  }
  if (diffMs < hourMs) {
    const minutes = Math.max(1, Math.floor(diffMs / minuteMs));
    return `${minutes} min ago`;
  }
  if (diffMs < dayMs) {
    const hours = Math.max(1, Math.floor(diffMs / hourMs));
    return `${hours}h ago`;
  }
  if (diffMs < 2 * dayMs) {
    return "Yesterday";
  }
  const days = Math.floor(diffMs / dayMs);
  return `${days}d ago`;
}

type BuyerProfileRow = {
  buyerId: string;
  firstName: string;
  lastName: string;
  createdAt: Date;
  lastActiveAt: Date | null;
  updatedAt: Date;
};

function buildHighestIntentBuyers(
  buyerRows: BuyerProfileRow[],
  savedSearchRows: SavedSearchAnalyticsRow[],
  favoriteRows: { userId: string }[],
  viewingCountByBuyer: Map<string, number>,
): HighestIntentBuyer[] {
  const searchCountByBuyer = new Map<string, number>();
  for (const r of savedSearchRows) {
    searchCountByBuyer.set(r.userId, (searchCountByBuyer.get(r.userId) ?? 0) + 1);
  }
  const saveCountByBuyer = new Map<string, number>();
  for (const r of favoriteRows) {
    saveCountByBuyer.set(r.userId, (saveCountByBuyer.get(r.userId) ?? 0) + 1);
  }

  const scored = buyerRows.map((b) => {
    const searches = searchCountByBuyer.get(b.buyerId) ?? 0;
    const saves = saveCountByBuyer.get(b.buyerId) ?? 0;
    const requests = viewingCountByBuyer.get(b.buyerId) ?? 0;
    const score = searches + saves + requests;
    const lastMs = (b.lastActiveAt ?? b.updatedAt).getTime();
    return { b, searches, saves, requests, score, lastMs };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.lastMs - a.lastMs;
  });

  return scored.slice(0, HIGHEST_INTENT_BUYERS_LIMIT).map(({ b, searches, saves, requests }) => {
    const name = `${b.firstName} ${b.lastName}`.trim();
    return {
      id: b.buyerId,
      name: name.length > 0 ? name : "Buyer",
      joined: formatJoinedLabel(b.createdAt),
      lastActive: formatRelativeTime(b.lastActiveAt ?? b.updatedAt),
      searches,
      saves,
      requests,
    };
  });
}

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
        firstName: users.firstName,
        lastName: users.lastName,
        createdAt: users.createdAt,
        lastActiveAt: users.lastActiveAt,
        updatedAt: users.updatedAt,
      })
      .from(buyerInvestorLinks)
      .innerJoin(users, eq(users.id, buyerInvestorLinks.buyerId))
      .where(
        and(
          eq(buyerInvestorLinks.investorId, investorId),
          eq(buyerInvestorLinks.status, "active"),
          eq(users.emailVerified, true),
        ),
      )
      .groupBy(
        users.id,
        users.firstName,
        users.lastName,
        users.createdAt,
        users.lastActiveAt,
        users.updatedAt,
      );

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

    const [savedSearchRowsRaw, favoriteRows, messageRows, viewingRequestTrendRows] =
      uniqueBuyerIds.length === 0
        ? [[], [], [], []]
        : await Promise.all([
            db
              .select({
                userId: savedSearches.userId,
                createdAt: savedSearches.createdAt,
                state: savedSearches.state,
                minPrice: savedSearches.minPrice,
                maxPrice: savedSearches.maxPrice,
                minAcres: savedSearches.minAcres,
                maxAcres: savedSearches.maxAcres,
              })
              .from(savedSearches)
              .where(
                and(inArray(savedSearches.userId, uniqueBuyerIds), gte(savedSearches.createdAt, analyticsWindowStart)),
              ),
            db
              .select({ userId: favorites.userId, createdAt: favorites.createdAt })
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

    const savedSearchRows = savedSearchRowsRaw as SavedSearchAnalyticsRow[];

    const preferenceInsights = buildPreferenceInsights(savedSearchRows);

    const highestIntentBuyers =
      uniqueBuyerIds.length === 0
        ? []
        : buildHighestIntentBuyers(buyerRows, savedSearchRows, favoriteRows, viewingCountByBuyer);

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
      preferenceInsights,
      highestIntentBuyers,
    });
  } catch (error) {
    console.error("Realtor analytics summary fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch analytics summary" }, { status: 500 });
  }
}
