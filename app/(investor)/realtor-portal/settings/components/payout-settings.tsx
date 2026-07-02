"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

type PayoutStatus = {
  connected: boolean
  chargesEnabled: boolean
  payoutsEnabled: boolean
  detailsSubmitted: boolean
}

export default function PayoutSettings() {
  const [status, setStatus] = useState<PayoutStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isStartingOnboarding, setIsStartingOnboarding] = useState(false)

  useEffect(() => {
    let cancelled = false

    void fetch("/api/realtor-portal/settings/payouts")
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as {
          status?: PayoutStatus
          error?: string
        }
        if (!response.ok) {
          throw new Error(data.error ?? "Failed to load payout settings")
        }
        if (!cancelled) {
          setStatus(data.status ?? null)
        }
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "Failed to load payout settings")
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  const handleStartOnboarding = async () => {
    try {
      setIsStartingOnboarding(true)
      const response = await fetch("/api/realtor-portal/settings/payouts", {
        method: "POST",
      })
      const data = (await response.json().catch(() => ({}))) as {
        url?: string
        error?: string
      }

      if (!response.ok || !data.url) {
        throw new Error(data.error ?? "Failed to start payout setup")
      }

      window.location.href = data.url
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start payout setup")
    } finally {
      setIsStartingOnboarding(false)
    }
  }

  const isReady = Boolean(status?.chargesEnabled && status?.payoutsEnabled)

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold font-ibm-plex-sans text-foreground">Payout Settings</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Connect your bank account to receive your share when connected buyers purchase property
        reports.
      </p>

      <div className="mt-5 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Loading payout status...
          </div>
        ) : isReady ? (
          <>
            <p className="text-sm font-semibold text-[#2D5A36]">Payouts enabled</p>
            <p className="mt-2 text-sm font-ibm-plex-sans text-zinc-600">
              You will receive $1.50 from each $3.00 property report purchased by your connected
              buyers. Stripe processing fees are covered by Parcel.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-zinc-900">Payout setup required</p>
            <p className="mt-2 text-sm font-ibm-plex-sans text-zinc-600">
              Until payout setup is complete, report purchases from your buyers stay with Parcel.
              Complete Stripe onboarding to start receiving your $1.50 share.
            </p>
            <button
              type="button"
              onClick={() => void handleStartOnboarding()}
              disabled={isStartingOnboarding}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-green px-4 py-2.5 text-sm font-medium font-ibm-plex-sans text-white transition-colors hover:bg-brand-green-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isStartingOnboarding ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Opening Stripe...
                </>
              ) : status?.connected ? (
                "Continue payout setup"
              ) : (
                "Set up payouts"
              )}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
