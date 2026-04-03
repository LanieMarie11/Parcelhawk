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

function parseAcresToNumber(raw: string): number | null {
  const num = Number(String(raw).replace(/[^0-9.]/g, ""))
  if (!Number.isFinite(num) || num < 0) return null
  return num
}

function digitsOnly(raw: string): string {
  return String(raw).replace(/[^0-9.]/g, "")
}

export type SizeRangeOnApply = (min: number | null, max: number | null) => void

export type SizeRangeValue = { min: number | null; max: number | null }

interface SizeRangeProps {
  value?: SizeRangeValue
  onApply?: SizeRangeOnApply
}

function toApplyValues(minDigits: string, maxDigits: string): {
  min: number | null
  max: number | null
} {
  const minNum =
    minDigits === "" ? 0 : parseAcresToNumber(minDigits) ?? 0
  const maxNum =
    maxDigits === "" ? null : parseAcresToNumber(maxDigits)
  const min = minNum === 0 ? null : minNum
  const max =
    maxNum === null || maxNum >= NO_MAX_VALUE ? null : maxNum
  return { min, max }
}

export default function SizeRange({ value, onApply }: SizeRangeProps) {
  const [presetsOpen, setPresetsOpen] = useState(false)
  /** Digits string; empty min means no minimum (display "0" when blurred, like price "$0") */
  const [minDigits, setMinDigits] = useState("")
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
    else setMinDigits(String(value.min))
    if (value.max === null || value.max >= NO_MAX_VALUE) setMaxDigits("")
    else setMaxDigits(String(value.max))
    const minIdx =
      value.min === null || value.min === 0
        ? null
        : MIN_PRESETS.findIndex((p) => p.value === value.min)
    const maxIdx =
      value.max === null || value.max >= NO_MAX_VALUE
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
        ? presetValue >= NO_MAX_VALUE
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
      ? "0"
      : minDigits

  const maxInputValue = maxFocused ? maxDigits : maxDigits === "" ? "" : maxDigits

  const inputCompactClass =
    "box-border h-[34px] w-[93px] shrink-0 rounded-[10px] border border-[#E5E7EB] bg-[#F8F9FA] px-3 text-left text-sm text-[#374151] shadow-none transition-colors placeholder:text-muted-foreground/70 focus:border-[#6B9B7A]/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6B9B7A]/15"

  return (
    <div className="relative inline-flex flex-col font-ibm-plex-sans" ref={containerRef}>
      <span className="text-xs font-normal text-muted-foreground">Acres</span>

      <div className="mt-1.5 flex items-center gap-2">
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          aria-label="Minimum acres"
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
          inputMode="decimal"
          autoComplete="off"
          aria-label="Maximum acres"
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
{/*  */}
{/* TODO: Remove this button */}
        {/* <button
          type="button"
          onClick={() => setPresetsOpen((prev) => !prev)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/50 bg-muted/40 text-muted-foreground transition-colors hover:border-border hover:bg-muted/60 hover:text-foreground"
          aria-expanded={presetsOpen}
          aria-label="Acres presets"
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
