"use client"

import { ChevronDown } from "lucide-react"
import { useEffect, useRef, useState } from "react"

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

function parsePriceToNumber(raw: string): number | null {
  const num = Number(String(raw).replace(/[^0-9.]/g, ""))
  if (!Number.isFinite(num) || num < 0) return null
  return num
}

function digitsOnly(raw: string): string {
  return String(raw).replace(/[^0-9]/g, "")
}

export type PriceRangeOnApply = (min: number | null, max: number | null) => void

export type PriceRangeValue = { min: number | null; max: number | null }

interface PriceRangeProps {
  value?: PriceRangeValue
  onApply?: PriceRangeOnApply
}

function toApplyValues(minDigits: string, maxDigits: string): {
  min: number | null
  max: number | null
} {
  const minNum =
    minDigits === "" ? 0 : parsePriceToNumber(minDigits) ?? 0
  const maxNum =
    maxDigits === "" ? null : parsePriceToNumber(maxDigits)
  const min = minNum === 0 ? null : minNum
  const max =
    maxNum === null || maxNum >= 1_000_000_000 ? null : maxNum
  return { min, max }
}

export default function PriceRange({ value, onApply }: PriceRangeProps) {
  const [presetsOpen, setPresetsOpen] = useState(false)
  /** Digits-only string; empty means $0 / no min */
  const [minDigits, setMinDigits] = useState("")
  /** Digits-only string; empty means no max */
  const [maxDigits, setMaxDigits] = useState("")
  const [minFocused, setMinFocused] = useState(false)
  const [maxFocused, setMaxFocused] = useState(false)
  const [activeInput, setActiveInput] = useState<"min" | "max" | null>(null)
  const [activeMinPreset, setActiveMinPreset] = useState<number | null>(null)
  const [activeMaxPreset, setActiveMaxPreset] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const lastActiveInputRef = useRef<"min" | "max">("min")

  useEffect(() => {
    if (value === undefined) return
    if (value.min === null || value.min === 0) setMinDigits("")
    else setMinDigits(String(Math.round(value.min)))
    if (value.max === null || value.max >= 1_000_000_000) setMaxDigits("")
    else setMaxDigits(String(Math.round(value.max)))
    const minIdx =
      value.min === null || value.min === 0
        ? null
        : MIN_PRESETS.findIndex((p) => p.value === value.min)
    const maxIdx =
      value.max === null || value.max >= 1_000_000_000
        ? null
        : MAX_PRESETS.findIndex((p) => p.value === value.max)
    setActiveMinPreset(minIdx === -1 ? null : minIdx)
    setActiveMaxPreset(maxIdx === -1 ? null : maxIdx)
  }, [value?.min, value?.max])

  useEffect(() => {
    if (!presetsOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setPresetsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [presetsOpen])

  function commit() {
    const { min, max } = toApplyValues(minDigits, maxDigits)
    onApply?.(min, max)
  }

  function handlePresetClick(presetValue: number, index: number) {
    const target = activeInput ?? lastActiveInputRef.current
    const nextMin =
      target === "min"
        ? presetValue === 0
          ? ""
          : String(presetValue)
        : minDigits
    const nextMax =
      target === "max"
        ? presetValue >= 1_000_000_000
          ? ""
          : String(presetValue)
        : maxDigits

    if (target === "min") {
      setMinDigits(nextMin)
      setActiveMinPreset(index)
    } else {
      setMaxDigits(nextMax)
      setActiveMaxPreset(index)
    }

    const { min, max } = toApplyValues(nextMin, nextMax)
    onApply?.(min, max)
  }

  function isPresetActive(target: "min" | "max", i: number) {
    return target === "min" ? activeMinPreset === i : activeMaxPreset === i
  }

  const minInputValue = minFocused
    ? minDigits
    : minDigits === ""
      ? "$0"
      : `$${Number(minDigits).toLocaleString("en-US")}`

  const maxInputValue = maxFocused
    ? maxDigits
    : maxDigits === ""
      ? ""
      : `$${Number(maxDigits).toLocaleString("en-US")}`

  /** Compact fields: 93×34px, soft rounded rect (matches filter row mock). */
  const inputCompactClass =
    "box-border h-[34px] w-[93px] shrink-0 rounded-[10px] border border-[#E5E7EB] bg-[#F8F9FA] px-3 text-left text-sm text-[#374151] shadow-none transition-colors placeholder:text-muted-foreground/70 focus:border-[#6B9B7A]/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6B9B7A]/15"

  return (
    <div className="relative inline-flex flex-col font-ibm-plex-sans" ref={containerRef}>
      <span className="text-xs font-normal text-muted-foreground">Price Range</span>

      <div className="mt-1.5 flex items-center gap-2">
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          aria-label="Minimum price"
          value={minInputValue}
          onChange={(e) => {
            const d = digitsOnly(e.target.value)
            setMinDigits(d)
            setActiveMinPreset(null)
          }}
          onFocus={() => {
            setMinFocused(true)
            setActiveInput("min")
            lastActiveInputRef.current = "min"
          }}
          onBlur={() => {
            setMinFocused(false)
            setActiveInput(null)
            commit()
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur()
            }
          }}
          className={inputCompactClass}
        />

        <span className="shrink-0 text-sm font-normal text-muted-foreground" aria-hidden>
          -
        </span>

        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          aria-label="Maximum price"
          placeholder="Max"
          value={maxInputValue}
          onChange={(e) => {
            const d = digitsOnly(e.target.value)
            setMaxDigits(d)
            setActiveMaxPreset(null)
          }}
          onFocus={() => {
            setMaxFocused(true)
            setActiveInput("max")
            lastActiveInputRef.current = "max"
          }}
          onBlur={() => {
            setMaxFocused(false)
            setActiveInput(null)
            commit()
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur()
            }
          }}
          className={inputCompactClass}
        />
{/* TODO: Remove this button */}
        {/* <button
          type="button"
          onClick={() => setPresetsOpen((prev) => !prev)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/50 bg-muted/40 text-muted-foreground transition-colors hover:border-border hover:bg-muted/60 hover:text-foreground"
          aria-expanded={presetsOpen}
          aria-label="Price presets"
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform ${presetsOpen ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button> */}
      </div>

      {presetsOpen && (
        <div className="absolute left-0 top-full z-50 mt-2 w-full min-w-[min(100vw-2rem,520px)] max-w-[90vw] rounded-2xl border border-border bg-card p-5 shadow-lg">
          <p className="text-sm font-medium text-foreground">Quick amounts</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(activeInput ?? lastActiveInputRef.current) === "min"
              ? MIN_PRESETS.map((preset, i) => (
                  <button
                    key={preset.value}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handlePresetClick(preset.value, i)}
                    className={`rounded-full border px-3 py-2 text-sm font-medium transition-colors ${
                      isPresetActive("min", i)
                        ? "border-[#6B9B7A] bg-[#6B9B7A]/15 text-foreground"
                        : "border-border/60 bg-muted/30 text-muted-foreground hover:border-[#6B9B7A]/50 hover:text-foreground"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))
              : MAX_PRESETS.map((preset, i) => (
                  <button
                    key={preset.value}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handlePresetClick(preset.value, i)}
                    className={`rounded-full border px-3 py-2 text-sm font-medium transition-colors ${
                      isPresetActive("max", i)
                        ? "border-[#6B9B7A] bg-[#6B9B7A]/15 text-foreground"
                        : "border-border/60 bg-muted/30 text-muted-foreground hover:border-[#6B9B7A]/50 hover:text-foreground"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
          </div>

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setMinDigits("")
                setMaxDigits("")
                setActiveMinPreset(null)
                setActiveMaxPreset(null)
                onApply?.(null, null)
              }}
              className="flex-1 rounded-full border border-border/70 bg-muted/30 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
            >
              Clear
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                commit()
                setPresetsOpen(false)
              }}
              className="flex-1 rounded-full bg-[#2F5B3A] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#264A30]"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
