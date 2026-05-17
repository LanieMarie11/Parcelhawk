"use client";

import { useMemo, useState } from "react";
import { Clock3, DollarSign, Link2, LocateFixed, Maximize2, UserCheck, UserPlus } from "lucide-react";

const DEFAULT_VISIBLE_ROWS = 4;

export type PreferenceInsightRow = {
  label: string;
  value: number;
  width: number;
};

export type PreferenceInsights = {
  states: PreferenceInsightRow[];
  acreage: PreferenceInsightRow[];
  priceBands: PreferenceInsightRow[];
};

export type HighestIntentBuyer = {
  id: string;
  name: string;
  joined: string;
  lastActive: string;
  searches: number;
  saves: number;
  requests: number;
};

const PREFERENCE_GROUP_META = [
  { key: "states" as const, title: "Top Searched States", icon: LocateFixed },
  { key: "acreage" as const, title: "Top Acreage Ranges", icon: Maximize2 },
  { key: "priceBands" as const, title: "Top Price Bands", icon: DollarSign },
] as const;

// const inviteStats = [
//   { label: "Invite Link Clicks", value: 245, icon: Link2, color: "bg-sky-100 text-sky-600" },
//   { label: "Active Invited Buyers", value: 68, icon: UserPlus, color: "bg-sky-100 text-sky-600" },
//   { label: "Buyers Joined", value: 87, icon: UserCheck, color: "bg-emerald-100 text-emerald-600" },
//   { label: "Pending Invites", value: 19, icon: Clock3, color: "bg-lime-100 text-lime-600" },
// ];

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
}

