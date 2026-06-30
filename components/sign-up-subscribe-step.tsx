"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

export type SignUpSubscribeStepProps = {
  onBack?: () => void
  onSubscribed: () => void
  returnTo?: "signup" | "portal"
  showBackButton?: boolean
}

export function SignUpSubscribeStep({
  onBack,
  onSubscribed,
  returnTo = "signup",
  showBackButton = true,
}: SignUpSubscribeStepProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingStatus, setIsCheckingStatus] = useState(true)
  const [billingConfigured, setBillingConfigured] = useState(true)
  const subscribedHandled = useRef(false)

  useEffect(() => {
    let cancelled = false

    const checkStatus = async () => {
      try {
        const response = await fetch("/api/investor/subscription/status", {
          method: "GET",
          cache: "no-store",
        })
        const data = (await response.json().catch(() => ({}))) as {
          active?: boolean
          error?: string
        }

        if (cancelled) return

        if (response.status === 503) {
          setBillingConfigured(false)
          return
        }

        if (response.ok && data.active && !subscribedHandled.current) {
          subscribedHandled.current = true
          onSubscribed()
        }
      } catch (error) {
        console.error("Failed to check subscription status", error)
      } finally {
        if (!cancelled) {
          setIsCheckingStatus(false)
        }
      }
    }

    void checkStatus()

    return () => {
      cancelled = true
    }
  }, [onSubscribed])

  const handleSubscribe = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/investor/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnTo }),
      })
      const data = (await response.json().catch(() => ({}))) as {
        url?: string
        error?: string
      }

      if (!response.ok) {
        toast.error("Could not start checkout", {
          description: data.error ?? "Please try again later.",
        })
        return
      }

      if (data.url) {
        window.location.href = data.url
        return
      }

      toast.error("Checkout URL missing", {
        description: "Please try again later.",
      })
    } catch (error) {
      console.error(error)
      toast.error("Connection failed", {
        description: "Check your network and try again.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isCheckingStatus) {
    return (
      <div className="relative w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-lg font-ibm-plex-sans mx-auto">
        <p className="text-base text-muted-foreground">Checking subscription status...</p>
      </div>
    )
  }

  return (
    <div className="relative w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-lg font-ibm-plex-sans mx-auto">
      <h1 className="text-2xl font-medium uppercase font-phudu tracking-tight text-foreground sm:text-3xl">
        Activate your portal
      </h1>
      <p className="mt-1 text-base text-muted-foreground">
        {returnTo === "portal"
          ? "Your subscription is inactive. Subscribe again to access the Realtor/Investor portal."
          : "Subscribe to access the Realtor/Investor portal and manage your buyers."}
      </p>

      <div className="mt-8 rounded-lg border border-border bg-[#F3F3F5] p-4">
        <p className="text-sm font-medium text-foreground">Realtor/Investor subscription</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Secure payment powered by Stripe. You will be redirected to complete checkout.
        </p>
      </div>

      {!billingConfigured && (
        <p className="mt-4 text-sm text-destructive">
          Billing is not configured yet. Set STRIPE_INVESTOR_SUBSCRIPTION_PRICE_ID in your environment.
        </p>
      )}

      <div className={`mt-8 grid gap-3 ${showBackButton ? "grid-cols-2" : "grid-cols-1"}`}>
        {showBackButton && onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="w-full rounded-xl border border-border bg-card px-6 py-3 text-base font-medium text-foreground transition-colors hover:bg-muted"
          >
            Back
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => void handleSubscribe()}
          disabled={isLoading || !billingConfigured}
          className="w-full rounded-xl bg-brand-green py-3 text-base font-medium text-white shadow-md transition-colors hover:bg-brand-green-hover active:bg-brand-green-active disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "Redirecting..." : "Subscribe with Stripe"}
        </button>
      </div>
    </div>
  )
}
