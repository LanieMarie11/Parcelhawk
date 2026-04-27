import { DemandSidebar } from "./components/demand-sidebar";
import { MetricsCards } from "./components/metrics-cards";
import { OpportunitySignals } from "./components/opportunity-signals";
import { SearchTrendsTable } from "./components/search-trends-table";
import { StateDemandPanel } from "./components/state-demand-panel";

export default function InvestorPortalPage() {
  return (
    <div className="min-h-[calc(100vh-73px)] bg-zinc-50 px-4 pb-8 pt-6 font-ibm-plex-sans text-zinc-900 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1400px]">
        <MetricsCards />

        <div className="mt-4 grid gap-4 xl:grid-cols-12">
          <div className="space-y-4 xl:col-span-9">
            <StateDemandPanel />
            <SearchTrendsTable />
            <OpportunitySignals />
          </div>
          <DemandSidebar />
        </div>
      </div>
    </div>
  );
}
