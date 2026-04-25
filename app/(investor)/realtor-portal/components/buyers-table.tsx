const buyerRows = [
  { name: "Marcus Reed", lastActive: "12 min ago", score: "Hot", searches: "47", preference: "40+ acres, recreational", action: "Call Now" },
  { name: "Sarah Alcott", lastActive: "1h ago", score: "Hot", searches: "31", preference: "Viewing Request", action: "Push" },
  { name: "Jen Larimore", lastActive: "4h ago", score: "Warm", searches: "18", preference: "40.5 ac", action: "Call Now" },
  { name: "Hannah Weiss", lastActive: "Yesterday", score: "Warm", searches: "12", preference: "Mixed-use, paved access", action: "Push" },
];

export function BuyersTable() {
  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      <header className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
        <div>
          <h2 className="text-md font-phudu font-medium uppercase tracking-wide text-[#0F172A]">My Buyers - Colorado</h2>
          <p className="text-xs text-zinc-500">10 active buyers across 3 state</p>
        </div>
        <button className="text-sm font-medium text-zinc-600 hover:text-zinc-900">All States</button>
      </header>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-[#030303]">
            <tr>
              <th className="px-4 py-3 font-semibold">Buyer</th>
              <th className="px-4 py-3 font-semibold">Last Active</th>
              <th className="px-4 py-3 font-semibold">Score</th>
              <th className="px-4 py-3 font-semibold">Searches</th>
              <th className="px-4 py-3 font-semibold">Preference</th>
              <th className="px-4 py-3 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {buyerRows.map((row) => (
              <tr key={row.name} className="border-t border-zinc-100">
                <td className="px-4 py-3">
                  <p className="font-semibold text-zinc-800">{row.name}</p>
                  <p className="text-xs text-zinc-500">Joined Mar 2026</p>
                </td>
                <td className="px-4 py-3 text-zinc-600">{row.lastActive}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 text-xs font-medium ${row.score === "Hot" ? "text-rose-600" : "text-amber-600"}`}>
                    <span className={`h-2 w-2 rounded-full ${row.score === "Hot" ? "bg-rose-500" : "bg-amber-500"}`} />
                    {row.score}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-600">{row.searches}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-600">{row.preference}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    className={`rounded-lg px-4 py-1.5 text-xs font-semibold ${
                      row.action === "Call Now"
                        ? "bg-emerald-700 text-white hover:bg-emerald-800"
                        : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100"
                    }`}
                  >
                    {row.action}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
