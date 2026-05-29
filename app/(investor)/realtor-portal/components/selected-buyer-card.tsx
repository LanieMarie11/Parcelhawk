"use client";

import { UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { ProfileRichText } from "@/lib/profile-rich-text";
import type { BuyerRow } from "./buyers-table";

type SelectedBuyerCardProps = {
  buyer: BuyerRow;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "?";
  const b = parts[1]?.[0] ?? "";
  return `${a}${b}`.toUpperCase();
}

export function SelectedBuyerCard({ buyer }: SelectedBuyerCardProps) {
  const router = useRouter();
  const scoreClassName =
    buyer.score === "Hot"
      ? "border-rose-200 bg-rose-50 text-rose-600"
      : buyer.score === "Warm"
        ? "border-amber-200 bg-amber-50 text-amber-600"
        : "border-zinc-300 bg-zinc-100 text-zinc-600";

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <h2 className="flex items-center gap-2 text-md font-phudu font-medium uppercase tracking-wide text-[#0F172A]">
        <UserRound className="h-4 w-4 text-[#0F172A]" />
        Selected Buyer
      </h2>
      <div className="mt-3 rounded-xl border border-zinc-200 p-3">
        <div className="flex items-center gap-3">
          {buyer.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={buyer.avatarUrl}
              alt={buyer.name}
              className="size-11 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-zinc-200 to-zinc-300 text-xs font-semibold text-zinc-700">
              {initials(buyer.name)}
            </span>
          )}
          <div>
            <p className="text-sm font-medium font-phudu text-zinc-800">{buyer.name.toUpperCase()}</p>
            <p className="text-xs text-zinc-500">Active {buyer.lastActive}</p>
          </div>
          <span className={`ml-auto rounded-full border px-2 py-0.5 text-[10px] font-semibold ${scoreClassName}`}>{buyer.score}</span>
        </div>
        <button
          type="button"
          className="mt-3 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          onClick={() => router.push("/realtor-portal/messages")}
        >
          Send Message
        </button>
      </div>

      <div className="mt-4 space-y-2 text-sm">
        <h3 className="text-xs font-medium font-phudu uppercase tracking-wide text-[#030303]">Search Profile</h3>
        <div className="grid grid-cols-2 gap-y-2 font-medium text-xs font-ibm-plex-sans text-zinc-600">
          <span className="text-zinc-400">Location</span>
          <span className="text-[#0F172A]">{buyer.location || "-"}</span>
          <span className="text-zinc-400">Budget</span>
          <span className="text-[#0F172A]">{buyer.preferenceBudget || "-"}</span>
          <span className="text-zinc-400">Acreage</span>
          <span className="text-[#0F172A]">{buyer.preferenceAcreage || "-"}</span>
          <span className="text-zinc-400">Timeframe</span>
          <span className="text-[#0F172A]">{buyer.preferenceTimeframe || "-"}</span>
          <span className="text-zinc-400">About</span>
        </div>
        <ProfileRichText
          content={buyer.about}
          emptyClassName="text-xs font-normal text-[#0F172A]"
        />
      </div>

{/* TODO : add recent activity */}
      {/* <div className="mt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[#030303]">Recent Activity</h3>
        <ul className="mt-2 space-y-2 text-xs text-[#64748B]">
          <li className="flex items-start gap-2">
            <Eye className="mt-0.5 h-3.5 w-3.5 text-zinc-400" />
            Buyer is showing recent activity
          </li>
          <li className="flex items-start gap-2">
            <Send className="mt-0.5 h-3.5 w-3.5 text-zinc-400" />
            Click "Send Message" to follow up
          </li>
          <li className="flex items-start gap-2">
            <Search className="mt-0.5 h-3.5 w-3.5 text-zinc-400" />
            Searches recorded: {buyer.searches}
          </li>
        </ul>
      </div> */}
    </section>
  );
}
