"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { SlidersHorizontal } from "lucide-react"

/** Panel toggles: ON/OFF defaults per product spec. */
const FEATURE_ROWS = [
  { key: "roadAccessConfirmed", label: "Road access confirmed" },
  { key: "noFloodZone", label: "No flood zone" },
  { key: "utilitiesNearby", label: "Utilities nearby" },
  { key: "hideUnknownData", label: "Hide unknown data" },
] as const

export type LandFeatureFilters = {
  roadAccessConfirmed: boolean
  noFloodZone: boolean
  utilitiesNearby: boolean
  hideUnknownData: boolean
}

export const DEFAULT_LAND_FEATURE_FILTERS: LandFeatureFilters = {
  roadAccessConfirmed: true,
  noFloodZone: true,
  utilitiesNearby: false,
  hideUnknownData: false,
}

/** Payload from the More Filters panel (feature toggles only). */
export interface FilterApplyPayload {
  features: LandFeatureFilters
}

function countDeviationsFromDefault(features: LandFeatureFilters): number {
  return (FEATURE_ROWS as readonly { key: keyof LandFeatureFilters }[]).filter(
    ({ key }) => features[key] !== DEFAULT_LAND_FEATURE_FILTERS[key]
  ).length
}

function FeatureToggleRow({
  label,
  checked,
  onCheckedChange,
}: {
  label: string
  checked: boolean
  onCheckedChange: (next: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-6 border-b border-border/50 py-3.5 last:border-b-0">
      <span className="text-sm font-medium text-[#374151]">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onCheckedChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B7F5C]/50 focus-visible:ring-offset-2 ${
          checked ? "bg-[#5B7F5C]" : "border border-[#CBD5E1] bg-white"
        }`}
      >
        <span
          className={`absolute top-1/2 h-4.5 w-4.5 -translate-y-1/2 rounded-full shadow-sm transition-[left,right,background-color] duration-200 ease-out ${
            checked ? "right-0.5 bg-white" : "left-0.5 bg-[#5B7F5C]"
          }`}
        />
      </button>
    </div>
  )
}

export default function FilterOption({
  onApply,
  initialFeatures,
}: {
  onApply?: (payload: FilterApplyPayload) => void
  /** Optional controlled initial state (e.g. from parent). */
  initialFeatures?: LandFeatureFilters | null
}) {
  const [open, setOpen] = useState(false)
  const [features, setFeatures] = useState<LandFeatureFilters>(() => ({
    ...DEFAULT_LAND_FEATURE_FILTERS,
    ...initialFeatures,
  }))
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (initialFeatures) {
      setFeatures({ ...DEFAULT_LAND_FEATURE_FILTERS, ...initialFeatures })
    }
  }, [initialFeatures])

  const activeFiltersCount = useMemo(
    () => countDeviationsFromDefault(features),
    [features]
  )

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  function setFeature(key: keyof LandFeatureFilters, value: boolean) {
    setFeatures((prev) => {
      const next = { ...prev, [key]: value }
      onApply?.({ features: next })
      return next
    })
  }

  return (
    <div className="relative inline-flex flex-col font-ibm-plex-sans" ref={containerRef}>
      {/* Matches Price Range / Acres label row so the button aligns with 34px inputs */}
      <span className="invisible select-none text-xs font-normal" aria-hidden>
        Price Range
      </span>
      <div className="mt-1.5">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className={`relative inline-flex h-[34px] items-center gap-2 rounded-lg border bg-white px-5 text-sm font-semibold text-[#2D5A27] shadow-none transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2D5A27]/25 focus-visible:ring-offset-2 ${
            activeFiltersCount > 0
              ? "border-[#2D5A27]/40 hover:border-[#2D5A27]/55"
              : "border-[#E9ECEF] hover:border-[#CBD5E1]"
          }`}
          aria-expanded={open}
          aria-haspopup="true"
        >
          <SlidersHorizontal className="h-4 w-4 shrink-0 text-[#2D5A27]" strokeWidth={2} aria-hidden />
          <span>More Filters</span>
          {activeFiltersCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#2D5A27] px-1.5 text-xs font-semibold text-white">
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 flex w-full min-w-[320px] max-w-[420px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
          <div className="border-b border-border px-5 py-3.5">
            <h2 className="text-base font-medium text-foreground">More Filters</h2>
          </div>

          <div className="max-h-[70vh] overflow-y-auto px-5 py-2 pb-4">
            {(FEATURE_ROWS as readonly { key: keyof LandFeatureFilters; label: string }[]).map(
              ({ key, label }) => (
                <FeatureToggleRow
                  key={key}
                  label={label}
                  checked={features[key]}
                  onCheckedChange={(v) => setFeature(key, v)}
                />
              )
            )}
          </div>
        </div>
      )}
    </div>
  )
}
