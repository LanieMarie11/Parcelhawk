import { Gauge } from "lucide-react";

const demandRows = [
  { state: "Texas", percent: 100, buyers: "1,248" },
  { state: "Montana", percent: 72, buyers: "892" },
  { state: "Tennessee", percent: 60, buyers: "741" },
  { state: "California", percent: 47, buyers: "588" },
  { state: "Colorado", percent: 33, buyers: "412" },
  { state: "Idaho", percent: 24, buyers: "304" },
  { state: "Wyoming", percent: 18, buyers: "221" },
  { state: "New Mexico", percent: 13, buyers: "167" },
];

function PercentBar({ value }: { value: number }) {
  return (
    <div className="h-4 w-full overflow-hidden rounded bg-zinc-100">
      <div
        className="flex h-full items-center justify-end rounded bg-linear-to-r from-teal-300 to-teal-600 pr-2 text-[10px] font-semibold text-white"
        style={{ width: `${value}%` }}
      >
        {value > 30 ? `${value}%` : ""}
      </div>
    </div>
  );
}

export function StateDemandPanel() {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <header className="mb-4">
        <h2 className="flex items-center gap-2 text-md font-phudu font-medium uppercase tracking-wide text-[#0F172A]">
          <Gauge className="h-4 w-4 text-[#0F172A]" />
          Top states by demand
        </h2>
        <p className="text-xs text-zinc-500">Active buyer count per state, last 30 day</p>
      </header>

      <div className="space-y-3">
        {demandRows.map((row) => (
          <div key={row.state} className="grid grid-cols-[72px_1fr_40px] items-center gap-4 text-xs">
            <span className="font-medium text-xs text-[#0F172A]">{row.state}</span>
            <PercentBar value={row.percent} />
            <span className="text-right text-xs text-[#0F172A]">{row.buyers}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