export function RealtorAnalyticsPreferences({
  preferenceInsights,
  highestIntentBuyers,
  isLoading,
}: {
  preferenceInsights: PreferenceInsights;
  highestIntentBuyers: HighestIntentBuyer[];
  isLoading: boolean;
}) {
  const preferenceGroups = PREFERENCE_GROUP_META.map((meta) => ({
    title: meta.title,
    icon: meta.icon,
    rows: preferenceInsights[meta.key],
  }));

  const [showAllRows, setShowAllRows] = useState(false);
  const intentBuyerCount = highestIntentBuyers.length;
  const visibleIntentBuyers = useMemo(() => {
    if (showAllRows || intentBuyerCount <= DEFAULT_VISIBLE_ROWS) {
      return highestIntentBuyers;
    }
    return highestIntentBuyers.slice(0, DEFAULT_VISIBLE_ROWS);
  }, [highestIntentBuyers, intentBuyerCount, showAllRows]);
  const hasMoreIntentBuyers = intentBuyerCount > DEFAULT_VISIBLE_ROWS;

  return (
    <section className="mt-3 space-y-3">
      <article className="rounded-xl border border-zinc-200 bg-white p-4">
        <h3 className="text-[16px] font-medium font-phudu uppercase tracking-tight text-[#182231]">Buyer Preference Insights</h3>
        <p className="text-xs font-ibm-plex-sans font-regular text-zinc-500">
          Explore buyer intent and engagement insights to support smarter decisions.
        </p>

        <div className="mt-3 grid gap-3 xl:grid-cols-3">
          {preferenceGroups.map((group) => {
            const Icon = group.icon;
            return (
              <div
                key={group.title}
                className="rounded-lg border border-[#F3F3F5] bg-[#FAFAFA] p-3"
              >
                <div className="flex items-center gap-2 border-b border-zinc-200 pb-2">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded bg-[#FFFFFF] text-[#484A54]">
                    <Icon className="h-4 w-4" />
                  </span>
                  <p className="text-lg font-ibm-plex-sans font-medium text-zinc-700">{group.title}</p>
                </div>

                <div className="mt-3 space-y-3">
                  {isLoading ? (
                    <>
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="h-3 w-28 animate-pulse rounded bg-zinc-200" />
                            <div className="h-3 w-8 animate-pulse rounded bg-zinc-200" />
                          </div>
                          <div className="h-1.5 rounded bg-zinc-200">
                            <div className="h-1.5 w-1/2 animate-pulse rounded bg-zinc-100" />
                          </div>
                        </div>
                      ))}
                    </>
                  ) : group.rows.length === 0 ? (
                    <p className="text-xs text-zinc-500">
                      No saved search signals from linked buyers in the last 30 days.
                    </p>
                  ) : (
                    group.rows.map((row) => (
                      <div key={row.label} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs text-zinc-700">
                          <span>{row.label}</span>
                          <span>{row.value}</span>
                        </div>
                        <div className="h-1.5 rounded bg-zinc-200">
                          <div className="h-1.5 rounded bg-[#2D5A36]" style={{ width: `${row.width}%` }} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </article>

      <div className="grid gap-3">
        <article className="rounded-xl border border-zinc-200 bg-white py-4">
          <h3 className="px-4 text-[16px] font-medium font-phudu uppercase tracking-tight text-[#182231]">Highest Intent Buyers</h3>
          <p className="px-4 text-xs font-ibm-plex-sans font-regular text-zinc-500">
            Analyze buyer intent signals to focus on the most valuable opportunities.
          </p>

          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="border-b border-t border-zinc-200 bg-[#FAFBFC] text-[#030303]">
                <tr>
                  <th className="py-2 pr-3 text-center font-semibold">Buyer</th>
                  <th className="py-2 pr-3 text-center font-semibold">Last active</th>
                  <th className="py-2 pr-3 text-center font-semibold">Searches</th>
                  <th className="py-2 pr-3 text-center font-semibold">Saves Properties</th>
                  <th className="py-2 pr-3 text-center font-semibold">Viewing Requests</th>
                  <th className="py-2 text-center font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <>
                    {Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="border-b border-zinc-100 last:border-0">
                        <td className="py-2.5 pr-3" colSpan={6}>
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 animate-pulse rounded-full bg-zinc-200" />
                            <div className="space-y-1.5">
                              <div className="h-3 w-32 animate-pulse rounded bg-zinc-200" />
                              <div className="h-2.5 w-24 animate-pulse rounded bg-zinc-100" />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </>
                ) : highestIntentBuyers.length === 0 ? (
                  <tr>
                    <td className="py-6 text-center text-xs text-zinc-500" colSpan={6}>
                      No active linked buyers. Invite buyers from your referral link to see intent signals here.
                    </td>
                  </tr>
                ) : (
                  visibleIntentBuyers.map((buyer) => (
                    <tr key={buyer.id} className="border-b border-zinc-100 last:border-0">
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center gap-2 justify-center">
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-semibold text-zinc-700">
                            {initials(buyer.name)}
                          </span>
                          <div>
                            <p className="font-semibold text-zinc-800">{buyer.name}</p>
                            <p className="text-[11px] text-zinc-500">{buyer.joined}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 pr-3 text-center text-zinc-500">{buyer.lastActive}</td>
                      <td className="py-2.5 pr-3 text-center text-zinc-700">{buyer.searches}</td>
                      <td className="py-2.5 pr-3 text-center text-zinc-700">{buyer.saves}</td>
                      <td className="py-2.5 pr-3 text-center text-zinc-700">{buyer.requests}</td>
                      <td className="py-2.5 text-center">
                        <button
                          type="button"
                          className="rounded-md bg-emerald-800 px-3 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-emerald-900"
                        >
                          Contact Now
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!isLoading && hasMoreIntentBuyers ? (
            <div className="mt-0 border-t border-zinc-100 bg-zinc-50/80 px-4 py-2.5 text-center">
              <button
                type="button"
                onClick={() => setShowAllRows((prev) => !prev)}
                className="text-sm font-semibold text-emerald-800 underline-offset-2 hover:text-emerald-950 hover:underline"
              >
                {showAllRows ? "Show less" : `Show all (${intentBuyerCount})`}
              </button>
            </div>
          ) : null}
        </article>

        {/* <article className="rounded-xl border border-zinc-200 bg-white p-4 xl:col-span-3">
          <h3 className="text-[16px] font-medium font-phudu uppercase tracking-tight text-[#0F172A]">Invite & Referral Analytics</h3>

          <div className="mt-3 space-y-3 rounded-lg border border-zinc-200 p-3">
            {inviteStats.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center gap-3">
                  <span className={`inline-flex h-9 w-9 items-center justify-center rounded-md ${item.color}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-ibm-plex-sans font-regular text-zinc-500">{item.label}</p>
                    <p className="text-[20px] font-medium font-phudu leading-none text-zinc-900">{item.value}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </article> */}
      </div>
    </section>
  );
}
