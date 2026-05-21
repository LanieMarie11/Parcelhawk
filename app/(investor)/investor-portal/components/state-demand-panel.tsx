import { Gauge } from "lucide-react";
import type { StateDemandRow } from "../types/dashboard-metrics";

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

type StateDemandPanelProps = {
  rows: StateDemandRow[];
  isLoading?: boolean;
};

export function StateDemandPanel({ rows, isLoading = false }: StateDemandPanelProps) {
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
        {isLoading ? (
          <p className="py-6 text-center text-sm text-zinc-500">Loading state demand…</p>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-500">No state data yet.</p>
        ) : (
          rows.map((row) => (
            <div key={row.abbr} className="grid grid-cols-[72px_1fr_40px] items-center gap-4 text-xs">
              <span className="font-medium text-xs text-[#0F172A]">{row.state}</span>
              <PercentBar value={row.percent} />
              <span className="text-right text-xs text-[#0F172A]">{row.buyers}</span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
