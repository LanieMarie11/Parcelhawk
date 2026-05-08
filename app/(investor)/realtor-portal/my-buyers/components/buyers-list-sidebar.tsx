"use client";

import { ArrowUpDown, Users } from "lucide-react";
import MessageMembersIcon from "@/components/icons/message-members";
import { LastActiveText } from "./last-active-text";
import type { BuyerDetail } from "./types";

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "?";
  const b = parts[1]?.[0] ?? "";
  return `${a}${b}`.toUpperCase();
}

type BuyersListSidebarProps = {
  buyers: BuyerDetail[];
  selectedId: string;
  onSelectId: (id: string) => void;
};

function scoreBadge(buyer: BuyerDetail): "hot" | "warm" | "cold" {
  const hasViewingRequest =
    (buyer.viewingRequests?.pending ?? 0) +
      (buyer.viewingRequests?.scheduled ?? 0) +
      (buyer.viewingRequests?.completed ?? 0) >
    0;

  if (hasViewingRequest) return "hot";

  const timestamp = Date.parse(buyer.lastActiveAt);
  if (!Number.isFinite(timestamp)) return "cold";

  const diffMs = Date.now() - timestamp;
  const day = 86_400_000;
  if (diffMs <= day) return "hot";
  if (diffMs <= 7 * day) return "warm";
  return "cold";
}

export function BuyersListSidebar({
  buyers,
  selectedId,
  onSelectId,
}: BuyersListSidebarProps) {
  return (
    <aside className="flex w-full flex-col border-r-0 border-zinc-100 lg:w-[min(320px,30%)] lg:shrink-0 lg:border-r lg:pr-4">
      <header className="flex items-center justify-between gap-2 pb-3">
        <h2 className="flex items-center gap-2 text-xl font-medium font-phudu uppercase tracking-tight text-[#141f2f]">
          <MessageMembersIcon />
          Linked buyers
        </h2>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-sm font-semibold text-zinc-600 transition-colors hover:bg-zinc-50"
        >
          <ArrowUpDown className="size-3.5" />
          Sort by
        </button>
      </header>
      <div className="-mx-1 min-h-0 flex-1 space-y-1 overflow-y-auto pb-2">
        {buyers.map((b) => {
          const active = b.id === selectedId;
          const score = scoreBadge(b);
          const rowClassName = [
            "flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors",
            active ? "bg-zinc-100" : "hover:bg-zinc-50",
          ].join(" ");
          const badgeColorClass =
            score === "hot"
              ? "border-rose-500 text-rose-600 bg-[#FDEAEA]"
              : score === "warm"
                ? "border-amber-500 text-amber-600 bg-[#FDF7E6]"
                : "border-[#00A6E8] text-[#00A6E8] bg-[#E6F6FD]";
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => onSelectId(b.id)}
              className={rowClassName}
            >
              {b.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={b.avatarUrl}
                  alt={b.name}
                  className="size-11 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-zinc-200 to-zinc-300 text-xs font-semibold text-zinc-700">
                  {initials(b.name)}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold uppercase tracking-tight leading-5 text-[#1d2630]">
                  {b.name}
                </p>
                <p className="truncate text-[11px] leading-4 text-zinc-500">
                  {b.location || "unkown"} · <LastActiveText value={b.lastActiveAt} />
                </p>
              </div>
              <span
                className={`flex h-7 shrink-0 items-center justify-center rounded-full border px-4 text-xs font-medium ${badgeColorClass}`}
              >
                {score}
              </span>
            </button>
          );
        })}
        {buyers.length === 0 && (
          <p className="px-2 py-6 text-center text-sm text-zinc-500">No buyers match your search.</p>
        )}
      </div>
    </aside>
  );
}
