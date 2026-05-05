import { Eye, Flame, TrendingUp, Upload, UserRound } from "lucide-react";

type StatsData = {
  totalBuyers: number;
  hotBuyers: number;
  viewingRequests: number;
  parcelsPushed: number;
};

type StatsCardsProps = {
  stats: StatsData | null;
  isLoading: boolean;
};

export function StatsCards({ stats, isLoading }: StatsCardsProps) {
  const statCards = [
    { label: "Total buyers", value: stats?.totalBuyers ?? 0, subtext: "Matched by referral URL", icon: UserRound },
    { label: "Hot Buyers", value: stats?.hotBuyers ?? 0, subtext: "Active last 24 hours", icon: Flame, alert: true },
    { label: "Viewing Requests", value: stats?.viewingRequests ?? 0, subtext: "Awaiting response", icon: Eye },
    { label: "Parcels Pushed", value: stats?.parcelsPushed ?? 0, subtext: "Distinct listings requested", icon: Upload },
  ];

  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {statCards.map((card) => {
        const Icon = card.icon;
        return (
          <article key={card.label} className="rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium text-[#000000]">{card.label}</p>
              <span className="rounded-md border border-zinc-200 p-1 text-zinc-500">
                <Icon className="h-3.5 w-3.5" />
              </span>
            </div>
            <div className="mt-2">
              <p className={`text-2xl font-medium font-phudu leading-none ${card.alert ? "text-red-600" : "text-[#1F1F1F]"}`}>
                {isLoading ? "..." : card.value.toLocaleString()}
              </p>
              <p className={`mt-2 flex items-center gap-1 text-xs ${card.alert ? "text-zinc-500" : "text-emerald-600"}`}>
                {!card.alert && <TrendingUp className="h-3 w-3" />}
                {card.subtext}
              </p>
            </div>
          </article>
        );
      })}
    </section>
  );
}
