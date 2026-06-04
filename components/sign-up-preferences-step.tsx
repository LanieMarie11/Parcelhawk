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
  about: string
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
    ? "border-brand-green bg-[#EAEFEB] text-brand-green"
    : "border-border bg-[#FAFAFA] text-foreground hover:border-brand-green active:border-brand-green-active"

export function SignUpPreferencesStep({
  onBack,
  onContinue,
  onSkip,
}: SignUpPreferencesStepProps) {
  const [about, setAbout] = useState("")
  const [budget, setBudget] = useState<string | null>("$10K-$30K")
  const [acreage, setAcreage] = useState<string | null>(ACREAGE_OPTIONS[0])
  const [purpose, setPurpose] = useState<string | null>(null)
  const [timeframe, setTimeframe] = useState<string | null>("ASAP")

  return (
    <>
      <div className="relative w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-lg font-ibm-plex-sans mx-auto">
        <h1 className="text-2xl font-medium uppercase font-phudu tracking-tight text-foreground sm:text-3xl">
          Tell us what you&apos;re looking for
        </h1>
        <p className="mt-1 text-base font-regular text-muted-foreground">
          &quot;Helps us find the right land and connect you with the right agents.&quot;
        </p>

        {/* About */}
        <div className="mt-6 flex flex-col gap-1.5">
          <label htmlFor="about" className="text-sm text-muted-foreground">
            About (What you&apos;re looking for)
          </label>
          <textarea
            id="about"
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            placeholder="Example: I'm looking for 10-20 acres in Colorado with road access, utilites nearby, and a budget under $250,000."
            rows={4}
            className="resize-none rounded-xl border border-border bg-card px-3 py-2 text-sm text-card-foreground outline-none transition-colors focus:border-brand-green focus:ring-1 focus:ring-brand-green"
          />
        </div>

        {/* Budget */}
        <div className="mt-6">
          <p className="text-base font-ibm-plex-sans font-medium text-foreground">
            What&apos;s your budget?
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {BUDGET_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setBudget(opt)}
                className={`rounded-lg border px-4 py-2.5 text-sm font-regular transition-colors ${optionButtonClass(budget === opt)}`}
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
                className={`rounded-lg border px-4 py-2.5 text-sm font-regular transition-colors ${optionButtonClass(acreage === opt)}`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Purpose */}
        <div className="mt-6">
          <p className="text-base font-ibm-plex-sans font-medium text-foreground">
            Are you buying for yourself or are you a builder?
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {PURPOSE_OPTIONS.map(({ id, title, subtitle, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setPurpose(purpose === id ? null : id)}
                className={`flex items-center gap-3 rounded-lg border p-4 text-left transition-colors ${optionButtonClass(purpose === id)}`}
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    purpose === id ? "bg-white/60" : "bg-muted"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 ${purpose === id ? "text-brand-green" : "text-muted-foreground"}`}
                  />
                </span>
                <span className="min-w-0 flex flex-col">
                  <span className="font-medium leading-tight">{title}</span>
                  <span className="mt-0.5 text-sm text-muted-foreground leading-snug">
                    {subtitle}
                  </span>
                </span>
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
                className={`rounded-lg border px-4 py-2.5 text-sm font-regular transition-colors ${optionButtonClass(timeframe === opt)}`}
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
            onClick={() => onContinue({ about, budget, acreage, purpose, timeframe })}
            className="w-full rounded-xl bg-brand-green py-3 text-base font-medium text-white shadow-md transition-colors hover:bg-brand-green-hover active:bg-brand-green-active"
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
