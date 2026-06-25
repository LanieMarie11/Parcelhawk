"use client";

import { useMemo, useState } from "react";
import { Flame } from "lucide-react";
import type { BuyerRow } from "./buyers-table";

const DEFAULT_VISIBLE_ROWS = 3;

export type HotBuyerItem = {
  id: string;
  name: string;
  avatarUrl: string;
  activity: string;
  tag: "Hot lead" | "Warm";
  accent: "bg-rose-500" | "bg-amber-500";
  lastActive: string;
};

type HotBuyersPanelProps = {
  hotBuyers: HotBuyerItem[];
  buyerRows: BuyerRow[];
  isLoading: boolean;
  onSelectBuyer?: (buyer: BuyerRow) => void;
};

export function HotBuyersPanel({ hotBuyers, buyerRows, isLoading, onSelectBuyer }: HotBuyersPanelProps) {
  const [showAllRows, setShowAllRows] = useState(false);
  const hotBuyerCount = hotBuyers.length;
  const visibleHotBuyers = useMemo(() => {
    if (showAllRows || hotBuyers.length <= DEFAULT_VISIBLE_ROWS) {
      return hotBuyers;
    }
    return hotBuyers.slice(0, DEFAULT_VISIBLE_ROWS);
  }, [hotBuyers, showAllRows]);
  const hasMoreRows = hotBuyers.length > DEFAULT_VISIBLE_ROWS;

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
          visibleHotBuyers.map((hotBuyer) => (
          <div
            key={hotBuyer.id}
            className="flex cursor-pointer items-center gap-4 rounded-lg px-3 py-3 hover:bg-zinc-50"
            onClick={() => {
              const buyer = buyerRows.find((row) => row.id === hotBuyer.id);
              if (buyer) onSelectBuyer?.(buyer);
            }}
          >
            <span className={`h-11 w-1 rounded-full ${hotBuyer.accent}`} />
            {hotBuyer.avatarUrl ? (
              <img src={hotBuyer.avatarUrl} alt={hotBuyer.name} className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-600">
                {hotBuyer.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-zinc-800">
                {hotBuyer.name} <span className="text-xs font-normal text-zinc-400">{hotBuyer.lastActive}</span>
                <span
                  className={`ml-2 hidden rounded-full border bg-zinc-50 px-2 py-0.5 text-[11px] font-medium sm:inline-flex ${
                    hotBuyer.tag.toLowerCase() === "hot lead"
                      ? "border-[#E62E2E] text-[#E62E2E]"
                      : "border-zinc-200 text-zinc-500"
                  }`}
                >
                  {hotBuyer.tag}
                </span>
              </p>
              <p className="truncate text-xs text-zinc-500">{hotBuyer.activity}</p>
            </div>
          </div>
          ))
        )}
      </div>

      {!isLoading && hotBuyerCount > 0 && hasMoreRows ? (
        <div className="border-t border-zinc-100 bg-zinc-50/80 px-4 py-2.5 text-center">
          <button
            type="button"
            onClick={() => setShowAllRows((prev) => !prev)}
            className="text-sm font-semibold text-brand-green underline-offset-2 hover:text-brand-green-hover hover:underline"
          >
            {showAllRows ? "Show less" : `Show all (${hotBuyerCount})`}
          </button>
        </div>
      ) : null}
    </section>
  );
}
