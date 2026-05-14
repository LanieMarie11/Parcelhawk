"use client";

import { Check, Copy, Link2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

export function InviteLinkCard() {
  const { data: session } = useSession();
  const [copied, setCopied] = useState(false);
  const copiedResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const referralCode = session?.user?.referralUrl ?? null;
  const inviteLink = referralCode
    ? `parcelhawk.ai/sign-up?ref=${encodeURIComponent(referralCode)}`
    : null;

  useEffect(() => {
    return () => {
      if (copiedResetRef.current) clearTimeout(copiedResetRef.current);
    };
  }, []);

  const handleCopy = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
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

  return (
    <section className="rounded-xl bg-[#022A43] font-ibm-plex-sans p-4 text-white shadow-sm">
      <h2 className="flex items-center gap-2 text-sm font-medium font-phudu uppercase tracking-wide">
        <Link2 className="h-4 w-4" />
        Your Invite Link
      </h2>
      <p className="mt-1 text-xs opacity-80">Share with clients to add them to your buyer pool</p>
      <div className="mt-3 flex items-center rounded-lg bg-white/10 p-1 text-xs">
        <span className="truncate px-2 text-blue-50">
          {inviteLink ?? "Generating your invite link..."}
        </span>
        <button
          type="button"
          onClick={() => void handleCopy()}
          disabled={!inviteLink}
          className="ml-auto inline-flex items-center gap-1 rounded-md bg-white/15 px-3 py-1.5 font-semibold text-white hover:bg-white/25"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <Copy className="h-3.5 w-3.5" aria-hidden />
          )}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <p className="mt-4 text-[11px] text-blue-100">
        Tip: Share this link with buyers so they are connected to your referral pipeline automatically.
      </p>
    </section>
  );
}
