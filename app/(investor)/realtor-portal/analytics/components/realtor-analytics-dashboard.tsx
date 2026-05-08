import { RealtorAnalyticsDetails } from "./realtor-analytics-details";
import { RealtorAnalyticsPreferences } from "./realtor-analytics-preferences";
import { RealtorAnalyticsSummary } from "./realtor-analytics-summary";

export function RealtorAnalyticsDashboard() {
  return (
    <div className="min-h-[calc(100vh-73px)] bg-zinc-50 px-4 pb-8 pt-6 font-ibm-plex-sans text-zinc-900 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1400px] rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm lg:p-5">
        <RealtorAnalyticsSummary />
        <RealtorAnalyticsDetails />
        <RealtorAnalyticsPreferences />
      </div>
    </div>
  );
}
