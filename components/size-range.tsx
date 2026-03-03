"use client"

import { ChevronDown } from "lucide-react"
import { useEffect, useRef, useState } from "react"

const MIN_PRESETS = [
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

const MAX_PRESETS = [
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

const NO_MAX_VALUE = 999999

function parseAcresToNumber(value: string): number | null {
  const num = Number(String(value).replace(/[^0-9.]/g, ""))
  if (!Number.isFinite(num) || num < 0) return null
  return num
}

export type SizeRangeOnApply = (min: number | null, max: number | null) => void

export type SizeRangeValue = { min: number | null; max: number | null }

interface SizeRangeProps {
  /** Controlled min/max acres (null = no limit). When provided, internal state syncs from this. */
  value?: SizeRangeValue
  /** Called when user clicks Apply with current min/max acres (null = no limit). */
  onApply?: SizeRangeOnApply
}

function valueToDisplay(value: number | null, presets: readonly { label: string; value: number }[]): string {
  if (value === null || value === 0) return ""
  if (value >= NO_MAX_VALUE) return ""
  const found = presets.find((p) => p.value === value)
  return found ? String(value) : (value ? String(value) : "")
}

export default function SizeRange({ value, onApply }: SizeRangeProps) {
  const [open, setOpen] = useState(false)
  const [minAcres, setMinAcres] = useState("")
  const [maxAcres, setMaxAcres] = useState("")
  const [activeInput, setActiveInput] = useState<"min" | "max" | null>(null)
  const [activeMinPreset, setActiveMinPreset] = useState<number | null>(null)
  const [activeMaxPreset, setActiveMaxPreset] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const lastActiveInputRef = useRef<"min" | "max">("min")

  // Sync from parent value so FilterOption and SizeRange stay in sync
  useEffect(() => {
    if (value === undefined) return
    const minStr = value.min === null || value.min === 0 ? "" : valueToDisplay(value.min, MIN_PRESETS)
    const maxStr = value.max === null || value.max >= NO_MAX_VALUE ? "" : valueToDisplay(value.max, MAX_PRESETS)
    setMinAcres(minStr)
    setMaxAcres(maxStr)
    const minIdx = value.min === null || value.min === 0 ? null : MIN_PRESETS.findIndex((p) => p.value === value.min)
    const maxIdx = value.max === null || value.max >= NO_MAX_VALUE ? null : MAX_PRESETS.findIndex((p) => p.value === value.max)
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
    const formatted = String(value)
    if (target === "min") {
      setMinAcres(formatted)
      setActiveMinPreset(index)
    } else {
      setMaxAcres(value >= 999999 ? "" : formatted)
      setActiveMaxPreset(index)
    }
  }

  function isPresetActive(target: "min" | "max", i: number) {
    return target === "min" ? activeMinPreset === i : activeMaxPreset === i
  }

  const displayLabel =
    minAcres && maxAcres
      ? `${minAcres}–${maxAcres} Acres`
      : minAcres
        ? `${minAcres}+ Acres`
        : maxAcres
          ? `Up to ${maxAcres} Acres`
          : "Size"
  const hasActiveValue = Boolean(minAcres || maxAcres)

  return (
    <div className="relative inline-block font-ibm-plex-sans" ref={containerRef}>
      {/* Size dropdown trigger */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`flex w-full max-w-32 items-center justify-between gap-2 rounded-lg border ${
          hasActiveValue ? "border-[#04C0AF]" : "border-border"
        } bg-card px-1 py-2.5 text-sm text-muted-foreground transition-colors hover:border-[#4ECDC4]/50 hover:text-foreground focus:border-[#4ECDC4] focus:outline-none focus:ring-1 focus:ring-[#4ECDC4]`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <span>{displayLabel}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-full min-w-[500px] rounded-2xl bg-card p-6 shadow-lg">
          <h2 className="text-lg font-medium text-foreground">
            Size Range (Acres)
          </h2>

          <div className="mt-4 flex items-center gap-3">
            <input
              type="text"
              placeholder="Min Acres"
              value={minAcres}
              onChange={(e) => {
                setMinAcres(e.target.value)
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
              placeholder="Max Acres"
              value={maxAcres}
              onChange={(e) => {
                setMaxAcres(e.target.value)
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
                    className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
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
                    className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
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
                setMinAcres("")
                setMaxAcres("")
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
                const minNum = parseAcresToNumber(minAcres)
                const maxNum = parseAcresToNumber(maxAcres)
                const min = minNum === null || minNum === 0 ? null : minNum
                const max =
                  maxNum === null || maxNum >= NO_MAX_VALUE ? null : maxNum
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
