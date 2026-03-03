"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronDown, Sparkles } from "lucide-react"

const PROPERTY_TYPES = [
  "Beachfront Property",
  "Commercial Property",
  "Farms",
  "Horse Property",
  "Hunting Land",
  "Lakefront Property",
  "Ranches",
  "Recreational Property",
  "Residential Property",
  "Riverfront Property",
  "Timberland",
  "Undeveloped Land",
  "Waterfront Property",
]

const ACTIVITIES = [
  "Aquatic Sporting",
  "Aviation",
  "Beach",
  "Boating",
  "Camping",
  "Canoeing/Kayaking",
  "Conservation",
  "Fishing",
  "Golfing",
  "Horseback Riding",
  "Hunting",
  "Off-roading",
  "RVing",
  "Skiing",
]

const PRICE_MIN_OPTIONS = [
  { label: "No Min", value: 0 },
  { label: "$50,000", value: 50000 },
  { label: "$75,000", value: 75000 },
  { label: "$100,000", value: 100000 },
  { label: "$150,000", value: 150000 },
  { label: "$250,000", value: 250000 },
  { label: "$300,000", value: 300000 },
  { label: "$350,000", value: 350000 },
  { label: "$400,000", value: 400000 },
] as const

const PRICE_MAX_OPTIONS = [
  { label: "$400,000", value: 400000 },
  { label: "$450,000", value: 450000 },
  { label: "$500,000", value: 500000 },
  { label: "$550,000", value: 550000 },
  { label: "$600,000", value: 600000 },
  { label: "$650,000", value: 650000 },
  { label: "$700,000", value: 700000 },
  { label: "$750,000", value: 750000 },
  { label: "No MAX", value: 1000000000 },
] as const

const ACREAGE_MIN_OPTIONS = [
  { label: "No Min", value: 0 },
  { label: "1 Acres", value: 1 },
  { label: "5 Acres", value: 5 },
  { label: "10 Acres", value: 10 },
  { label: "15 Acres", value: 15 },
  { label: "25 Acres", value: 25 },
  { label: "35 Acres", value: 35 },
  { label: "50 Acres", value: 50 },
  { label: "75 Acres", value: 75 },
] as const

const ACREAGE_MAX_OPTIONS = [
  { label: "40 Acres", value: 40 },
  { label: "50 Acres", value: 50 },
  { label: "60 Acres", value: 60 },
  { label: "75 Acres", value: 75 },
  { label: "100 Acres", value: 100 },
  { label: "125 Acres", value: 125 },
  { label: "150 Acres", value: 150 },
  { label: "175 Acres", value: 175 },
  { label: "No Max", value: 999999 },
] as const

function priceValueToLabel(value: number | null, options: readonly { label: string; value: number }[], isMax: boolean): string {
  if (value === null || value === undefined) return isMax ? PRICE_MAX_OPTIONS[PRICE_MAX_OPTIONS.length - 1].label : PRICE_MIN_OPTIONS[0].label
  if (isMax && value >= 1_000_000_000) return PRICE_MAX_OPTIONS[PRICE_MAX_OPTIONS.length - 1].label
  if (!isMax && value === 0) return PRICE_MIN_OPTIONS[0].label
  const found = options.find((o) => o.value === value)
  return found ? found.label : (isMax ? PRICE_MAX_OPTIONS[PRICE_MAX_OPTIONS.length - 1].label : PRICE_MIN_OPTIONS[0].label)
}

function priceLabelToValue(label: string, options: readonly { label: string; value: number }[]): number | null {
  const found = options.find((o) => o.label === label)
  return found ? found.value : null
}

function acreageValueToOptionValue(value: number | null, isMax: boolean): string {
  if (value === null || value === undefined) return isMax ? "No Max" : "No Min"
  if (isMax && value >= 999999) return "No Max"
  if (!isMax && value === 0) return "No Min"
  const options = isMax ? ACREAGE_MAX_OPTIONS : ACREAGE_MIN_OPTIONS
  const found = options.find((o) => o.value === value)
  if (!found) return isMax ? "No Max" : "No Min"
  return found.value === 0 ? "No Min" : found.value === 999999 ? "No Max" : String(found.value)
}

function acreageOptionValueToNumber(optionValue: string): number | null {
  if (optionValue === "No Min" || optionValue === "No Max") return null
  const num = Number(optionValue)
  return Number.isFinite(num) ? num : null
}

/** Payload passed to onApply when user clicks Apply in the filter panel. */
export interface FilterApplyPayload {
  priceMin: number | null
  priceMax: number | null
  acreageMin: number | null
  acreageMax: number | null
  propertyTypes: string[]
  activities: string[]
}

