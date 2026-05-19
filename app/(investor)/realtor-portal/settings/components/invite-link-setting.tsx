"use client"

import { Check, Copy } from "lucide-react"
import { useSession } from "next-auth/react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

function Toggle({
  enabled,
  onToggle,
  id,
}: {
  enabled: boolean
  onToggle: () => void
  id: string
}) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={enabled}
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
        enabled ? "bg-emerald-500" : "bg-zinc-200"
      }`}
    >
      <span className="sr-only">Toggle invite link</span>
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
          enabled ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  )
}

function buildInviteUrl(referralCode: string | null | undefined): string | null {
  if (!referralCode) return null
  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL ?? "https://parcelhawk.com"
  return `${base.replace(/\/$/, "")}/sign-up?ref=${encodeURIComponent(referralCode)}`
}

export default function InviteLinkSetting() {
  const { data: session } = useSession()
  const referralCode = session?.user?.referralUrl ?? null
  const inviteUrl = buildInviteUrl(referralCode)

  const [inviteEnabled, setInviteEnabled] = useState(true)
  const [copied, setCopied] = useState(false)
  const copiedResetRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (copiedResetRef.current) clearTimeout(copiedResetRef.current)
    }
  }, [])

  const handleCopy = async () => {
    if (!inviteUrl || !inviteEnabled) return
    try {
      await navigator.clipboard.writeText(inviteUrl)
      if (copiedResetRef.current) clearTimeout(copiedResetRef.current)
      setCopied(true)
      copiedResetRef.current = setTimeout(() => {
        setCopied(false)
        copiedResetRef.current = null
      }, 2000)
      toast.success("Invite link copied")
    } catch {
      toast.error("Could not copy link")
    }
  }

  return (
    <section className="rounded-lg border border-border bg-card p-6">
      <div className="flex items-start justify-between gap-4 border-b border-border pb-5">
        <div>
          <h2 className="text-lg font-semibold text-card-foreground">Invite Link Setting</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure how clients join your ParcelHawk circle.
          </p>
        </div>
        <Toggle
          id="invite-link-enabled"
          enabled={inviteEnabled}
          onToggle={() => setInviteEnabled((prev) => !prev)}
        />
      </div>

      <div className={`pt-5 ${!inviteEnabled ? "pointer-events-none opacity-50" : ""}`}>
        <p className="text-sm font-semibold text-card-foreground">Your Invite URL</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <input
            type="text"
            readOnly
            value={inviteUrl ?? "Generating your invite link..."}
            className="min-w-0 flex-1 rounded-lg border border-border bg-zinc-50 px-3 py-2.5 text-sm text-zinc-700 outline-none"
            aria-label="Your invite URL"
          />
          <button
            type="button"
            onClick={() => void handleCopy()}
            disabled={!inviteUrl || !inviteEnabled}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[#345e37] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#2d5230] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {copied ? (
              <Check className="h-4 w-4" aria-hidden />
            ) : (
              <Copy className="h-4 w-4" aria-hidden />
            )}
            {copied ? "Copied" : "Copy Link"}
          </button>
        </div>
      </div>
    </section>
  )
}
