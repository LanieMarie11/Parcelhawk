import { TrendingUp } from "lucide-react";
import type { SearchTrendRow } from "../types/dashboard-metrics";

type SearchTrendsTableProps = {
  rows: SearchTrendRow[];
  isLoading?: boolean;
};

export function SearchTrendsTable({ rows, isLoading = false }: SearchTrendsTableProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      <header className="border-b border-zinc-100 px-4 py-3">
        <h2 className="flex items-center gap-2 text-md font-phudu font-medium uppercase tracking-wide text-[#0F172A]">
          <TrendingUp className="h-4 w-4 text-[#0F172A]" />
          Search volume trends - last 30 days
        </h2>
        <p className="text-xs text-zinc-500">30-day rolling metrics vs prior period</p>
      </header>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs tracking-wide text-[#030303]">
            <tr>
              <th className="px-4 py-3 font-semibold">Metric</th>
              <th className="px-4 py-3 font-semibold">Current</th>
              <th className="px-4 py-3 font-semibold text-right">Change</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-sm text-zinc-500">
                  Loading search trends…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-sm text-zinc-500">
                  No search trend data yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.metric} className="border-t border-zinc-100">
                  <td className="px-4 py-3 font-medium">{row.metric}</td>
                  <td className="px-4 py-3 font-medium">{row.current}</td>
                  <td
                    className={`px-4 py-3 text-right text-xs font-semibold ${
                      row.positive === null
                        ? "text-zinc-400"
                        : row.positive
                          ? "text-emerald-600"
                          : "text-rose-600"
                    }`}
                  >
                    {row.change}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
