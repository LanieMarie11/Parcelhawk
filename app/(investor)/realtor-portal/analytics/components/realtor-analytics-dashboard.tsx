"use client";

import { useEffect, useState } from "react";
import { RealtorAnalyticsDetails } from "./realtor-analytics-details";
import { RealtorAnalyticsPreferences, type HighestIntentBuyer, type PreferenceInsights } from "./realtor-analytics-preferences";
import { RealtorAnalyticsSummary } from "./realtor-analytics-summary";

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

type AnalyticsSummaryResponse = {
  buyers?: AnalyticsBuyer[];
  totalViewingRequests?: number;
  trendData?: WeeklyTrendPoint[];
  preferenceInsights?: PreferenceInsights;
  highestIntentBuyers?: HighestIntentBuyer[];
  error?: string;
};

const emptyPreferenceInsights: PreferenceInsights = {
  states: [],
  acreage: [],
  priceBands: [],
};

export function RealtorAnalyticsDashboard() {
  const [buyers, setBuyers] = useState<AnalyticsBuyer[]>([]);
  const [totalViewingRequests, setTotalViewingRequests] = useState(0);
  const [trendData, setTrendData] = useState<WeeklyTrendPoint[]>([]);
  const [preferenceInsights, setPreferenceInsights] = useState<PreferenceInsights>(emptyPreferenceInsights);
  const [highestIntentBuyers, setHighestIntentBuyers] = useState<HighestIntentBuyer[]>([]);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadSummary() {
      try {
        const response = await fetch("/api/realtor-portal/analytics", { cache: "no-store" });
        const data = (await response.json()) as AnalyticsSummaryResponse;
        if (!response.ok) {
          throw new Error(data.error ?? "Failed to load analytics summary");
        }

        if (!isMounted) return;
        setBuyers(data.buyers ?? []);
        setTotalViewingRequests(data.totalViewingRequests ?? 0);
        setTrendData(data.trendData ?? []);
        setPreferenceInsights(data.preferenceInsights ?? emptyPreferenceInsights);
        setHighestIntentBuyers(data.highestIntentBuyers ?? []);
      } catch {
        if (!isMounted) return;
        setBuyers([]);
        setTotalViewingRequests(0);
        setTrendData([]);
        setPreferenceInsights(emptyPreferenceInsights);
        setHighestIntentBuyers([]);
      } finally {
        if (isMounted) setIsLoadingSummary(false);
      }
    }

    void loadSummary();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-full h-full px-4 pb-8 pt-6 font-ibm-plex-sans text-zinc-900 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1400px] rounded-2xl border border-zinc-200 bg-zinc-50 p-4 shadow-sm lg:p-5">
        <RealtorAnalyticsSummary
          buyers={buyers}
          totalViewingRequests={totalViewingRequests}
          isLoading={isLoadingSummary}
        />
        <RealtorAnalyticsDetails
          buyers={buyers}
          isLoading={isLoadingSummary}
          viewingRequestCount={totalViewingRequests}
          trendData={trendData}
        />
        <RealtorAnalyticsPreferences
          preferenceInsights={preferenceInsights}
          highestIntentBuyers={highestIntentBuyers}
          isLoading={isLoadingSummary}
        />
      </div>
    </div>
  );
}
