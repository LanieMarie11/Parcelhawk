"use client";

import { useMemo, useState } from "react";

const DEFAULT_VISIBLE_ROWS = 4;

export type BuyerRow = {
  id: string;
  name: string;
  avatarUrl: string;
  location: string;
  joinedAt: string;
  lastActive: string;
  score: "Hot" | "Warm" | "Cold";
  searches: string;
  preferenceAcreage: string;
  preferenceBudget: string;
  preferenceTimeframe: string;
  about: string;
};

type BuyersTableProps = {
  buyerRows: BuyerRow[];
  isLoading: boolean;
  error: string | null;
  onSelectBuyer?: (buyer: BuyerRow) => void;
};

export function BuyersTable({
  buyerRows,
  isLoading,
  error,
  onSelectBuyer,
}: BuyersTableProps) {
  const [showAllRows, setShowAllRows] = useState(false);
  const scorePriority: Record<BuyerRow["score"], number> = {
    Hot: 0,
    Warm: 1,
    Cold: 2,
  };
  const activeBuyerCount = buyerRows.length;
  const sortedBuyerRows = useMemo(() => {
    return [...buyerRows].sort(
      (a, b) => scorePriority[a.score] - scorePriority[b.score]
    );
  }, [buyerRows]);
  const visibleBuyerRows = useMemo(() => {
    if (showAllRows || sortedBuyerRows.length <= DEFAULT_VISIBLE_ROWS) {
      return sortedBuyerRows;
    }
    return sortedBuyerRows.slice(0, DEFAULT_VISIBLE_ROWS);
  }, [sortedBuyerRows, showAllRows]);
  const hasMoreRows = buyerRows.length > DEFAULT_VISIBLE_ROWS;
  const scoreTextClass: Record<BuyerRow["score"], string> = {
    Hot: "text-rose-600",
    Warm: "text-amber-600",
    Cold: "text-zinc-500",
  };
  const scoreDotClass: Record<BuyerRow["score"], string> = {
    Hot: "bg-rose-500",
    Warm: "bg-amber-500",
    Cold: "bg-zinc-400",
  };

  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      <header className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
        <div>
          <h2 className="text-md font-phudu font-medium uppercase tracking-wide text-[#0F172A]">My Buyers</h2>
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
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="px-4 py-4 text-sm text-zinc-500" colSpan={5}>
                  Loading buyers...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td className="px-4 py-4 text-sm text-rose-600" colSpan={5}>
                  {error}
                </td>
              </tr>
            ) : buyerRows.length === 0 ? (
              <tr>
                <td className="px-4 py-4 text-sm text-zinc-500" colSpan={5}>
                  No buyers connected to your referral URL yet.
                </td>
              </tr>
            ) : (
              visibleBuyerRows.map((row) => (
              <tr
                key={row.id}
                className="cursor-pointer border-t border-zinc-100 hover:bg-zinc-50"
                onClick={() => onSelectBuyer?.(row)}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {row.avatarUrl ? (
                      <img
                        src={row.avatarUrl}
                        alt={row.name}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-600">
                        {row.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-zinc-800">{row.name}</p>
                      <p className="text-xs text-zinc-500">{row.joinedAt}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-zinc-600">{row.lastActive}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 text-xs font-medium ${scoreTextClass[row.score]}`}>
                    <span className={`h-2 w-2 rounded-full ${scoreDotClass[row.score]}`} />
                    {row.score}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-600">{row.searches}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-600">
                      {row.preferenceAcreage || "Acreage: -"}
                    </span>
                    <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-600">
                      {row.preferenceBudget || "Budget: -"}
                    </span>
                    <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-600">
                      {row.preferenceTimeframe || "Timeframe: -"}
                    </span>
                  </div>
                </td>
              </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!isLoading && !error && hasMoreRows ? (
        <div className="border-t border-zinc-100 bg-zinc-50/80 px-4 py-2.5 text-center">
          <button
            type="button"
            onClick={() => setShowAllRows((prev) => !prev)}
            className="text-sm font-semibold text-brand-green underline-offset-2 hover:text-brand-green-hover hover:underline"
          >
            {showAllRows
              ? "Show less"
              : `Show all (${activeBuyerCount})`}
          </button>
        </div>
      ) : null}
    </section>
  );
}
