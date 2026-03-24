"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"

const budgetOptions = [
  "$10K-$30K",
  "$30K-$50K",
  "$50K-$75K",
  "$75K-$100K",
  "$100K-$150K",
  "$150K-$200K",
  "$200K-$300K",
  "Above $300K",
]

const buyerTypes = [
  {
    id: "myself",
    label: "For myself",
    description: "Personal use or homestead",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20c0-3.2 3.1-5.5 7-5.5s7 2.3 7 5.5" />
      </svg>
    ),
  },
  {
    id: "builder",
    label: "Builder / Developer",
    description: "Developing or building on land",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
        <rect x="4" y="5" width="8" height="14" rx="1.5" />
        <rect x="14" y="9" width="6" height="10" rx="1.5" />
        <path d="M8 9h.01M8 13h.01M17 13h.01M17 16h.01" />
      </svg>
    ),
  },
  {
    id: "investor",
    label: "Investor",
    description: "Investment or resale purposes",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
        <path d="m4 16 5-5 4 4 7-7" />
        <path d="M20 8v5h-5" />
      </svg>
    ),
  },
  {
    id: "exploring",
    label: "Just exploring",
    description: "Browsing options for now",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4 4" />
      </svg>
    ),
  },
]

const timeframeOptions = ["ASAP", "1-3 months", "3-6 months", "6+ months", "Just researching"]

export default function LandPreferences() {
  const [selectedBudget, setSelectedBudget] = useState(budgetOptions[0])
  const [selectedBuyerType, setSelectedBuyerType] = useState("myself")
  const [selectedTimeframe, setSelectedTimeframe] = useState(timeframeOptions[0])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const loadProfilePreferences = async () => {
      try {
        const response = await fetch("/api/profile", { method: "GET" })
        const data = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error((data as { error?: string }).error ?? "Failed to load preferences")
        }

        const profile = data as {
          preferenceBudget?: string
          preferencePurpose?: string
          preferenceTimeframe?: string
        }

        if (profile.preferenceBudget && budgetOptions.includes(profile.preferenceBudget)) {
          setSelectedBudget(profile.preferenceBudget)
        }
        if (profile.preferencePurpose && buyerTypes.some((type) => type.id === profile.preferencePurpose)) {
          setSelectedBuyerType(profile.preferencePurpose)
        }
        if (profile.preferenceTimeframe && timeframeOptions.includes(profile.preferenceTimeframe)) {
          setSelectedTimeframe(profile.preferenceTimeframe)
        }
      } catch {
        toast.error("Could not load saved preferences.")
      } finally {
        setIsLoading(false)
      }
    }

    void loadProfilePreferences()
  }, [])

  const handleSavePreferences = async () => {
    setIsSaving(true)
    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferenceBudget: selectedBudget,
          preferencePurpose: selectedBuyerType,
          preferenceTimeframe: selectedTimeframe,
        }),
      })
      const data = await response.json().catch(() => ({}))

      if (response.ok) {
        toast.success("Preferences updated successfully")
      } else {
        toast.error((data as { error?: string }).error ?? "Failed to update preferences")
      }
    } catch {
      toast.error("Connection failed. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="rounded-lg border border-border bg-card p-6">
      <h2 className="text-lg font-semibold text-card-foreground">Your Preferences</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Helps us find the right land and connect you with the right agents.
      </p>

      <div className="mt-6 space-y-6">
        <div>
          <p className="text-sm font-semibold text-card-foreground">What&apos;s your budget?</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {budgetOptions.map((option) => {
              const isSelected = option === selectedBudget
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSelectedBudget(option)}
                  className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                    isSelected
                      ? "border-[#04C0AF] bg-[#04C0AF]/10 text-[#04C0AF]"
                      : "border-border bg-card text-muted-foreground hover:border-[#04C0AF]/50 hover:text-card-foreground"
                  }`}
                >
                  {option}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-card-foreground">Are you buying for yourself or are you a builder?</p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {buyerTypes.map((type) => {
              const isSelected = type.id === selectedBuyerType
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setSelectedBuyerType(type.id)}
                  className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                    isSelected
                      ? "border-[#04C0AF] bg-[#04C0AF]/10"
                      : "border-border bg-card hover:border-[#04C0AF]/50 hover:bg-accent/30"
                  }`}
                >
                  <span
                    className={`mt-0.5 rounded-md border p-2 ${
                      isSelected ? "border-[#04C0AF] text-[#04C0AF]" : "border-border text-muted-foreground"
                    }`}
                  >
                    {type.icon}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-muted-foreground">{type.label}</span>
                    <span className="block text-sm text-muted-foreground">{type.description}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-card-foreground">What&apos;s your timeframe?</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {timeframeOptions.map((option) => {
              const isSelected = option === selectedTimeframe
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSelectedTimeframe(option)}
                  className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                    isSelected
                      ? "border-[#04C0AF] bg-[#04C0AF]/10 text-[#04C0AF]"
                      : "border-border bg-card text-muted-foreground hover:border-[#04C0AF]/50 hover:text-card-foreground"
                  }`}
                >
                  {option}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={handleSavePreferences}
          disabled={isSaving || isLoading}
          className="rounded-md bg-[#04C0AF] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#03ac9d] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "Saving..." : "Save Preferences"}
        </button>
      </div>
    </section>
  )
}
