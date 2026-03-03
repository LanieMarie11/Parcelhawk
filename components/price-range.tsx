"use client"

import { ChevronDown } from "lucide-react"
import { useEffect, useRef, useState } from "react"

// Min: 0–40K | Max: 45K–75K
const MIN_PRESETS = [
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

const MAX_PRESETS = [
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

function formatPriceShort(value: string): string {
  const num = Number(String(value).replace(/[^0-9.]/g, ""))
  if (!Number.isFinite(num) || num <= 0) return ""
  if (num >= 1_000_000) {
    const m = num / 1_000_000
    return m % 1 === 0 ? `${m}M` : `${m.toFixed(1)}M`
  }
  if (num >= 1_000) {
    const k = num / 1_000
    return k % 1 === 0 ? `${k}K` : `${k.toFixed(1)}K`
  }
  return String(num)
}

function parsePriceToNumber(value: string): number | null {
  const num = Number(String(value).replace(/[^0-9.]/g, ""))
  if (!Number.isFinite(num) || num < 0) return null
  return num
}

export type PriceRangeOnApply = (min: number | null, max: number | null) => void

export type PriceRangeValue = { min: number | null; max: number | null }

interface PriceRangeProps {
  /** Controlled min/max (null = no limit). When provided, internal state syncs from this. */
  value?: PriceRangeValue
  /** Called when user clicks Apply with current min/max (null = no limit). */
  onApply?: PriceRangeOnApply
}

function valueToDisplay(value: number | null, presets: readonly { label: string; value: number }[]): string {
  if (value === null || value === 0) return ""
  const found = presets.find((p) => p.value === value)
  return found ? found.label.replace(/[$,]/g, "") : value.toLocaleString()
}

export default function PriceRange({ value, onApply }: PriceRangeProps) {
  const [open, setOpen] = useState(false)
  const [minPrice, setMinPrice] = useState("")
  const [maxPrice, setMaxPrice] = useState("")
  const [activeInput, setActiveInput] = useState<"min" | "max" | null>(null)
  const [activeMinPreset, setActiveMinPreset] = useState<number | null>(null)
  const [activeMaxPreset, setActiveMaxPreset] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const lastActiveInputRef = useRef<"min" | "max">("min")

  // Sync from parent value so FilterOption and PriceRange stay in sync
  useEffect(() => {
    if (value === undefined) return
    const minStr = value.min === null || value.min === 0 ? "" : valueToDisplay(value.min, MIN_PRESETS)
    const maxStr = value.max === null || value.max >= 1_000_000_000 ? "" : valueToDisplay(value.max, MAX_PRESETS)
    setMinPrice(minStr === "" ? "" : (Number(minStr.replace(/[^0-9.]/g, ""))).toLocaleString())
    setMaxPrice(maxStr === "" ? "" : (Number(maxStr.replace(/[^0-9.]/g, ""))).toLocaleString())
    const minIdx = value.min === null || value.min === 0 ? null : MIN_PRESETS.findIndex((p) => p.value === value.min)
    const maxIdx = value.max === null || value.max >= 1_000_000_000 ? null : MAX_PRESETS.findIndex((p) => p.value === value.max)
    setActiveMinPreset(minIdx === -1 ? null : minIdx)
    setActiveMaxPreset(maxIdx === -1 ? null : maxIdx)
  }, [value?.min, value?.max])

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

  function handlePresetClick(value: number, index: number) {
    // Use last-focused input: clicking preset blurs the input so activeInput is already null
    const target = activeInput ?? lastActiveInputRef.current
    const formatted = value.toLocaleString()
    if (target === "min") {
      setMinPrice(formatted)
      setActiveMinPreset(index)
    } else {
      setMaxPrice(formatted)
      setActiveMaxPreset(index)
    }
  }

  function isPresetActive(target: "min" | "max", i: number) {
    return target === "min" ? activeMinPreset === i : activeMaxPreset === i
  }

  const minShort = minPrice ? formatPriceShort(minPrice) : ""
  const maxShort = maxPrice ? formatPriceShort(maxPrice) : ""
  const priceLabel =
    minShort || maxShort
      ? `${minShort ? `$${minShort}` : ""}-${maxShort ? `$${maxShort}` : ""}`.replace(/^-|-$/g, "") || "Price"
      : "Price"
  const hasActiveValue = Boolean(minShort || maxShort)

  return (
    <div className="relative inline-block font-ibm-plex-sans" ref={containerRef}>
      {/* Price dropdown trigger */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`flex w-full max-w-32 items-center justify-between gap-2 rounded-lg border ${
          hasActiveValue ? "border-[#04C0AF]" : "border-border"
        } bg-card px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:border-[#4ECDC4]/50 hover:text-foreground focus:border-[#4ECDC4] focus:outline-none focus:ring-1 focus:ring-[#4ECDC4]`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <span>{priceLabel}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-full min-w-[500px] rounded-2xl bg-card p-6 shadow-lg">
          <h2 className="text-lg font-medium text-foreground">
            Price Range
          </h2>

          <div className="mt-4 flex items-center gap-3">
            <input
              type="text"
              placeholder="Min Price"
              value={minPrice}
              onChange={(e) => {
                setMinPrice(e.target.value)
                setActiveMinPreset(null)
              }}
              onFocus={() => {
                setActiveInput("min")
                lastActiveInputRef.current = "min"
              }}
              onBlur={() => setActiveInput(null)}
              className={`w-full rounded-lg border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 ${
                activeInput === "min"
                  ? "border-[#4ECDC4] ring-2 ring-[#4ECDC4]/30"
                  : "border-border focus:border-[#4ECDC4] focus:ring-[#4ECDC4]"
              }`}
            />
            <span className="text-muted-foreground">&mdash;</span>
            <input
              type="text"
              placeholder="Max Price"
              value={maxPrice}
              onChange={(e) => {
                setMaxPrice(e.target.value)
                setActiveMaxPreset(null)
              }}
              onFocus={() => {
                setActiveInput("max")
                lastActiveInputRef.current = "max"
              }}
              onBlur={() => setActiveInput(null)}
              className={`w-full rounded-lg border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 ${
                activeInput === "max"
                  ? "border-[#4ECDC4] ring-2 ring-[#4ECDC4]/30"
                  : "border-border focus:border-[#4ECDC4] focus:ring-[#4ECDC4]"
              }`}
            />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {(activeInput ?? lastActiveInputRef.current) === "min"
              ? MIN_PRESETS.map((preset, i) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => handlePresetClick(preset.value, i)}
                    className={`rounded-lg border px-10 py-2.5 text-sm font-medium transition-colors ${
                      isPresetActive("min", i)
                        ? "border-[#4ECDC4] bg-[#4ECDC4]/10 text-foreground"
                        : "border-border bg-card text-muted-foreground hover:border-[#4ECDC4]/50 hover:text-foreground"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))
              : MAX_PRESETS.map((preset, i) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => handlePresetClick(preset.value, i)}
                    className={`rounded-lg border px-10 py-2.5 text-sm font-medium transition-colors ${
                      isPresetActive("max", i)
                        ? "border-[#4ECDC4] bg-[#4ECDC4]/10 text-foreground"
                        : "border-border bg-card text-muted-foreground hover:border-[#4ECDC4]/50 hover:text-foreground"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
          </div>

          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={() => {
                setMinPrice("")
                setMaxPrice("")
                setActiveMinPreset(null)
                setActiveMaxPreset(null)
              }}
              className="flex-1 rounded-xl border border-border bg-card py-3.5 text-base font-medium text-foreground transition-colors hover:bg-muted"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => {
                const minNum = parsePriceToNumber(minPrice)
                const maxNum = parsePriceToNumber(maxPrice)
                const min = minNum === null || minNum === 0 ? null : minNum
                const max =
                  maxNum === null || maxNum >= 1_000_000_000 ? null : maxNum
                onApply?.(min, max)
                setOpen(false)
              }}
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
