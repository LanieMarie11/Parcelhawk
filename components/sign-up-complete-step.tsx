"use client"

import Link from "next/link"

export type SignUpCompletePreferences = {
  budget: string | null
  purpose: string | null
  timeframe: string | null
}

const PURPOSE_LABELS: Record<string, string> = {
  myself: "For myself",
  builder: "Builder / Developer",
  investor: "Investor",
  exploring: "Just exploring",
}

export type SignUpCompleteStepProps = {
  firstName: string
  preferences: SignUpCompletePreferences
  onExploreListings?: () => void
  onGoToDashboard?: () => void
}

export function SignUpCompleteStep({
  firstName,
  preferences,
  onExploreListings,
  onGoToDashboard,
}: SignUpCompleteStepProps) {
  const displayName = firstName.trim() || "there"
  const buyerTypeLabel = preferences.purpose
    ? PURPOSE_LABELS[preferences.purpose] ?? preferences.purpose
    : "—"
  const budgetLabel = preferences.budget ?? "—"
  const timeframeLabel = preferences.timeframe ?? "—"

  return (
    <>
      <div className="relative w-full rounded-2xl border border-border bg-card p-8 shadow-lg font-ibm-plex-sans">
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-3xl">
          You&apos;re all set, {displayName}!
        </h1>
        <p className="mt-1 text-base text-muted-foreground">
          Your account is ready. Start browsing land that matches your goals.
        </p>

        <div className="mt-8 p-3 border border-border rounded-lg bg-[#F3F3F5]">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Your preferences
          </p>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Budget</p>
              <p className="mt-0.5 font-medium text-foreground">{budgetLabel}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Buyer type</p>
              <p className="mt-0.5 font-medium text-foreground">{buyerTypeLabel}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Timeframe</p>
              <p className="mt-0.5 font-medium text-foreground">{timeframeLabel}</p>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {onExploreListings ? (
            <button
              type="button"
              onClick={onExploreListings}
              className="w-full rounded-xl border border-border bg-card px-6 py-3 text-base font-medium text-foreground transition-colors hover:bg-muted"
            >
              Explore listings
            </button>
          ) : (
            <Link
              href="/"
              className="w-full rounded-xl border border-border bg-card px-6 py-3 text-center text-base font-medium text-foreground transition-colors hover:bg-muted"
            >
              Explore listings
            </Link>
          )}
          {onGoToDashboard ? (
            <button
              type="button"
              onClick={onGoToDashboard}
              className="w-full rounded-xl bg-[#04C0AF] py-3 text-base font-medium text-white transition-colors hover:bg-[#3dbdb5]/80 active:bg-[#35aba3]"
            >
              Go to Buyer Dashboard
            </button>
          ) : (
            <Link
              href="/"
              className="w-full rounded-xl bg-[#04C0AF] py-3 text-center text-base font-medium text-white transition-colors hover:bg-[#3dbdb5]/80 active:bg-[#35aba3]"
            >
              Go to Buyer Dashboard
            </Link>
          )}
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        You can update your preferences anytime in your account settings.
      </p>
    </>
  )
}
