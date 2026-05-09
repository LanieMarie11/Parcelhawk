import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Clock3,
  Download,
  Eye,
  FileText,
  Flame,
  Lightbulb,
  SendHorizontal,
  Users,
} from "lucide-react";
import type { ComponentType } from "react";

type StatCard = {
  label: string;
  value: string;
  suffix?: string;
  trend: string;
  trendDirection: "up" | "down" | "neutral";
  icon: ComponentType<{ className?: string }>;
};

const statCards: StatCard[] = [
  {
    label: "Active Buyers",
    value: "152",
    trend: "+12%",
    trendDirection: "up",
    icon: Users,
  },
  {
    label: "Hot Buyers",
    value: "42",
    trend: "+8",
    trendDirection: "up",
    icon: Flame,
  },
  {
    label: "Viewing Requests",
    value: "152",
    trend: "+12.4% vs last month",
    trendDirection: "up",
    icon: Eye,
  },
  {
    label: "Avg Response Time",
    value: "2.3",
    suffix: "HRS",
    trend: "-15%",
    trendDirection: "down",
    icon: Clock3,
  },
  {
    label: "Parcels Pushed",
    value: "245",
    trend: "This month",
    trendDirection: "up",
    icon: FileText,
  },
  {
    label: "Push -> View Rate",
    value: "23",
    suffix: "%",
    trend: "+3%",
    trendDirection: "up",
    icon: SendHorizontal,
  },
];

export function RealtorAnalyticsSummary() {
  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 pb-3">
        <div>
          <h1 className="text-2xl font-medium font-phudu uppercase tracking-tight text-[#16212f]">
            Realtor Analytics
          </h1>
          <p className="mt-1 text-xs text-zinc-500">Track buyer activity, engagement, and outreach performance</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            <CalendarDays className="h-4 w-4" />
            Last 30 days
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-700 bg-emerald-700 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-800"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </header>

      <section className="mt-4 rounded-xl border border-[#7dc5f6] bg-[#f1f8ff] px-4 py-3">
        <div className="flex gap-3">
          <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#7bdd88] text-white">
            <Lightbulb className="h-3.5 w-3.5" />
          </span>
          <div>
            <h2 className="text-2xl font-semibold font-phudu uppercase tracking-tight text-[#12304d]">AI Insights</h2>
            <p className="mt-1 text-md font-ibm-plex-sans text-[#2e4359]">
              Hot buyers are increasing in Colorado recreational land. Viewing requests are up 18% this month. Road
              access remains the strongest buyer preference (87%). Tuesday 10-11 AM shows highest reply rates. 42
              buyers need follow-up action.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          const isDown = card.trendDirection === "down";
          const isNeutral = card.trendDirection === "neutral";
          const trendClass = isDown ? "text-red-500" : isNeutral ? "text-zinc-500" : "text-emerald-600";
          const TrendArrow = isNeutral ? null : isDown ? ArrowDown : ArrowUp;

          return (
            <article key={card.label} className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-[#000000]">{card.label}</p>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-[#F3F3F5]">
                  <Icon className="h-4 w-4" />
                </span>
              </div>

              <div className="mt-2">
                <p className="font-phudu text-[24px] font-medium leading-none text-[#1F1F1F]">
                  {card.value}
                  {card.suffix ? <span className="ml-1 text-xl">{card.suffix}</span> : null}
                </p>
                <p className={`mt-2 flex items-center gap-1.5 text-xs font-ibm-plex-sans font-medium ${trendClass}`}>
                  {TrendArrow ? (
                    <TrendArrow className="size-5 shrink-0 stroke-[2.5]" strokeLinecap="round" strokeLinejoin="round" aria-hidden />
                  ) : null}
                  {card.trend}
                </p>
              </div>
            </article>
          );
        })}
      </section>
    </>
  );
}
