import { TrendingUp } from "lucide-react";

const trendRows = [
  { metric: "Total searches", current: "18,402", change: "+12.4%", positive: true },
  { metric: "Unique buyers active", current: "3,287", change: "+8.1%", positive: true },
  { metric: "Avg searches per buyer", current: "5.6", change: "+3.2%", positive: true },
  { metric: "Most-searched acreage", current: "20 - 50 ac", change: "0.0%", positive: null },
  { metric: "Most-searched price rang", current: "$250K - $500K", change: "-4.1%", positive: false },
  { metric: "Listings getting save", current: "642", change: "+18.7%", positive: true },
];

export function SearchTrendsTable() {
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
            {trendRows.map((row) => (
              <tr key={row.metric} className="border-t border-zinc-100">
                <td className="px-4 py-3 font-medium">{row.metric}</td>
                <td className="px-4 py-3 font-medium">{row.current}</td>
                <td
                  className={`px-4 py-3 text-right text-xs font-semibold ${
                    row.positive === null ? "text-zinc-400" : row.positive ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {row.change}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
