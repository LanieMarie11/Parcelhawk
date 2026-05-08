"use client";

import { CalendarDays, Eye, MessageCircle, TrendingUp } from "lucide-react";

import type { BuyerDetail } from "./types";

function formatRelativeLastActive(value: string) {
  if (!value) return "-";
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return value;

  const diffMs = Date.now() - timestamp;
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return "just now";
  if (diffMs < hour) return `${Math.floor(diffMs / minute)} min ago`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)} hr ago`;
  const days = Math.floor(diffMs / day);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function formatClientSince(value: string) {
  if (!value) return { dateLabel: "-", daysLabel: "-" };
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return { dateLabel: "-", daysLabel: "-" };

  const date = new Date(timestamp);
  const dateLabel = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const days = Math.max(0, Math.floor((Date.now() - timestamp) / 86_400_000));
  return {
    dateLabel,
    daysLabel: `${days} day${days === 1 ? "" : "s"}`,
  };
}

function cardClassName() {
  return "rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm";
}

export function BuyerSummaryCards({ selected }: { selected: BuyerDetail }) {
  const viewing = selected.savedProperties.reduce(
    (acc, row) => {
      if (row.viewingRequest === "pending") acc.pending += 1;
      if (row.viewingRequest === "scheduled") acc.scheduled += 1;
      if (row.viewingRequest === "completed") acc.completed += 1;
      return acc;
    },
    { pending: 0, scheduled: 0, completed: 0 },
  );

  const activityLevel = selected.stats.searches;
  const unreadMessages = selected.stats.unread;
  const clientSince = formatClientSince(selected.lastActiveAt);

  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <article className={cardClassName()}>
        <p className="flex items-center gap-2 text-lg font-phudu text-[#245B4E]">
          <TrendingUp className="size-4 text-[#26C6DA]" aria-hidden />
          Activity Level
        </p>
        <p className="mt-2 text-4xl font-bold leading-none text-black">{activityLevel}</p>
        <p className="mt-2 text-sm font-ibm-plex-sans text-[#7B82A8]">logins this week</p>
        <p className="text-sm font-ibm-plex-sans text-[#7B82A8]">{selected.stats.searches} searches</p>
        <p className="text-sm font-ibm-plex-sans text-[#7B82A8]">
          Last active: {formatRelativeLastActive(selected.lastActiveAt)}
        </p>
      </article>

      <article className={cardClassName()}>
        <p className="flex items-center gap-2 text-lg font-phudu text-[#245B4E]">
          <Eye className="size-4 text-[#7B82A8]" aria-hidden />
          Viewing Requests
        </p>
        <div className="mt-2 space-y-1 text-sm font-ibm-plex-sans text-[#7B82A8]">
          <p className="flex items-center justify-between">
            <span>Pending:</span>
            <span className="font-semibold text-black">{viewing.pending}</span>
          </p>
          <p className="flex items-center justify-between">
            <span>Scheduled:</span>
            <span className="font-semibold text-black">{viewing.scheduled}</span>
          </p>
          <p className="flex items-center justify-between">
            <span>Completed:</span>
            <span className="font-semibold text-black">{viewing.completed}</span>
          </p>
        </div>
      </article>

      <article className={cardClassName()}>
        <p className="flex items-center gap-2 text-lg font-phudu text-[#245B4E]">
          <MessageCircle className="size-4 text-[#7B82A8]" aria-hidden />
          Messages
        </p>
        <p className="mt-2 text-4xl font-bold leading-none text-black">{unreadMessages}</p>
        <p className="mt-2 text-sm font-ibm-plex-sans text-[#7B82A8]">unread messages</p>
      </article>

      <article className={cardClassName()}>
        <p className="flex items-center gap-2 text-lg font-phudu text-[#245B4E]">
          <CalendarDays className="size-4 text-[#7B82A8]" aria-hidden />
          Client Since
        </p>
        <p className="mt-2 text-4xl font-bold leading-none text-black">{clientSince.dateLabel}</p>
        <p className="mt-2 text-sm font-ibm-plex-sans text-[#7B82A8]">{clientSince.daysLabel}</p>
      </article>
    </div>
  );
}
