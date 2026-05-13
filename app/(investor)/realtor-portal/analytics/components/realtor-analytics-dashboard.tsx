"use client";

import { useEffect, useState } from "react";
import { RealtorAnalyticsDetails } from "./realtor-analytics-details";
import { RealtorAnalyticsPreferences } from "./realtor-analytics-preferences";
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
  error?: string;
};

export function RealtorAnalyticsDashboard() {
  const [buyers, setBuyers] = useState<AnalyticsBuyer[]>([]);
  const [totalViewingRequests, setTotalViewingRequests] = useState(0);
  const [trendData, setTrendData] = useState<WeeklyTrendPoint[]>([]);
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
      } catch {
        if (!isMounted) return;
        setBuyers([]);
        setTotalViewingRequests(0);
        setTrendData([]);
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
    <div className="min-h-[calc(100vh-73px)] bg-zinc-50 px-4 pb-8 pt-6 font-ibm-plex-sans text-zinc-900 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1400px] rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm lg:p-5">
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
        <RealtorAnalyticsPreferences />
      </div>
    </div>
  );
}
