"use client";

import { SlidersHorizontal } from "lucide-react";
import MessageMembersIcon from "@/components/icons/message-members";

export type BuyerThread = {
  id: string;
  threadId: string;
  name: string;
  preview: string;
  unread?: boolean;
  avatarUrl: string;
  email: string;
  phone: string;
  location?: string;
  preferenceBudget: string;
  preferenceAcreage: string;
  preferencePurpose: string;
  preferenceTimeframe: string;
  about?: string;
  lastActive?: string;
};

type LinkedBuyersPanelProps = {
  threads: BuyerThread[];
  isLoading: boolean;
  selectedBuyerId: string | null;
  onSelectBuyer: (buyerId: string) => void;
};

export function LinkedBuyersPanel({
  threads,
  isLoading,
  selectedBuyerId,
  onSelectBuyer,
}: LinkedBuyersPanelProps) {
  return (
    <aside className="flex h-full min-h-0 max-h-full flex-col overflow-hidden border-b border-zinc-200 bg-[#f6f8fa] lg:border-b-0 lg:border-r">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
        <div className="flex items-center gap-2 text-[#141f2f] align-middle">
          <MessageMembersIcon />
          <p className="text-xl font-medium font-phudu uppercase tracking-tight">
            Linked Buyers
          </p>
        </div>
        {/* <button
          type="button"
          className="inline-flex items-center gap-2 rounded-2xl border border-zinc-300 bg-[#f7f8fa] px-3 py-1.5 text-sm font-semibold text-[#3e6540] transition-colors hover:bg-[#eef2f0]"
        >
          <SlidersHorizontal className="size-5" strokeWidth={2} aria-hidden />
          Sort by
        </button> */}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <p className="px-4 py-4 text-sm text-zinc-500">Loading buyers...</p>
        ) : threads.length === 0 ? (
          <p className="px-4 py-4 text-sm text-zinc-500">No linked buyers found.</p>
        ) : (
          threads.map((thread) => (
            <button
              key={thread.id}
              type="button"
              onClick={() => onSelectBuyer(thread.id)}
              className={`flex w-full items-center gap-2.5 border-b border-zinc-200 px-3 py-2.5 text-left transition-colors ${
                thread.id === selectedBuyerId ? "bg-[#e7eaee]" : "hover:bg-zinc-100"
              }`}
            >
              {thread.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={thread.avatarUrl}
                  alt={thread.name}
                  className="size-10 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-sm font-semibold text-zinc-600">
                  {thread.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold leading-5 text-[#1d2630]">
                  {thread.name}
                </p>
                <p className="truncate text-[11px] leading-4 text-zinc-500">{thread.preview}</p>
              </div>
              {thread.unread ? (
                <span className="rounded-full border border-[#94dbe7] bg-[#e7f8fb] px-2 py-0.5 text-[10px] font-semibold text-[#36a7bf]">
                  Unread
                </span>
              ) : null}
            </button>
          ))
        )}
      </div>
    </aside>
  );
}
