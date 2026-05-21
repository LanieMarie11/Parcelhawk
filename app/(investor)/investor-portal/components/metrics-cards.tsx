import type { LucideIcon } from "lucide-react";
import { CircleDollarSign, Search, Sparkles, Target } from "lucide-react";
import type { InvestorDashboardMetrics } from "../types/dashboard-metrics";

type MetricKey = keyof InvestorDashboardMetrics;

const metricConfig: { key: MetricKey; label: string; icon: LucideIcon }[] = [
  { key: "buyerSearches", label: "Buyer searches", icon: Search },
  { key: "topStateDemand", label: "Top state demand", icon: Target },
  { key: "avgPriceSought", label: "Avg price sought", icon: CircleDollarSign },
  { key: "mostSavedListing", label: "Most saved listing", icon: Sparkles },
];

type MetricsCardsProps = {
  metrics: InvestorDashboardMetrics | null;
  isLoading?: boolean;
};

export function MetricsCards({ metrics, isLoading = false }: MetricsCardsProps) {
  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {metricConfig.map(({ key, label, icon: Icon }) => {
        const data = metrics?.[key];
        const value = isLoading ? "—" : (data?.value ?? "—");
        const subtext = isLoading ? "Loading…" : (data?.subtext ?? "");
        const positive = data?.positive ?? false;

        return (
          <article key={key} className="rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium text-foreground">{label}</p>
              <span className="rounded-md border border-border p-1 text-muted-foreground">
                <Icon className="h-3.5 w-3.5" />
              </span>
            </div>
            <p className="mt-2 text-2xl font-semibold leading-none text-foreground">{value}</p>
            <p
              className={`mt-2 text-xs ${positive ? "text-brand-green" : "text-muted-foreground"}`}
            >
              {subtext}
            </p>
          </article>
        );
      })}
    </section>
  );
}
