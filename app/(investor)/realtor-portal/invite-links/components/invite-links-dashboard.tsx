"use client";

import { ArrowUp, Check, Copy, Mail, MessageCircle, Plus, UserCheck, UserPlus } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";

function buildInviteUrl(referralCode: string | null | undefined): string | null {
  if (!referralCode) return null;
  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL ?? "https://parcelhawk.com";
  return `${base.replace(/\/$/, "")}/sign-up?ref=${encodeURIComponent(referralCode)}`;
}

type InviteLinkStats = {
  totalJoined: number;
  joinedThisMonth: number;
  monthOverMonthTrend: string | null;
  activeJoined: number;
};

function formatStatValue(value: number): string {
  return value.toLocaleString("en-US");
}

/** Matches server `generateReferralCode()` — 12 random bytes as base64url. */
function generateReferralCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function InviteLinksDashboard() {
  const { data: session, update } = useSession();
  const inviteUrl = buildInviteUrl(session?.user?.referralUrl ?? null);
  const createLinkModalTitleId = useId();
  const createLinkReferralInputId = useId();

  const [stats, setStats] = useState<InviteLinkStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [draftReferralId, setDraftReferralId] = useState("");
  const [isSavingReferralId, setIsSavingReferralId] = useState(false);
  const copiedResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      try {
        setStatsLoading(true);
        const response = await fetch("/api/realtor-portal/invite-links");
        const data = (await response.json().catch(() => ({}))) as {
          stats?: InviteLinkStats;
          error?: string;
        };
        if (!response.ok || !data.stats) {
          if (!cancelled) setStats(null);
          return;
        }
        if (!cancelled) setStats(data.stats);
      } catch {
        if (!cancelled) setStats(null);
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    }

    void loadStats();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (copiedResetRef.current) clearTimeout(copiedResetRef.current);
    };
  }, []);

  const statCards = [
    {
      label: "Total Joined",
      value: statsLoading ? "—" : formatStatValue(stats?.totalJoined ?? 0),
      subtext: "All-time buyers",
      trend: null as string | null,
      icon: UserPlus,
    },
    {
      label: "Joined This Month",
      value: statsLoading ? "—" : formatStatValue(stats?.joinedThisMonth ?? 0),
      subtext: null,
      trend: statsLoading ? null : stats?.monthOverMonthTrend ?? null,
      icon: UserPlus,
    },
    {
      label: "Active Joined",
      value: statsLoading ? "—" : formatStatValue(stats?.activeJoined ?? 0),
      subtext: "Buyers with your referral code",
      trend: null,
      icon: UserCheck,
    },
  ] as const;

  const handleCopy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
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
    if (!inviteUrl) return;
    const subject = encodeURIComponent("Join my buyer pool on ParcelHawk");
    const body = encodeURIComponent(`Use this link to join: ${inviteUrl}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleWhatsAppShare = () => {
    if (!inviteUrl) return;
    const text = encodeURIComponent(`Join my buyer pool on ParcelHawk: ${inviteUrl}`);
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  };

  const openCreateModal = () => {
    setDraftReferralId("");
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    if (isSavingReferralId) return;
    setIsCreateModalOpen(false);
    setDraftReferralId("");
  };

  const handleGenerateReferralId = () => {
    setDraftReferralId(generateReferralCode());
  };

  const handleConfirmReferralId = async () => {
    const referralUrl = draftReferralId.trim();
    if (!referralUrl) {
      toast.error("Enter a referral ID or generate one");
      return;
    }
    if (referralUrl.length !== 16) {
      toast.warning("Referral ID must be exactly 16 characters");
      return;
    }

    try {
      setIsSavingReferralId(true);
      const response = await fetch("/api/realtor-portal/invite-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referralUrl }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        referralUrl?: string;
        error?: string;
      };
      if (!response.ok || !data.referralUrl) {
        toast.error(data.error ?? "Failed to save referral ID");
        return;
      }

      await update({ referralUrl: data.referralUrl });
      setIsCreateModalOpen(false);
      setDraftReferralId("");
      toast.success("Invite link updated");
    } catch {
      toast.error("Connection failed. Please try again.");
    } finally {
      setIsSavingReferralId(false);
    }
  };

  const isCreateModalBusy = isSavingReferralId;

  return (
    <div className="min-h-[calc(100vh-73px)] h-full bg-background px-4 pb-8 pt-6 font-ibm-plex-sans text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1400px] rounded-2xl border border-border bg-card p-4 shadow-sm lg:p-5">
        <header className="border-b border-border pb-3">
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
                    <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-brand-green">
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
                  value={inviteUrl ?? "Generating your invite link..."}
                  className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-700 outline-none"
                  aria-label="Referral invite link"
                />
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleCopy()}
                    disabled={!inviteUrl}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-green px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-green-hover active:bg-brand-green-active disabled:cursor-not-allowed disabled:opacity-60"
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
                    onClick={openCreateModal}
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
                  disabled={!inviteUrl}
                  className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Copy className="h-4 w-4 text-zinc-500" aria-hidden />
                  Copy Link
                </button>
                <button
                  type="button"
                  onClick={handleEmailShare}
                  disabled={!inviteUrl}
                  className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Mail className="h-4 w-4 text-zinc-500" aria-hidden />
                  Email
                </button>
                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  disabled={!inviteUrl}
                  className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <MessageCircle className="h-4 w-4 text-zinc-500" aria-hidden />
                  What&apos;s app
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={createLinkModalTitleId}
          onClick={closeCreateModal}
        >
          <div
            className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <h3
              id={createLinkModalTitleId}
              className="text-lg font-medium font-phudu uppercase tracking-tight text-[#16212f]"
            >
              Create New Link
            </h3>
            <p className="mt-1 text-sm text-zinc-500">
              Set a referral ID for your invite link. Buyers who sign up with this code will be linked to you.
            </p>

            <div className="mt-5">
              <label htmlFor={createLinkReferralInputId} className="text-xs font-medium text-zinc-600">
                Referral ID
              </label>
              <input
                id={createLinkReferralInputId}
                type="text"
                value={draftReferralId}
                onChange={(event) => setDraftReferralId(event.target.value)}
                placeholder="Enter or generate a referral ID"
                disabled={isCreateModalBusy}
                className="mt-2 w-full rounded-lg border border-border bg-muted px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-brand-green focus:ring-1 focus:ring-brand-green disabled:cursor-not-allowed disabled:opacity-60"
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={isCreateModalBusy}
                onClick={handleGenerateReferralId}
                className="rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Generate New
              </button>
              <button
                type="button"
                disabled={isCreateModalBusy}
                onClick={closeCreateModal}
                className="rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isCreateModalBusy}
                onClick={() => void handleConfirmReferralId()}
                className="rounded-lg bg-brand-green px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-green-hover active:bg-brand-green-active disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingReferralId ? "Saving..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
