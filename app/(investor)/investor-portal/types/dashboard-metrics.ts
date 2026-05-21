export type InvestorDashboardMetric = {
  value: string;
  subtext: string;
  positive: boolean;
};

export type InvestorDashboardMetrics = {
  buyerSearches: InvestorDashboardMetric;
  topStateDemand: InvestorDashboardMetric;
  avgPriceSought: InvestorDashboardMetric;
  mostSavedListing: InvestorDashboardMetric;
};

export type StateDemandRow = {
  state: string;
  abbr: string;
  percent: number;
  buyerCount: number;
  buyers: string;
};

export type SearchTrendRow = {
  metric: string;
  current: string;
  change: string;
  positive: boolean | null;
};
