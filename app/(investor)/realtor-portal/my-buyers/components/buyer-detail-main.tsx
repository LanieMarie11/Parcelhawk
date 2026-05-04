"use client";

import { Eye, Search, Star, UserRound, Zap } from "lucide-react";
import MessageMembersIcon from "@/components/icons/message-members";

import type { ActivityRow, BuyerDetail } from "./types";

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "?";
  const b = parts[1]?.[0] ?? "";
  return `${a}${b}`.toUpperCase();
}

function ActivityIcon({ kind }: { kind: ActivityRow["kind"] }) {
  const base =
    "flex size-8 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-600";
  if (kind === "viewed")
    return (
      <span className={base}>
        <Eye className="size-3.5" />
      </span>
    );
  if (kind === "saved")
    return (
      <span className={base}>
        <Star className="size-3.5" />
      </span>
    );
  return (
    <span className={base}>
      <Search className="size-3.5" />
    </span>
  );
}

type BuyerDetailMainProps = {
  selected: BuyerDetail;
  search: string;
  onSearchChange: (value: string) => void;
};

export function BuyerDetailMain({ selected, search, onSearchChange }: BuyerDetailMainProps) {
  return (
    <main className="min-w-0 flex-1 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="flex items-center gap-2 text-[28px] font-phudu font-semibold uppercase tracking-wide text-[#0F172A]">
          <MessageMembersIcon />
          My buyers
        </h1>
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            placeholder="Search buyers..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-200"
          />
        </div>
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-start">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-zinc-200 to-zinc-300 text-lg font-medium text-zinc-700 sm:size-12">
              {initials(selected.name)}
            </span>
            <div className="min-w-0">
              <div className="flex min-w-0 flex-nowrap items-center gap-2">
                <p className="min-w-0 truncate text-lg font-phudu font-medium uppercase tracking-wide text-zinc-900">
                  {selected.name}
                </p>
                <span className="flex shrink-0 items-center gap-2 text-xs text-zinc-600">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-40" />
                    <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                  </span>
                  <span className="whitespace-nowrap">{selected.lastSeen}</span>
                </span>
              </div>
              <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-600">
                <span>{selected.email}</span>
                <span className="text-zinc-300">·</span>
                <span>{selected.phone}</span>
                <span className="text-zinc-300">·</span>
                <span>{selected.location}</span>
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center lg:justify-end">
            <span className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-[#D32F2F]">
              <Zap className="size-3.5" aria-hidden />
              {selected.priority} Priority
            </span>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Searches", value: selected.stats.searches },
            { label: "Searches", value: selected.stats.searches },
            { label: "Scheduled", value: selected.stats.scheduled },
            { label: "Unread", value: selected.stats.unread },
          ].map(({ label, value }, i) => (
            <div
              key={`${label}-${i}`}
              className="rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-3 text-center shadow-sm"
            >
              <p className="text-2xl font-semibold tabular-nums text-zinc-900">{value}</p>
              <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500">{label}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            className="rounded-xl bg-[#2D4A31] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#253e2a]"
          >
            Message
          </button>
          <button
            type="button"
            className="rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-50"
          >
            View Details
          </button>
        </div>
      </section>

      <section>
        <h3 className="text-[11px] font-phudu font-semibold uppercase tracking-wide text-zinc-500">
          Active search filters
        </h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {selected.filters.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-zinc-200 bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700"
            >
              {tag}
            </span>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h3 className="text-[11px] font-phudu font-semibold uppercase tracking-wide text-zinc-500">Saved property</h3>
        {selected.savedProperties.length === 0 ? (
          <p className="mt-4 py-8 text-center text-sm text-zinc-500">No saved properties yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-zinc-100">
            {selected.savedProperties.map((row) => (
              <li key={row.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-zinc-200 to-zinc-300 text-[10px] font-semibold text-zinc-600">
                  {initials(row.label)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-zinc-800">{row.label}</p>
                  <p className="truncate text-xs text-zinc-500">{row.subtitle}</p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-zinc-900">{row.price}</p>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                    row.status === "Viewing pending"
                      ? "border border-sky-200 bg-sky-50 text-sky-700"
                      : "border border-emerald-200 bg-emerald-50 text-emerald-800"
                  }`}
                >
                  {row.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[11px] font-phudu font-semibold uppercase tracking-wide text-zinc-500">Recent activity</h3>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
            Active
          </span>
        </div>
        {selected.activity.length === 0 ? (
          <p className="mt-4 py-6 text-center text-sm text-zinc-500">No recent activity.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {selected.activity.map((row) => (
              <li key={row.id} className="flex gap-3">
                <ActivityIcon kind={row.kind} />
                <div className="min-w-0">
                  <p className="text-sm text-zinc-800">{row.text}</p>
                  <p className="mt-1 text-xs text-zinc-500">{row.when}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
