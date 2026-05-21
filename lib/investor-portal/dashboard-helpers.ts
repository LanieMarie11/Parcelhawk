import { US_STATE_ABBR_TO_NAME } from "@/lib/us-state-abbreviation-to-name";
import type {
  InvestorDashboardMetrics,
  SearchTrendRow,
  StateDemandRow,
} from "@/app/(investor)/investor-portal/types/dashboard-metrics";

export const STATE_DEMAND_PANEL_LIMIT = 8;
export const dayMs = 86_400_000;

export type SavedSearchRow = {
  userId: string;
  state: string | null;
  minPrice: string | number | null;
  maxPrice: string | number | null;
  minAcres: string | number | null;
  maxAcres: string | number | null;
  createdAt: Date;
};

export function parseDbNumeric(raw: string | number | null): number | null {
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

export function formatCompactPrice(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${Math.round(amount / 1_000)}K`;
  return `$${Math.round(amount).toLocaleString("en-US")}`;
}

export function formatAcresShort(acres: number | null): string {
  if (acres == null) return "—";
  return `${Math.round(acres)}AC`;
}

export function toStateAbbreviation(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  const letters = t.toUpperCase().replace(/[^A-Z]/g, "");
  if (letters.length === 2 && US_STATE_ABBR_TO_NAME[letters]) return letters;
  const match = Object.entries(US_STATE_ABBR_TO_NAME).find(
    ([, name]) => name.toLowerCase() === t.toLowerCase(),
  );
  return match?.[0] ?? letters.slice(0, 2);
}

/** Share of all-time saved searches that occurred in the last 7 days. */
export function formatThisWeekShareSubtext(
  thisWeek: number,
  all: number,
): { subtext: string; positive: boolean } {
  if (all === 0) {
    return { subtext: "No searches yet", positive: false };
  }
  if (thisWeek === 0) {
    return { subtext: "0% of all searches this week", positive: false };
  }
  const pct = Math.round((thisWeek / all) * 100);
  return {
    subtext: `${pct}% of all searches this week`,
    positive: pct > 0,
  };
}

export function averagePriceMidpoints(
  rows: { minPrice: string | number | null; maxPrice: string | number | null }[],
): number | null {
  const mids: number[] = [];
  for (const row of rows) {
    const mid = midpointOrSingle(parseDbNumeric(row.minPrice), parseDbNumeric(row.maxPrice));
    if (mid != null) mids.push(mid);
  }
  if (mids.length === 0) return null;
  return mids.reduce((a, b) => a + b, 0) / mids.length;
}

function formatPercentChange(
  current: number,
  prior: number,
): { change: string; positive: boolean | null } {
  if (current === 0 && prior === 0) return { change: "0.0%", positive: null };
  if (prior === 0) return { change: "+100.0%", positive: true };
  const pct = ((current - prior) / prior) * 100;
  if (Math.abs(pct) < 0.05) return { change: "0.0%", positive: null };
  const sign = pct > 0 ? "+" : "";
  return {
    change: `${sign}${pct.toFixed(1)}%`,
    positive: pct > 0 ? true : false,
  };
}

function rangeKey(min: number | null, max: number | null): string {
  return `${min ?? ""}|${max ?? ""}`;
}

function formatAcreageRangeLabel(min: number | null, max: number | null): string {
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
  if (min != null && max != null) return `${fmt(min)} - ${fmt(max)} ac`;
  if (min != null) return `${fmt(min)}+ ac`;
  if (max != null) return `Up to ${fmt(max)} ac`;
  return "—";
}

function formatPriceRangeLabel(min: number | null, max: number | null): string {
  if (min != null && max != null) return `${formatCompactPrice(min)} - ${formatCompactPrice(max)}`;
  if (min != null) return `${formatCompactPrice(min)}+`;
  if (max != null) return `Up to ${formatCompactPrice(max)}`;
  return "—";
}

function mostCommonRangeLabel(
  rows: SavedSearchRow[],
  pick: (row: SavedSearchRow) => { min: number | null; max: number | null },
  formatLabel: (min: number | null, max: number | null) => string,
): { label: string; key: string } | null {
  const counts = new Map<string, { label: string; count: number }>();
  for (const row of rows) {
    const { min, max } = pick(row);
    if (min == null && max == null) continue;
    const key = rangeKey(min, max);
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(key, { label: formatLabel(min, max), count: 1 });
    }
  }
  let top: { label: string; key: string; count: number } | null = null;
  for (const [key, entry] of counts) {
    if (!top || entry.count > top.count) {
      top = { label: entry.label, key, count: entry.count };
    }
  }
  return top ? { label: top.label, key: top.key } : null;
}

function countMatchingRangeKey(
  rows: SavedSearchRow[],
  key: string,
  pick: (row: SavedSearchRow) => { min: number | null; max: number | null },
): number {
  return rows.filter((row) => {
    const { min, max } = pick(row);
    return rangeKey(min, max) === key;
  }).length;
}

export function buildSearchTrendRows(
  currentSearches: SavedSearchRow[],
  priorSearches: SavedSearchRow[],
  favoriteCounts: { current: number; prior: number },
): SearchTrendRow[] {
  const currentBuyers = new Set(currentSearches.map((r) => r.userId));
  const priorBuyers = new Set(priorSearches.map((r) => r.userId));

  const currentAvgPerBuyer =
    currentBuyers.size > 0 ? currentSearches.length / currentBuyers.size : 0;
  const priorAvgPerBuyer = priorBuyers.size > 0 ? priorSearches.length / priorBuyers.size : 0;

  const totalChange = formatPercentChange(currentSearches.length, priorSearches.length);
  const buyersChange = formatPercentChange(currentBuyers.size, priorBuyers.size);
  const avgChange = formatPercentChange(currentAvgPerBuyer, priorAvgPerBuyer);

  const topAcreage = mostCommonRangeLabel(currentSearches, (row) => ({
    min: parseDbNumeric(row.minAcres),
    max: parseDbNumeric(row.maxAcres),
  }), formatAcreageRangeLabel);

  let acreageChange: { change: string; positive: boolean | null } = {
    change: "0.0%",
    positive: null,
  };
  if (topAcreage) {
    const currentBucket = countMatchingRangeKey(currentSearches, topAcreage.key, (row) => ({
      min: parseDbNumeric(row.minAcres),
      max: parseDbNumeric(row.maxAcres),
    }));
    const priorBucket = countMatchingRangeKey(priorSearches, topAcreage.key, (row) => ({
      min: parseDbNumeric(row.minAcres),
      max: parseDbNumeric(row.maxAcres),
    }));
    acreageChange = formatPercentChange(currentBucket, priorBucket);
  }

  const topPrice = mostCommonRangeLabel(currentSearches, (row) => ({
    min: parseDbNumeric(row.minPrice),
    max: parseDbNumeric(row.maxPrice),
  }), formatPriceRangeLabel);

  let priceChange: { change: string; positive: boolean | null } = {
    change: "0.0%",
    positive: null,
  };
  if (topPrice) {
    const currentBucket = countMatchingRangeKey(currentSearches, topPrice.key, (row) => ({
      min: parseDbNumeric(row.minPrice),
      max: parseDbNumeric(row.maxPrice),
    }));
    const priorBucket = countMatchingRangeKey(priorSearches, topPrice.key, (row) => ({
      min: parseDbNumeric(row.minPrice),
      max: parseDbNumeric(row.maxPrice),
    }));
    priceChange = formatPercentChange(currentBucket, priorBucket);
  }

  const savesChange = formatPercentChange(favoriteCounts.current, favoriteCounts.prior);

  return [
    {
      metric: "Total searches",
      current: currentSearches.length.toLocaleString("en-US"),
      change: totalChange.change,
      positive: totalChange.positive,
    },
    {
      metric: "Unique buyers active",
      current: currentBuyers.size.toLocaleString("en-US"),
      change: buyersChange.change,
      positive: buyersChange.positive,
    },
    {
      metric: "Avg searches per buyer",
      current: currentBuyers.size > 0 ? currentAvgPerBuyer.toFixed(1) : "—",
      change: avgChange.change,
      positive: avgChange.positive,
    },
    {
      metric: "Most-searched acreage",
      current: topAcreage?.label ?? "—",
      change: acreageChange.change,
      positive: acreageChange.positive,
    },
    {
      metric: "Most-searched price range",
      current: topPrice?.label ?? "—",
      change: priceChange.change,
      positive: priceChange.positive,
    },
    {
      metric: "Listings getting saved",
      current: favoriteCounts.current.toLocaleString("en-US"),
      change: savesChange.change,
      positive: savesChange.positive,
    },
  ];
}

export function emptySearchTrends(): SearchTrendRow[] {
  return [
    { metric: "Total searches", current: "0", change: "0.0%", positive: null },
    { metric: "Unique buyers active", current: "0", change: "0.0%", positive: null },
    { metric: "Avg searches per buyer", current: "—", change: "0.0%", positive: null },
    { metric: "Most-searched acreage", current: "—", change: "0.0%", positive: null },
    { metric: "Most-searched price range", current: "—", change: "0.0%", positive: null },
    { metric: "Listings getting saved", current: "0", change: "0.0%", positive: null },
  ];
}

export function buildStateDemandRows(stateBuyerCounts: Map<string, Set<string>>): StateDemandRow[] {
  const ranked = [...stateBuyerCounts.entries()]
    .map(([abbr, buyers]) => ({
      abbr,
      state: US_STATE_ABBR_TO_NAME[abbr] ?? abbr,
      buyerCount: buyers.size,
    }))
    .sort((a, b) => b.buyerCount - a.buyerCount)
    .slice(0, STATE_DEMAND_PANEL_LIMIT);

  const maxBuyers = ranked[0]?.buyerCount ?? 0;

  return ranked.map((row) => ({
    state: row.state,
    abbr: row.abbr,
    percent: maxBuyers > 0 ? Math.round((row.buyerCount / maxBuyers) * 100) : 0,
    buyerCount: row.buyerCount,
    buyers: row.buyerCount.toLocaleString("en-US"),
  }));
}

export function emptyMetrics(): InvestorDashboardMetrics {
  return {
    buyerSearches: { value: "0", subtext: "No linked buyers", positive: false },
    topStateDemand: { value: "—", subtext: "No state data yet", positive: false },
    avgPriceSought: { value: "—", subtext: "No price filters yet", positive: false },
    mostSavedListing: { value: "—", subtext: "No saves yet", positive: false },
  };
}
