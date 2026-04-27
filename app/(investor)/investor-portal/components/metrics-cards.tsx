import { CircleDollarSign, Search, Sparkles, Target } from "lucide-react";

const topMetrics = [
  { label: "Buyer searches", value: "142", subtext: "+ 18% this week", icon: Search, positive: true },
  { label: "Top state demand", value: "CO", subtext: "38 buyers searching", icon: Target, positive: false },
  { label: "Avg price sought", value: "$58K", subtext: "Up from $52K", icon: CircleDollarSign, positive: true },
  { label: "Most saved listing", value: "38AC", subtext: "Montrose Co, Co", icon: Sparkles, positive: false },
];

export function MetricsCards() {
  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {topMetrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <article key={metric.label} className="rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium text-[#000000]">{metric.label}</p>
              <span className="rounded-md border border-zinc-200 p-1 text-zinc-500">
                <Icon className="h-3.5 w-3.5" />
              </span>
            </div>
            <p className="mt-2 text-2xl font-semibold leading-none text-[#1F1F1F]">{metric.value}</p>
            <p className={`mt-2 text-xs ${metric.positive ? "text-emerald-600" : "text-zinc-500"}`}>{metric.subtext}</p>
          </article>
        );
      })}
    </section>
  );
}
