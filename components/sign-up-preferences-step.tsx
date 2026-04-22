"use client"

import { useState } from "react"
import { User, Building2, TrendingUp, Search } from "lucide-react"

const BUDGET_OPTIONS = [
  "$10K-$30K",
  "$30K-$50K",
  "$50K-$75K",
  "$75K-$100K",
  "$100K-$150K",
  "$150K-$200K",
  "$200K-$300K",
  "Above $300K",
] as const

const ACREAGE_OPTIONS = [
  "Under 1 acre",
  "1-5 acres",
  "5-10 acres",
  "10-20 acres",
  "20-50 acres",
  "50-100 acres",
  "100+ acres",
] as const

const PURPOSE_OPTIONS = [
  {
    id: "myself" as const,
    title: "For myself",
    subtitle: "Personal use or homestead",
    Icon: User,
  },
  {
    id: "builder" as const,
    title: "Builder / Developer",
    subtitle: "Developing or building on land",
    Icon: Building2,
  },
  {
    id: "investor" as const,
    title: "Investor",
    subtitle: "Investment or resale purposes",
    Icon: TrendingUp,
  },
  {
    id: "exploring" as const,
    title: "Just exploring",
    subtitle: "Browsing options for now",
    Icon: Search,
  },
] as const

const TIMEFRAME_OPTIONS = [
  "ASAP",
  "1-3 months",
  "3-6 months",
  "6+ months",
  "Just researching",
] as const

export type SignUpPreferencesData = {
  budget: string | null
  acreage: string | null
  purpose: string | null
  timeframe: string | null
}

export type SignUpPreferencesStepProps = {
  onBack: () => void
  onContinue: (data: SignUpPreferencesData) => void
  onSkip: () => void
}

const optionButtonClass = (selected: boolean) =>
  selected
    ? "border-[#04C0AF] bg-[#E4FFFD] text-[#096D64]"
    : "border-border bg-card text-foreground hover:border-gray-400"

export function SignUpPreferencesStep({
  onBack,
  onContinue,
  onSkip,
}: SignUpPreferencesStepProps) {
  const [budget, setBudget] = useState<string | null>("$10K-$30K")
  const [acreage, setAcreage] = useState<string | null>(ACREAGE_OPTIONS[0])
  const [purpose, setPurpose] = useState<string | null>(null)
  const [timeframe, setTimeframe] = useState<string | null>("ASAP")

  return (
    <>
      <div className="relative w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-lg font-ibm-plex-sans mx-auto">
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Tell us what you&apos;re looking for
        </h1>
        <p className="mt-1 text-base text-muted-foreground">
          &quot;Helps us find the right land and connect you with the right agents.&quot;
        </p>

        {/* Budget */}
        <div className="mt-6">
          <p className="text-base font-medium text-foreground">
            What&apos;s your budget?
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {BUDGET_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setBudget(opt)}
                className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${optionButtonClass(budget === opt)}`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Acreage */}
        <div className="mt-6">
          <p className="text-base font-medium text-foreground">
            What&apos;s your acreage?
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {ACREAGE_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setAcreage(opt)}
                className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${optionButtonClass(acreage === opt)}`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Purpose */}
        <div className="mt-6">
          <p className="text-base font-medium text-foreground">
            Are you buying for yourself or are you a builder?
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {PURPOSE_OPTIONS.map(({ id, title, subtitle, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setPurpose(purpose === id ? null : id)}
                className={`flex flex-col items-start rounded-lg border p-4 text-left transition-colors ${optionButtonClass(purpose === id)}`}
              >
                <Icon
                  className={`h-6 w-6 shrink-0 ${purpose === id ? "text-[#096D64]" : "text-muted-foreground"}`}
                />
                <span className="mt-2 font-medium">{title}</span>
                <span className="mt-0.5 text-sm text-muted-foreground">{subtitle}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Timeframe */}
        <div className="mt-6">
          <p className="text-base font-medium text-foreground">
            What&apos;s your timeframe?
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {TIMEFRAME_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setTimeframe(opt)}
                className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${optionButtonClass(timeframe === opt)}`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Back + Continue */}
        <div className="mt-8 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onBack}
            className="w-full rounded-xl border border-border bg-card px-6 py-3 text-base font-medium text-foreground transition-colors hover:bg-muted"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => onContinue({ budget, acreage, purpose, timeframe })}
            className="w-full rounded-xl bg-[#04C0AF] py-3 text-base font-medium text-white transition-colors hover:bg-[#3dbdb5]/80 active:bg-[#35aba3]"
          >
            Continue
          </button>
        </div>
      </div>

      <p className="mt-6 text-center">
        <button
          type="button"
          onClick={onSkip}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Skip for Now
        </button>
      </p>
    </>
  )
}
