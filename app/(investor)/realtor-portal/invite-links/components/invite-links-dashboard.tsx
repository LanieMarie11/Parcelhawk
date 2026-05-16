"use client";

import { ArrowUp, Check, Clock3, Copy, Mail, MessageCircle, Plus, UserPlus } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const MOCK_INVITE_LINK = "https://parcelhawk.com/join/fb-co-land-2024";

const statCards = [
  {
    label: "Total Joined",
    value: "3,016",
    subtext: "All-time buyers",
    trend: null as string | null,
    icon: UserPlus,
  },
  {
    label: "Joined This Month",
    value: "316",
    subtext: null,
    trend: "+18% vs last month",
    icon: UserPlus,
  },
  {
    label: "Pending",
    value: "7",
    subtext: "Awaiting confirmation",
    trend: null,
    icon: Clock3,
  },
] as const;

export function InviteLinksDashboard() {
  const [copied, setCopied] = useState(false);
  const copiedResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copiedResetRef.current) clearTimeout(copiedResetRef.current);
    };
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(MOCK_INVITE_LINK);
      if (copiedResetRef.current) clearTimeout(copiedResetRef.current);
      setCopied(true);
      copiedResetRef.current = setTimeout(() => {
        setCopied(false);
        copiedResetRef.current = null;
      }, 2000);
    } catch {
      // Clipboard can be unavailable in some browser contexts.
    }
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent("Join my buyer pool on ParcelHawk");
    const body = encodeURIComponent(`Use this link to join: ${MOCK_INVITE_LINK}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(`Join my buyer pool on ParcelHawk: ${MOCK_INVITE_LINK}`);
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-[calc(100vh-73px)] h-full px-4 pb-8 pt-6 font-ibm-plex-sans text-zinc-900 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1400px] rounded-2xl border border-zinc-200 bg-zinc-50 p-4 shadow-sm lg:p-5">
        <header className="border-b border-zinc-100 pb-3">
          <h1 className="text-2xl font-medium font-phudu uppercase tracking-tight text-[#16212f]">
            Invite Links
          </h1>
          <p className="mt-1 text-xs text-zinc-500">
            Create and track invite links to grow your buyer pool
          </p>
        </header>

        <section className="mt-4 grid gap-3 md:grid-cols-3">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <article key={card.label} className="rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium font-ibm-plex-sans text-[#000000]">{card.label}</p>
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-[#F3F3F5] text-zinc-500">
                    <Icon className="h-4 w-4" />
                  </span>
                </div>
                <div className="mt-2">
                  <p className="font-phudu text-[24px] font-medium leading-none text-[#1F1F1F]">{card.value}</p>
                  {card.trend ? (
                    <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                      <ArrowUp className="size-4 shrink-0 stroke-[2.5]" strokeLinecap="round" strokeLinejoin="round" aria-hidden />
                      {card.trend}
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-zinc-500">{card.subtext}</p>
                  )}
                </div>
              </article>
            );
          })}
        </section>

        <section className="mt-4 rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-100 px-4 py-3 lg:px-5">
            <h2 className="text-base font-medium font-phudu uppercase tracking-tight text-[#16212f]">
              Primary Invite Link
            </h2>
          </div>

          <div className="space-y-5 px-4 py-4 lg:px-5 lg:py-5">
            <div>
              <p className="text-xs font-medium text-zinc-600">Referral link generation</p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="text"
                  readOnly
                  value={MOCK_INVITE_LINK}
                  className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-700 outline-none"
                  aria-label="Referral invite link"
                />
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleCopy()}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-700 bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-800"
                  >
                    {copied ? (
                      <Check className="h-4 w-4" aria-hidden />
                    ) : (
                      <Copy className="h-4 w-4" aria-hidden />
                    )}
                    {copied ? "Copied" : "Copy Link"}
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
                  >
                    <Plus className="h-4 w-4" aria-hidden />
                    Create New Link
                  </button>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-zinc-600">Quick Share</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleCopy()}
                  className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
                >
                  <Copy className="h-4 w-4 text-zinc-500" aria-hidden />
                  Copy Link
                </button>
                <button
                  type="button"
                  onClick={handleEmailShare}
                  className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
                >
                  <Mail className="h-4 w-4 text-zinc-500" aria-hidden />
                  Email
                </button>
                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
                >
                  <MessageCircle className="h-4 w-4 text-zinc-500" aria-hidden />
                  What&apos;s app
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
