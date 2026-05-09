"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye, Mail, MapPin, Phone, Search, Star, UserRound, Zap } from "lucide-react";
import MessageMembersIcon from "@/components/icons/message-members";
import { LastActiveText } from "./last-active-text";
import { BuyerSummaryCards } from "./buyer-summary-cards";

import type { ActivityRow, BuyerDetail, SavedPropertyRow, SavedPropertyViewRequest } from "./types";

function viewingRequestBadgeClasses(kind: Exclude<SavedPropertyViewRequest, "none">) {
  if (kind === "pending")
    return "border border-amber-300 bg-amber-50 text-amber-800";
  return "border border-sky-200 bg-sky-50 text-sky-700";
}

function viewingRequestLabel(kind: Exclude<SavedPropertyViewRequest, "none">) {
  if (kind === "pending") return "Viewing Request pending";
  if (kind === "scheduled") return "Viewing Request Scheduled";
  return "Viewing Request Completed";
}

function SavedPropertyThumbnail({ row }: { row: SavedPropertyRow }) {
  return (
    <div className="relative size-14 shrink-0 overflow-hidden rounded-md bg-zinc-200">
      <Image
        src={row.thumbnailSrc}
        alt="Property thumbnail"
        fill
        className="object-cover"
        sizes="56px"
      />
    </div>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "?";
  const b = parts[1]?.[0] ?? "";
  return `${a}${b}`.toUpperCase();
}

function ActivityIcon({ kind }: { kind: ActivityRow["kind"] }) {
  const base =
    "flex size-8 shrink-0 items-center justify-center rounded-full border text-zinc-600";
  if (kind === "viewed")
    return (
      <span className={`${base} bg-[#E6EAEE]`}>
        <Eye className="size-3.5 text-[#002C58]" />
      </span>
    );
  if (kind === "saved")
    return (
      <span className={`${base} bg-[#E9F7EE]`}>
        <Star className="size-3.5 text-[#166534]" />
      </span>
    );
  return (
    <span className={`${base}  bg-[#F8F9FB]`}>
      <Search className="size-3.5 text-[#64748B]" />
    </span>
  );
}

function activityKindLabel(kind: ActivityRow["kind"]) {
  if (kind === "saved") return "Saved Property";
  if (kind === "searched") return "Saved Search";
  return "Viewing Request";
}

type BuyerDetailMainProps = {
  selected: BuyerDetail;
  search: string;
  onSearchChange: (value: string) => void;
};

export function BuyerDetailMain({ selected, search, onSearchChange }: BuyerDetailMainProps) {
  const router = useRouter();
  const [showAllActivity, setShowAllActivity] = useState(false);
  const hasMoreActivity = selected.activity.length > 5;
  const visibleActivity = showAllActivity ? selected.activity : selected.activity.slice(0, 5);

  useEffect(() => {
    setShowAllActivity(false);
  }, [selected.id]);

  return (
    <main className="min-h-0 min-w-0 flex-1 space-y-6 overflow-y-auto">
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
            {selected.avatarUrl ? (
              <img
                src={selected.avatarUrl}
                alt={selected.name}
                className="size-12 shrink-0 rounded-full object-cover sm:size-12"
              />
            ) : (
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-zinc-200 to-zinc-300 text-lg font-medium text-zinc-700 sm:size-12">
                {initials(selected.name)}
              </span>
            )}
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
                  <span className="whitespace-nowrap">
                    <LastActiveText value={selected.lastActiveAt} />
                  </span>
                </span>
              </div>
              <p className="mt-2 flex flex-col flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-600">
                <span className="inline-flex items-center gap-1">
                  <Mail className="size-3.5 text-zinc-400" aria-hidden />
                  <span>{selected.email}</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <Phone className="size-3.5 text-zinc-400" aria-hidden />
                  <span>{selected.phone}</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5 text-zinc-400" aria-hidden />
                  <span>{selected.location}</span>
                </span>
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

        <BuyerSummaryCards selected={selected} />

        <div className="mt-5 grid gap-3">
          <button
            type="button"
            onClick={() => router.push("/realtor-portal/messages")}
            className="rounded-xl bg-[#2D5A36] px-4 py-3 text-md font-ibm-plex-sans font-medium text-white transition-colors hover:bg-[#244b30]"
          >
            Message
          </button>
        </div>
      </section>

      <section>
        <h3 className="text-md font-phudu font-medium uppercase tracking-wide text-[#030303]">
          Buyer's Preference
        </h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full border border-zinc-200 bg-[#F1F5F9] font-ibm-plex-sans px-3 py-1 text-xs font-medium text-[#030303]">
            Acres range: {selected.preferenceAcreage || "-"}
          </span>
          <span className="rounded-full border border-zinc-200 bg-[#F1F5F9] font-ibm-plex-sans px-3 py-1 text-xs font-medium text-[#030303]">
            Budget range: {selected.preferenceBudget || "-"}
          </span>
          <span className="rounded-full border border-zinc-200 bg-[#F1F5F9] font-ibm-plex-sans px-3 py-1 text-xs font-medium text-[#030303]">
            Timeframe: {selected.preferenceTimeframe || "-"}
          </span>
          <span className="rounded-full border border-zinc-200 bg-[#F1F5F9] font-ibm-plex-sans px-3 py-1 text-xs font-medium text-[#030303]">
            Buy for: {selected.preferencePurpose || "-"}
          </span>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h3 className="text-md font-phudu font-medium uppercase tracking-wide text-[#030303]">
          Saved property
        </h3>
        {selected.savedProperties.length === 0 ? (
          <p className="mt-4 py-8 text-center text-sm text-zinc-500">No saved properties yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-zinc-100">
            {selected.savedProperties.map((row) => (
              <li
                key={row.id}
                className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <SavedPropertyThumbnail row={row} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-md font-medium font-phudu text-[#0F172A]">{row.price}</p>
                    <p className="truncate text-xs font-ibm-plex-sans text-[#64748B]">{row.subtitle}</p>
                    <p className="mt-1 flex items-start gap-1 text-sm text-[#373940]">
                      <MapPin className="mt-0.5 size-3 shrink-0 text-zinc-400" aria-hidden />
                      {row.url ? (
                        <a
                          href={row.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          {row.address}
                        </a>
                      ) : (
                        <span>{row.address}</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:pl-2">
                  <span className="rounded-full border border-slate-400 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-800">
                    {row.acreageLabel}
                  </span>
                  {row.viewingRequest !== "none" ? (
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${viewingRequestBadgeClasses(row.viewingRequest)}`}
                    >
                      {viewingRequestLabel(row.viewingRequest)}
                    </span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-md font-phudu font-medium uppercase tracking-wide text-[#030303]">Recent activity</h3>
          {hasMoreActivity ? (
            <button
              type="button"
              onClick={() => setShowAllActivity((current) => !current)}
              className="text-xs font-semibold text-[#2D5A36] hover:underline"
            >
              {showAllActivity ? "Show less" : "Show all"}
            </button>
          ) : null}
        </div>
        {selected.activity.length === 0 ? (
          <p className="mt-4 py-6 text-center text-sm text-zinc-500">No recent activity.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {visibleActivity.map((row) => (
              <li key={row.id} className="flex gap-3 rounded-lg border border-zinc-100 bg-zinc-50/50 px-3 py-2">
                <ActivityIcon kind={row.kind} />
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    {activityKindLabel(row.kind)}
                  </p>
                  <p className="text-sm text-zinc-800">{row.text}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {row.when ? <LastActiveText value={row.when} /> : "Recently"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
