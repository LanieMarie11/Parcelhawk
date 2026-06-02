"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpDown, Check } from "lucide-react";
import MessageMembersIcon from "@/components/icons/message-members";
import { buyerIntentScore } from "@/lib/buyer-intent-score";
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

  return buyerIntentScore({ lastActiveAt: buyer.lastActiveAt, hasViewingRequest });
}

export function BuyersListSidebar({
  buyers,
  selectedId,
  onSelectId,
}: BuyersListSidebarProps) {
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"hot" | "warm" | "cold">("hot");
  const sortMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!sortMenuRef.current?.contains(event.target as Node)) {
        setIsSortOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const sortedBuyers = useMemo(() => {
    const baseOrder: Array<"hot" | "warm" | "cold"> = ["hot", "warm", "cold"];
    const prioritizedOrder = [sortBy, ...baseOrder.filter((score) => score !== sortBy)];
    const priorityMap = new Map(prioritizedOrder.map((score, index) => [score, index]));

    return [...buyers].sort((a, b) => {
      const aScore = scoreBadge(a);
      const bScore = scoreBadge(b);
      return (priorityMap.get(aScore) ?? 99) - (priorityMap.get(bScore) ?? 99);
    });
  }, [buyers, sortBy]);

  const sortOptions: Array<{ value: "hot" | "warm" | "cold"; label: string }> = [
    { value: "hot", label: "Hot buyers" },
    { value: "cold", label: "Cold buyers" },
    { value: "warm", label: "Warm buyers" },
  ];

  return (
    <aside className="flex w-full flex-col border-r-0 border-zinc-100 lg:w-[min(320px,30%)] lg:shrink-0 lg:border-r lg:pr-4">
      <header className="flex items-center border-b w-full justify-between gap-2 pb-3">
        <h2 className="flex items-center gap-1 text-xl font-medium font-phudu uppercase tracking-tight text-[#141f2f]">
          <MessageMembersIcon />
          My buyers
        </h2>
        <div className="relative" ref={sortMenuRef}>
          <button
            type="button"
            onClick={() => setIsSortOpen((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-sm font-semibold text-zinc-600 transition-colors hover:bg-zinc-50"
            aria-haspopup="menu"
            aria-expanded={isSortOpen}
          >
            <ArrowUpDown className="size-3.5" />
            Sort by
          </button>
          {isSortOpen ? (
            <div
              role="menu"
              className="absolute right-0 top-[calc(100%+8px)] z-30 min-w-[190px] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-lg"
            >
              {sortOptions.map((option) => {
                const active = option.value === sortBy;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="menuitemradio"
                    aria-checked={active}
                    onClick={() => {
                      setSortBy(option.value);
                      setIsSortOpen(false);
                    }}
                    className={`flex w-full items-center justify-between px-5 py-2.5 text-left text-[14px] transition-colors ${
                      active
                        ? "bg-[#A8D7B7] text-[#1F4F35]"
                        : "text-zinc-700 hover:bg-zinc-50"
                    }`}
                  >
                    <span>{option.label}</span>
                    {active ? <Check className="size-5 text-[#0FA958]" /> : null}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </header>
      <div className="-mx-2 min-h-0 flex-1 overflow-y-auto pb-2">
        {sortedBuyers.map((b) => {
          const active = b.id === selectedId;
          const score = scoreBadge(b);
          const rowClassName = [
            "flex w-full items-center gap-3 border-b border-zinc-100 px-3 py-2 text-left transition-colors",
            active ? "bg-zinc-50" : "hover:bg-zinc-50",
          ].join(" ");
          const badgeColorClass =
            score === "hot"
              ? "border-rose-500 text-rose-500 bg-[#FDEAEA]"
              : score === "warm"
                ? "border-amber-500 text-amber-500 bg-[#FDF7E6]"
                : "border-[#19A0FF] text-[#19A0FF] bg-[#E6F6FD]";
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
                <p className="truncate text-[16px] font-phudu font-medium uppercase tracking-tight leading-5 text-[#1d2630]">
                  {b.name}
                </p>
                <p className="truncate text-[12px] leading-4 text-[#6577A0]">
                  {b.location || "unknown"}
                  {" · "}
                  <LastActiveText value={b.lastActiveAt} />
                </p>
              </div>
              <span
                className={`flex h-6 min-w-[50px] shrink-0 items-center justify-center rounded-full border px-2 text-xs font-medium capitalize ${badgeColorClass}`}
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
