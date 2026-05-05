import { Flame } from "lucide-react";

export type HotBuyerItem = {
  id: string;
  name: string;
  avatarUrl: string;
  activity: string;
  tag: "Hot lead" | "Warm";
  accent: "bg-rose-500" | "bg-amber-500";
  cta: "Call Now" | "Reach Out";
  ctaVariant: "solid" | "outline";
  lastActive: string;
};

type HotBuyersPanelProps = {
  hotBuyers: HotBuyerItem[];
  isLoading: boolean;
};

export function HotBuyersPanel({ hotBuyers, isLoading }: HotBuyersPanelProps) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white shadow-sm">
      <header className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-phudu font-semibold uppercase tracking-wide text-[#0F172A]">
            <Flame className="h-4 w-4 text-[#484A54]" />
            Hot buyers - act now
          </h2>
          <p className="text-xs text-zinc-500">Buyers showing immediate buying signal</p>
        </div>
        <button className="text-sm font-medium text-zinc-600 hover:text-zinc-900">View All</button>
      </header>
      <div className="space-y-1 p-2">
        {isLoading ? (
          <p className="px-3 py-3 text-sm text-zinc-500">Loading hot buyers...</p>
        ) : hotBuyers.length === 0 ? (
          <p className="px-3 py-3 text-sm text-zinc-500">No hot buyers right now.</p>
        ) : (
          hotBuyers.map((buyer) => (
          <div key={buyer.id} className="flex items-center gap-4 rounded-lg px-3 py-3 hover:bg-zinc-50">
            <span className={`h-11 w-1 rounded-full ${buyer.accent}`} />
            {buyer.avatarUrl ? (
              <img src={buyer.avatarUrl} alt={buyer.name} className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-600">
                {buyer.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-zinc-800">
                {buyer.name} <span className="text-xs font-normal text-zinc-400">{buyer.lastActive}</span>
                <span
                  className={`ml-2 hidden rounded-full border bg-zinc-50 px-2 py-0.5 text-[11px] font-medium sm:inline-flex ${
                    buyer.tag.toLowerCase() === "hot lead"
                      ? "border-[#E62E2E] text-[#E62E2E]"
                      : "border-zinc-200 text-zinc-500"
                  }`}
                >
                  {buyer.tag}
                </span>
              </p>
              <p className="truncate text-xs text-zinc-500">{buyer.activity}</p>
            </div>
            
            <button
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                buyer.ctaVariant === "solid"
                  ? "bg-emerald-700 text-white hover:bg-emerald-800"
                  : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              {buyer.cta}
            </button>
          </div>
          ))
        )}
      </div>
    </section>
  );
}
