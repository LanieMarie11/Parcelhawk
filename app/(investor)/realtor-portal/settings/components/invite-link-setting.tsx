"use client"

import { Check, Copy, Send } from "lucide-react"
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
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ${
        enabled ? "bg-brand-green" : "bg-muted"
      }`}
    >
      <span className="sr-only">Toggle invite link</span>
      <span
        className={`pointer-events-none inline-block size-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ${
          enabled ? "translate-x-5.5" : "translate-x-0.5"
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
  const [buyerEmail, setBuyerEmail] = useState("")
  const [copied, setCopied] = useState(false)
  const [sending, setSending] = useState(false)
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

  const handleSendInvitation = async () => {
    const email = buyerEmail.trim()
    if (!inviteEnabled || !email || sending) return

    setSending(true)
    try {
      const response = await fetch("/api/realtor-portal/invite-links/send-invitation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = (await response.json()) as { error?: string }
      if (!response.ok) {
        toast.error(data.error ?? "Failed to send invitation")
        return
      }
      setBuyerEmail("")
      toast.success("Invitation sent")
    } catch {
      toast.error("Failed to send invitation")
    } finally {
      setSending(false)
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

      <div className={`space-y-5 pt-5 ${!inviteEnabled ? "pointer-events-none opacity-50" : ""}`}>
        <div>
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
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-border bg-white px-5 py-2.5 text-sm font-medium text-card-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
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

        <div>
          <p className="text-sm font-semibold text-card-foreground">Send Link-to-Me Invitation</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-stretch">
            <input
              type="email"
              value={buyerEmail}
              onChange={(event) => setBuyerEmail(event.target.value)}
              placeholder="Enter buyer email address"
              disabled={!inviteEnabled}
              className="min-w-0 flex-1 rounded-lg border border-border bg-zinc-50 px-3 py-2.5 text-sm text-zinc-700 outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
              aria-label="Buyer email address"
            />
            <button
              type="button"
              onClick={() => void handleSendInvitation()}
              disabled={!inviteEnabled || !buyerEmail.trim() || sending}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-brand-green px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-green-hover active:bg-brand-green-active disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send className="h-4 w-4" aria-hidden />
              {sending ? "Sending..." : "Send Invitation"}
            </button>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            The buyer will receive an in-platform invitation to link their account with you.
          </p>
        </div>
      </div>
    </section>
  )
}