export default function FilterOption({
  priceMin: controlledPriceMin,
  priceMax: controlledPriceMax,
  onPriceChange,
  sizeMin: controlledSizeMin,
  sizeMax: controlledSizeMax,
  onSizeChange,
  onApply,
  onReset,
}: {
  onClose?: () => void
  /** Controlled min price (null = no min). When provided, syncs with PriceRange. */
  priceMin?: number | null
  /** Controlled max price (null = no max). When provided, syncs with PriceRange. */
  priceMax?: number | null
  /** Called when user changes min/max so parent can sync PriceRange. */
  onPriceChange?: (min: number | null, max: number | null) => void
  /** Controlled min size in acres (null = no min). When provided, syncs with SizeRange. */
  sizeMin?: number | null
  /** Controlled max size in acres (null = no max). When provided, syncs with SizeRange. */
  sizeMax?: number | null
  /** Called when user changes acreage min/max so parent can sync SizeRange. */
  onSizeChange?: (min: number | null, max: number | null) => void
  /** Called when user applies filters; receives numeric values and selected property types/activities. */
  onApply?: (payload: FilterApplyPayload) => void
  onReset?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [aiPrompt, setAiPrompt] = useState("")
  const isPriceControlled = controlledPriceMin !== undefined || controlledPriceMax !== undefined
  const isSizeControlled = controlledSizeMin !== undefined || controlledSizeMax !== undefined
  const [priceMin, setPriceMin] = useState<string>(PRICE_MIN_OPTIONS[0].label)
  const [priceMax, setPriceMax] = useState<string>(PRICE_MAX_OPTIONS[PRICE_MAX_OPTIONS.length - 1].label)
  const [acreageMin, setAcreageMin] = useState("No Min")
  const [acreageMax, setAcreageMax] = useState("No Max")
  const [selectedPropertyTypes, setSelectedPropertyTypes] = useState<string[]>(
    []
  )
  const [selectedActivities, setSelectedActivities] = useState<string[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  const hasActivePrice =
    isPriceControlled
      ? (controlledPriceMin != null && controlledPriceMin !== 0) ||
        (controlledPriceMax != null && controlledPriceMax < 1_000_000_000)
      : priceMin !== PRICE_MIN_OPTIONS[0].label ||
        priceMax !== PRICE_MAX_OPTIONS[PRICE_MAX_OPTIONS.length - 1].label

  const hasActiveAcreage =
    isSizeControlled
      ? (controlledSizeMin != null && controlledSizeMin !== 0) ||
        (controlledSizeMax != null && controlledSizeMax < 999999)
      : acreageMin !== "No Min" || acreageMax !== "No Max"

  const activeFiltersCount =
    (hasActivePrice ? 1 : 0) +
    (hasActiveAcreage ? 1 : 0) +
    selectedPropertyTypes.length +
    selectedActivities.length

  // When controlled, derive display from props so PriceRange updates show immediately
  const displayPriceMin = isPriceControlled && controlledPriceMin !== undefined
    ? priceValueToLabel(controlledPriceMin, PRICE_MIN_OPTIONS, false)
    : priceMin
  const displayPriceMax = isPriceControlled && controlledPriceMax !== undefined
    ? priceValueToLabel(controlledPriceMax, PRICE_MAX_OPTIONS, true)
    : priceMax

  // When controlled, derive acreage display from props so SizeRange updates show immediately
  const displayAcreageMin = isSizeControlled && controlledSizeMin !== undefined
    ? acreageValueToOptionValue(controlledSizeMin, false)
    : acreageMin
  const displayAcreageMax = isSizeControlled && controlledSizeMax !== undefined
    ? acreageValueToOptionValue(controlledSizeMax, true)
    : acreageMax

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

  function togglePropertyType(type: string) {
    setSelectedPropertyTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    )
  }

  function toggleActivity(activity: string) {
    setSelectedActivities((prev) =>
      prev.includes(activity)
        ? prev.filter((a) => a !== activity)
        : [...prev, activity]
    )
  }

  function handleReset() {
    setAiPrompt("")
    setPriceMin(PRICE_MIN_OPTIONS[0].label)
    setPriceMax(PRICE_MAX_OPTIONS[PRICE_MAX_OPTIONS.length - 1].label)
    setAcreageMin("No Min")
    setAcreageMax("No Max")
    setSelectedPropertyTypes([])
    setSelectedActivities([])
    if (isPriceControlled) onPriceChange?.(null, null)
    if (isSizeControlled) onSizeChange?.(null, null)
    onReset?.()
  }

  function handleApply() {
    // Use display values (controlled or local) so we apply what the user actually sees/selected
    const priceMinNum = priceLabelToValue(displayPriceMin, PRICE_MIN_OPTIONS)
    const priceMaxNum = priceLabelToValue(displayPriceMax, PRICE_MAX_OPTIONS)
    const acreageMinNum = acreageOptionValueToNumber(displayAcreageMin)
    const acreageMaxNum = acreageOptionValueToNumber(displayAcreageMax)
    if (isPriceControlled) onPriceChange?.(priceMinNum, priceMaxNum)
    if (isSizeControlled) onSizeChange?.(acreageMinNum, acreageMaxNum)
    const payload: FilterApplyPayload = {
      priceMin: priceMinNum,
      priceMax: priceMaxNum,
      acreageMin: acreageMinNum,
      acreageMax: acreageMaxNum,
      propertyTypes: [...selectedPropertyTypes],
      activities: [...selectedActivities],
    }
    setOpen(false)
    onApply?.(payload)
  }

  return (
    <div className="relative inline-block font-ibm-plex-sans" ref={containerRef}>
      {/* Trigger - same style as size-range */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`relative flex w-full min-w-28 items-center justify-between gap-2 rounded-lg border ${
          activeFiltersCount > 0 ? "border-[#04C0AF]" : "border-border"
        } bg-card px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:border-[#4ECDC4]/50 hover:text-foreground focus:border-[#4ECDC4] focus:outline-none focus:ring-1 focus:ring-[#4ECDC4]`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <span>Filters</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
        {activeFiltersCount > 0 && (
          <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#04C0AF] px-1.5 text-xs font-semibold text-white">
            {activeFiltersCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 flex w-full min-w-[500px] max-h-[85vh] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-lg font-medium text-foreground">More Filters</h2>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {/* AI Prompt Search */}
        <div className="mt-1 rounded-xl border-2 border-[#F3F3F5] p-4 bg-[#F3F3F5]/50">
          <p className="mb-3 text-sm font-medium text-[#4ECDC4]">
            AI Prompt Search
          </p>
          <input
            type="text"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="e.g, 10 acres near a lake in Texas under $200k"
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#4ECDC4] focus:outline-none focus:ring-2 focus:ring-[#4ECDC4]/30"
          />
          <button className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#04C0AF] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#3dbdb5]">
            <Sparkles className="h-4 w-4" />
            Generate Filters
          </button>
        </div>

        {/* Price Range */}
        <div className="mt-6">
          <h3 className="mb-3 text-sm font-medium text-foreground">
            Price Range
          </h3>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs text-muted-foreground">
                Minimum
              </label>
              <div className="relative">
                <select
                  key={`price-min-${displayPriceMin}`}
                  value={displayPriceMin}
                  onChange={(e) => {
                    const label = e.target.value
                    if (!isPriceControlled) setPriceMin(label)
                    const minVal = priceLabelToValue(label, PRICE_MIN_OPTIONS)
                    const maxVal = priceLabelToValue(displayPriceMax, PRICE_MAX_OPTIONS)
                    onPriceChange?.(minVal === 0 ? null : minVal, maxVal === 1000000000 ? null : maxVal)
                  }}
                  className="w-full appearance-none rounded-lg border border-border bg-background px-3 py-2.5 pr-8 text-sm text-foreground focus:border-[#4ECDC4] focus:outline-none focus:ring-2 focus:ring-[#4ECDC4]/30"
                >
                  {PRICE_MIN_OPTIONS.map((opt) => (
                    <option key={opt.label} value={opt.label}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                  <svg
                    className="h-4 w-4 text-muted-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
            </div>
            <span className="mt-5 text-muted-foreground">-</span>
            <div className="flex-1">
              <label className="mb-1 block text-xs text-muted-foreground">
                Maximum
              </label>
              <div className="relative">
                <select
                  key={`price-max-${displayPriceMax}`}
                  value={displayPriceMax}
                  onChange={(e) => {
                    const label = e.target.value
                    if (!isPriceControlled) setPriceMax(label)
                    const minVal = priceLabelToValue(displayPriceMin, PRICE_MIN_OPTIONS)
                    const maxVal = priceLabelToValue(label, PRICE_MAX_OPTIONS)
                    onPriceChange?.(minVal === 0 ? null : minVal, maxVal === 1000000000 ? null : maxVal)
                  }}
                  className="w-full appearance-none rounded-lg border border-border bg-background px-3 py-2.5 pr-8 text-sm text-foreground focus:border-[#4ECDC4] focus:outline-none focus:ring-2 focus:ring-[#4ECDC4]/30"
                >
                  {PRICE_MAX_OPTIONS.map((opt) => (
                    <option key={opt.label} value={opt.label}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                  <svg
                    className="h-4 w-4 text-muted-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Acreage */}
        <div className="mt-6">
          <h3 className="mb-3 text-sm font-medium text-foreground">
            Acreage
          </h3>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs text-muted-foreground">
                Minimum (acres)
              </label>
              <div className="relative">
                <select
                  key={`acreage-min-${displayAcreageMin}`}
                  value={displayAcreageMin}
                  onChange={(e) => {
                    const optionValue = e.target.value
                    if (!isSizeControlled) setAcreageMin(optionValue)
                    const minVal = acreageOptionValueToNumber(optionValue)
                    const maxVal = acreageOptionValueToNumber(displayAcreageMax)
                    onSizeChange?.(minVal, maxVal)
                  }}
                  className="w-full appearance-none rounded-lg border border-border bg-background px-3 py-2.5 pr-8 text-sm text-foreground focus:border-[#4ECDC4] focus:outline-none focus:ring-2 focus:ring-[#4ECDC4]/30"
                >
                  {ACREAGE_MIN_OPTIONS.map((opt) => {
                    const optionValue = opt.value === 0 ? "No Min" : String(opt.value)
                    return (
                      <option key={optionValue} value={optionValue}>
                        {opt.label}
                      </option>
                    )
                  })}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                  <svg
                    className="h-4 w-4 text-muted-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
            </div>
            <span className="mt-5 text-muted-foreground">-</span>
            <div className="flex-1">
              <label className="mb-1 block text-xs text-muted-foreground">
                Maximum (acres)
              </label>
              <div className="relative">
                <select
                  key={`acreage-max-${displayAcreageMax}`}
                  value={displayAcreageMax}
                  onChange={(e) => {
                    const optionValue = e.target.value
                    if (!isSizeControlled) setAcreageMax(optionValue)
                    const minVal = acreageOptionValueToNumber(displayAcreageMin)
                    const maxVal = acreageOptionValueToNumber(optionValue)
                    onSizeChange?.(minVal, maxVal)
                  }}
                  className="w-full appearance-none rounded-lg border border-border bg-background px-3 py-2.5 pr-8 text-sm text-foreground focus:border-[#4ECDC4] focus:outline-none focus:ring-2 focus:ring-[#4ECDC4]/30"
                >
                  {ACREAGE_MAX_OPTIONS.map((opt) => {
                    const optionValue = opt.value === 999999 ? "No Max" : String(opt.value)
                    return (
                      <option key={optionValue} value={optionValue}>
                        {opt.label}
                      </option>
                    )
                  })}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                  <svg
                    className="h-4 w-4 text-muted-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Property Type */}
        <div className="mt-6">
          <h3 className="mb-3 text-sm font-medium text-foreground">
            Property Type
          </h3>
          <div className="flex flex-col gap-2.5">
            {PROPERTY_TYPES.map((type) => (
              <label
                key={type}
                className="group flex cursor-pointer items-center gap-3"
              >
                <div
                  className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-colors ${
                    selectedPropertyTypes.includes(type)
                      ? "border-[#4ECDC4] bg-[#4ECDC4]"
                      : "border-border bg-background"
                  }`}
                >
                  {selectedPropertyTypes.includes(type) && (
                    <svg
                      className="h-3 w-3 text-background"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
                <input
                  type="checkbox"
                  checked={selectedPropertyTypes.includes(type)}
                  onChange={() => togglePropertyType(type)}
                  className="sr-only"
                />
                <span className="text-sm text-foreground transition-colors group-hover:text-foreground/80">
                  {type}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Activities */}
        <div className="mt-6 pb-2">
          <h3 className="mb-3 text-sm font-medium text-foreground">
            Activities
          </h3>
          <div className="flex flex-wrap gap-2.5">
            {ACTIVITIES.map((activity) => (
              <button
                key={activity}
                onClick={() => toggleActivity(activity)}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                  selectedActivities.includes(activity)
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background text-foreground hover:border-foreground/40"
                }`}
              >
                {activity}
              </button>
            ))}
          </div>
        </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 border-t border-border px-5 py-4">
            <button
              type="button"
              onClick={handleReset}
              className="flex-1 rounded-xl border border-border bg-card py-3.5 text-base font-medium text-foreground transition-colors hover:bg-muted"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex-1 rounded-xl bg-[#04C0AF] py-3.5 text-base font-medium text-white shadow-md transition-colors hover:bg-[#3dbdb5] active:bg-[#35aba3]"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
