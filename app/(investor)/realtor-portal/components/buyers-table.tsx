"use client";

import { useEffect, useMemo, useState } from "react";

type BuyerRow = {
  id: string;
  name: string;
  joinedAt: string;
  lastActive: string;
  score: "Hot" | "Warm";
  searches: string;
  preference: string;
  action: "Call Now" | "Push";
};

type BuyersResponse = {
  buyers: BuyerRow[];
};

export function BuyersTable() {
  const [buyerRows, setBuyerRows] = useState<BuyerRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadBuyers() {
      try {
        const response = await fetch("/api/realtor-portal/buyers", { cache: "no-store" });
        const data = (await response.json()) as BuyersResponse & { error?: string };
        if (!response.ok) {
          throw new Error(data.error ?? "Failed to load buyers");
        }
        if (isMounted) {
          setBuyerRows(data.buyers ?? []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load buyers");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadBuyers();
    return () => {
      isMounted = false;
    };
  }, []);

  const activeBuyerCount = useMemo(() => buyerRows.length, [buyerRows]);

  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      <header className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
        <div>
          <h2 className="text-md font-phudu font-medium uppercase tracking-wide text-[#0F172A]">My Buyers - Colorado</h2>
          <p className="text-xs text-zinc-500">{activeBuyerCount} active buyers matched by referral URL</p>
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
            {isLoading ? (
              <tr>
                <td className="px-4 py-4 text-sm text-zinc-500" colSpan={6}>
                  Loading buyers...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td className="px-4 py-4 text-sm text-rose-600" colSpan={6}>
                  {error}
                </td>
              </tr>
            ) : buyerRows.length === 0 ? (
              <tr>
                <td className="px-4 py-4 text-sm text-zinc-500" colSpan={6}>
                  No buyers connected to your referral URL yet.
                </td>
              </tr>
            ) : (
              buyerRows.map((row) => (
              <tr key={row.id} className="border-t border-zinc-100">
                <td className="px-4 py-3">
                  <p className="font-semibold text-zinc-800">{row.name}</p>
                  <p className="text-xs text-zinc-500">{row.joinedAt}</p>
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
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
