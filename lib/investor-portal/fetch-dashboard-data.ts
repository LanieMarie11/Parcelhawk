import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  buyerInvestorLinks,
  favorites,
  landUpdatedListings,
  savedSearches,
} from "@/db/schema";
import type {
  InvestorDashboardMetrics,
  SearchTrendRow,
  StateDemandRow,
} from "@/app/(investor)/investor-portal/types/dashboard-metrics";
import {
  averagePriceMidpoints,
  buildSearchTrendRows,
  buildStateDemandRows,
  dayMs,
  emptyMetrics,
  emptySearchTrends,
  formatAcresShort,
  formatCompactPrice,
  formatThisWeekShareSubtext,
  parseDbNumeric,
  toStateAbbreviation,
} from "./dashboard-helpers";

export type InvestorDashboardData = {
  metrics: InvestorDashboardMetrics;
  stateDemand: StateDemandRow[];
  searchTrends: SearchTrendRow[];
};

export async function fetchInvestorDashboardData(
  investorId: string,
): Promise<InvestorDashboardData> {
  const thisWeekStart = new Date(Date.now() - 7 * dayMs);
  const period30Start = new Date(Date.now() - 30 * dayMs);
  const period60Start = new Date(Date.now() - 60 * dayMs);

  const buyerRows = await db
    .select({ buyerId: buyerInvestorLinks.buyerId })
    .from(buyerInvestorLinks)
    .where(
      and(eq(buyerInvestorLinks.investorId, investorId), eq(buyerInvestorLinks.status, "active")),
    );

  const buyerIds = [...new Set(buyerRows.map((row) => row.buyerId))];

  if (buyerIds.length === 0) {
    return {
      metrics: emptyMetrics(),
      stateDemand: [],
      searchTrends: emptySearchTrends(),
    };
  }

  const buyerIdFilter = inArray(savedSearches.userId, buyerIds);

  const allSavedSearches = await db
    .select({
      userId: savedSearches.userId,
      state: savedSearches.state,
      minPrice: savedSearches.minPrice,
      maxPrice: savedSearches.maxPrice,
      minAcres: savedSearches.minAcres,
      maxAcres: savedSearches.maxAcres,
      createdAt: savedSearches.createdAt,
    })
    .from(savedSearches)
    .where(buyerIdFilter);

  const currentPeriodSearches = allSavedSearches.filter((row) => row.createdAt >= period30Start);
  const priorPeriodSearches = allSavedSearches.filter(
    (row) => row.createdAt >= period60Start && row.createdAt < period30Start,
  );

  const buyerFavorites = await db
    .select({ createdAt: favorites.createdAt })
    .from(favorites)
    .where(inArray(favorites.userId, buyerIds));

  const favoritePeriodCounts = {
    current: buyerFavorites.filter((row) => row.createdAt >= period30Start).length,
    prior: buyerFavorites.filter(
      (row) => row.createdAt >= period60Start && row.createdAt < period30Start,
    ).length,
  };

  const searchTrends = buildSearchTrendRows(
    currentPeriodSearches,
    priorPeriodSearches,
    favoritePeriodCounts,
  );

  const totalSearchCount = allSavedSearches.length;
  const thisWeekSearchCount = allSavedSearches.filter(
    (row) => row.createdAt >= thisWeekStart,
  ).length;
  const searchTrend = formatThisWeekShareSubtext(thisWeekSearchCount, totalSearchCount);

  const stateBuyerCounts = new Map<string, Set<string>>();
  for (const row of allSavedSearches) {
    if (!row.state?.trim()) continue;
    const abbr = toStateAbbreviation(row.state.trim());
    if (!abbr) continue;
    const buyers = stateBuyerCounts.get(abbr) ?? new Set<string>();
    buyers.add(row.userId);
    stateBuyerCounts.set(abbr, buyers);
  }

  const stateDemand = buildStateDemandRows(stateBuyerCounts);
  const topStateRow = stateDemand[0];

  const avgAllTime = averagePriceMidpoints(allSavedSearches);

  let avgPriceMetric: InvestorDashboardMetrics["avgPriceSought"];
  if (avgAllTime == null) {
    avgPriceMetric = { value: "—", subtext: "No price filters yet", positive: false };
  } else {
    avgPriceMetric = {
      value: formatCompactPrice(avgAllTime),
      subtext: "All-time from saved searches",
      positive: false,
    };
  }

  const favoriteCounts = await db
    .select({
      landListingId: favorites.landListingId,
      saveCount: sql<number>`count(*)::int`,
    })
    .from(favorites)
    .where(inArray(favorites.userId, buyerIds))
    .groupBy(favorites.landListingId)
    .orderBy(desc(sql`count(*)`))
    .limit(1);

  let mostSavedMetric: InvestorDashboardMetrics["mostSavedListing"] = {
    value: "—",
    subtext: "No saves yet",
    positive: false,
  };

  if (favoriteCounts.length > 0) {
    const topListingId = favoriteCounts[0].landListingId;
    const [listing] = await db
      .select({
        acres: landUpdatedListings.acres,
        city: landUpdatedListings.city,
        county: landUpdatedListings.county,
        stateAbbreviation: landUpdatedListings.stateAbbreviation,
      })
      .from(landUpdatedListings)
      .where(eq(landUpdatedListings.id, topListingId))
      .limit(1);

    if (listing) {
      const acres = parseDbNumeric(listing.acres);
      const locationParts = [
        listing.county?.trim() ? `${listing.county.trim()} Co` : null,
        listing.stateAbbreviation?.trim()?.toUpperCase() ?? null,
      ].filter(Boolean);
      mostSavedMetric = {
        value: formatAcresShort(acres),
        subtext:
          locationParts.length > 0 ? locationParts.join(", ") : listing.city?.trim() || "Saved listing",
        positive: false,
      };
    }
  }

  const metrics: InvestorDashboardMetrics = {
    buyerSearches: {
      value: totalSearchCount.toLocaleString("en-US"),
      subtext: searchTrend.subtext,
      positive: searchTrend.positive,
    },
    topStateDemand: topStateRow
      ? {
          value: topStateRow.abbr,
          subtext: `${topStateRow.buyerCount} buyer${topStateRow.buyerCount === 1 ? "" : "s"} searching`,
          positive: false,
        }
      : { value: "—", subtext: "No state filters yet", positive: false },
    avgPriceSought: avgPriceMetric,
    mostSavedListing: mostSavedMetric,
  };

  return { metrics, stateDemand, searchTrends };
}
