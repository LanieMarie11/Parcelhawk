"use client";

import type { InvestorDashboardData } from "@/lib/investor-portal/fetch-dashboard-data";
import { DemandSidebar } from "./demand-sidebar";
import { MetricsCards } from "./metrics-cards";
import { OpportunitySignals } from "./opportunity-signals";
import { SearchTrendsTable } from "./search-trends-table";
import { StateDemandPanel } from "./state-demand-panel";

type InvestorPortalPageClientProps = {
  initialData: InvestorDashboardData;
};

export function InvestorPortalPageClient({ initialData }: InvestorPortalPageClientProps) {
  const { metrics, stateDemand, searchTrends } = initialData;

  return (
    <div className="min-h-[calc(100vh-73px)] bg-background px-4 pb-8 pt-6 font-ibm-plex-sans text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1400px]">
        <MetricsCards metrics={metrics} isLoading={false} />

        <div className="mt-4 grid gap-4 xl:grid-cols-12">
          <div className="space-y-4 xl:col-span-9">
            <StateDemandPanel rows={stateDemand} isLoading={false} />
            <SearchTrendsTable rows={searchTrends} isLoading={false} />
            <OpportunitySignals />
          </div>
          <DemandSidebar />
        </div>
      </div>
    </div>
  );
}
