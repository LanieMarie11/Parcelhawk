"use client";

import { ArrowUpDown, Users } from "lucide-react";
import MessageMembersIcon from "@/components/icons/message-members";
import type { BuyerDetail } from "./types";

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "?";
  const b = parts[1]?.[0] ?? "";
  return `${a}${b}`.toUpperCase();
}

function formatLastActive(value: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  const diffMs = Date.now() - date.getTime();
  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;

  if (diffMs < hourMs) {
    return `${Math.max(1, Math.floor(diffMs / minuteMs))}m ago`;
  }
  if (diffMs < dayMs) {
    return `${Math.max(1, Math.floor(diffMs / hourMs))}h ago`;
  }
  return `${Math.max(1, Math.floor(diffMs / dayMs))}d ago`;
}

type BuyersListSidebarProps = {
  buyers: BuyerDetail[];
  selectedId: string;
  onSelectId: (id: string) => void;
};

export function BuyersListSidebar({
  buyers,
  selectedId,
  onSelectId,
}: BuyersListSidebarProps) {
  return (
    <aside className="flex w-full flex-col border-r-0 border-zinc-100 lg:w-[min(320px,30%)] lg:shrink-0 lg:border-r lg:pr-4">
      <header className="flex items-center justify-between gap-2 pb-3">
        <h2 className="flex items-center gap-2 text-xl font-phudu font-medium uppercase tracking-wide text-[#0F172A]">
          <MessageMembersIcon />
          Linked buyers
        </h2>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
        >
          <ArrowUpDown className="size-3.5" />
          Sort by
        </button>
      </header>
      <div className="-mx-1 min-h-0 flex-1 space-y-1 overflow-y-auto pb-2">
        {buyers.map((b) => {
          const active = b.id === selectedId;
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => onSelectId(b.id)}
              className={`flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors ${
                active ? "bg-zinc-100" : "hover:bg-zinc-50"
              }`}
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-zinc-200 to-zinc-300 text-xs font-semibold text-zinc-700">
                {initials(b.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-md font-phudu font-medium uppercase tracking-wide text-zinc-900">
                  {b.name}
                </p>
                <p className="truncate text-xs font-ibm-plex-sans text-zinc-500">
                  {(b.location || "unkown") + " · " + formatLastActive(b.lastActiveAt)}
                </p>
              </div>
              <span className="flex h-7 shrink-0 items-center justify-center rounded-full border border-[#002C58] px-4 text-xs font-medium text-[#002850]">
                New
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
