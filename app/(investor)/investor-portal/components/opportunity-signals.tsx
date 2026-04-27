import { Lightbulb } from "lucide-react";

const opportunities = [
  {
    title: "High demand for 20-40 ac parcels in Montrose County, CO",
    detail: "11 buyers searched this profile in the last 7 days. Only 3 listings currently match. Supply is tight.",
  },
  {
    title: "Price ceiling rising in 20-50 ac tier",
    detail: "Average budget in this tier moved from $390K to $425K (+11.8%). Re-evaluate 2024 pricing on 7 of your listings.",
  },
  {
    title: "Data gap - unlisted Weakley County demand",
    detail: "52 buyers searched for Weakley County parcels this month. You currently have no listings there.",
  },
];

export function OpportunitySignals() {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white shadow-sm">
      <header className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
        <div>
          <h2 className="flex items-center gap-2 text-md font-phudu font-medium uppercase tracking-wide text-[#0F172A]">
            <Lightbulb className="h-4 w-4 text-[#0F172A]" />
            Opportunity signals - act on these
          </h2>
          <p className="text-xs text-zinc-500">Actionable patterns detected in your market</p>
        </div>
        <button className="text-sm font-medium text-zinc-600 hover:text-zinc-900">Full Analytics</button>
      </header>
      <div className="space-y-3 p-3">
        {opportunities.map((item) => (
          <article key={item.title} className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-medium text-[#030303]">{item.title}</h3>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                High demand / low supply
              </span>
            </div>
            <p className="mt-1 text-xs text-[#334155]">{item.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
