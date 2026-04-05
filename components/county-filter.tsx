"use client"

import { ChevronDown } from "lucide-react"
import { useEffect, useId, useMemo, useRef, useState } from "react"
import countiesByState from "@/data/us-counties-by-state.json"

const COUNTIES: Record<string, string[]> = countiesByState

type CountyOption = { stateCode: string; name: string }

const ALL_COUNTY_OPTIONS: readonly CountyOption[] = (() => {
  const out: CountyOption[] = []
  for (const stateCode of Object.keys(COUNTIES).sort()) {
    for (const name of COUNTIES[stateCode]!) {
      out.push({ stateCode, name })
    }
  }
  return out
})()

const MAX_BROWSE = 400
const MAX_TYPEAHEAD = 50

export type CountyFilterValue = CountyOption | null

export type CountyFilterOnApply = (county: CountyFilterValue) => void

interface CountyFilterProps {
  /** When set, only counties in this state appear. When omitted, all US counties are searchable. */
  stateCode?: string | null
  value?: CountyFilterValue
  onApply?: CountyFilterOnApply
}

function normalize(s: string) {
  return s.trim().toLowerCase()
}

function optionsForScope(stateCode: string | null | undefined): CountyOption[] {
  if (!stateCode?.trim()) return [...ALL_COUNTY_OPTIONS]
  const key = stateCode.trim().toUpperCase()
  const names = COUNTIES[key] ?? []
  return names.map((name) => ({ stateCode: key, name }))
}

function filterOptions(query: string, options: CountyOption[]): CountyOption[] {
  const q = normalize(query)
  if (!q) return options
  return options.filter((o) => {
    const name = o.name.toLowerCase()
    const st = o.stateCode.toLowerCase()
    return (
      name.includes(q) ||
      st === q ||
      `${o.name}, ${o.stateCode}`.toLowerCase().includes(q)
    )
  })
}

function formatCounty(o: CountyOption) {
  return `${o.name}, ${o.stateCode}`
}

function resolveCommitted(raw: string, options: CountyOption[]): CountyOption | null {
  const q = normalize(raw)
  if (!q) return null
  const comma = raw.trim().match(/^(.+?),\s*([A-Za-z]{2})\s*$/)
  if (comma) {
    const name = comma[1].trim()
    const st = comma[2].trim().toUpperCase()
    const hit = options.find(
      (o) => o.stateCode === st && o.name.toLowerCase() === name.toLowerCase()
    )
    if (hit) return hit
  }
  const byName = options.filter((o) => o.name.toLowerCase() === q)
  if (byName.length === 1) return byName[0]
  const candidates = options.filter(
    (o) => o.name.toLowerCase().startsWith(q) || o.name.toLowerCase().includes(q)
  )
  if (candidates.length === 1) return candidates[0]
  return null
}

function optionKey(o: CountyOption) {
  return `${o.stateCode}\0${o.name}`
}

export default function CountyFilter({ stateCode, value, onApply }: CountyFilterProps) {
  const [draft, setDraft] = useState("")
  const [open, setOpen] = useState(false)
  const [showAllFromChevron, setShowAllFromChevron] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const listId = useId()

  const options = useMemo(() => optionsForScope(stateCode ?? null), [stateCode])

  useEffect(() => {
    if (value == null) setDraft("")
    else setDraft(formatCounty(value))
  }, [value])

  useEffect(() => {
    if (!stateCode?.trim()) return
    const key = stateCode.trim().toUpperCase()
    if (value != null && value.stateCode !== key) {
      setDraft("")
      onApply?.(null)
    }
  }, [stateCode, value, onApply])

  const suggestions = useMemo(() => {
    const narrowed = filterOptions(draft, options)
    if (showAllFromChevron) {
      return options.length > MAX_BROWSE ? options.slice(0, MAX_BROWSE) : options
    }
    return narrowed.slice(0, MAX_TYPEAHEAD)
  }, [draft, options, showAllFromChevron])

  useEffect(() => {
    setActiveIndex(0)
  }, [draft, showAllFromChevron])

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setShowAllFromChevron(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  function commit(next: CountyFilterValue) {
    onApply?.(next)
    if (next == null) setDraft("")
    else setDraft(formatCounty(next))
  }

  function handleSelect(o: CountyOption) {
    commit(o)
    setOpen(false)
    setShowAllFromChevron(false)
  }

  function handleBlurCommit() {
    setOpen(false)
    setShowAllFromChevron(false)
    const resolved = resolveCommitted(draft, options)
    if (draft.trim() === "") {
      if (value != null) commit(null)
      return
    }
    if (resolved) {
      if (value == null || value.stateCode !== resolved.stateCode || value.name !== resolved.name) {
        commit(resolved)
      } else {
        setDraft(formatCounty(resolved))
      }
      return
    }
    if (value != null) setDraft(formatCounty(value))
  }

  const inputClass =
    "box-border h-[34px] w-full rounded-[10px] border border-[#E5E7EB] bg-[#F8F9FA] py-0 pl-3 pr-9 text-left text-sm text-[#374151] shadow-none transition-colors placeholder:text-muted-foreground/70 focus:border-[#6B9B7A]/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6B9B7A]/15"

  return (
    <div className="relative inline-flex flex-col font-ibm-plex-sans" ref={containerRef}>
      <span className="text-xs font-normal text-muted-foreground">County</span>

      <div className="relative mt-1.5 w-[180px]">
        <input
          type="text"
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label="County"
          placeholder="County or County, ST"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            setShowAllFromChevron(false)
            setOpen(true)
          }}
          onFocus={() => {
            setOpen(true)
            setShowAllFromChevron(false)
          }}
          onBlur={(e) => {
            const next = e.relatedTarget as Node | null
            if (containerRef.current?.contains(next)) return
            handleBlurCommit()
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault()
              setOpen(false)
              setShowAllFromChevron(false)
              if (value != null) setDraft(formatCounty(value))
              else setDraft("")
              return
            }
            if (e.key === "ArrowDown") {
              e.preventDefault()
              setOpen(true)
              setActiveIndex((i) => Math.min(i + 1, Math.max(0, suggestions.length - 1)))
              return
            }
            if (e.key === "ArrowUp") {
              e.preventDefault()
              setActiveIndex((i) => Math.max(0, i - 1))
              return
            }
            if (e.key === "Enter") {
              e.preventDefault()
              const pick = suggestions[activeIndex]
              if (pick) handleSelect(pick)
              else e.currentTarget.blur()
            }
          }}
          className={inputClass}
        />

        <button
          type="button"
          tabIndex={-1}
          className="absolute right-0 top-0 flex h-[34px] w-9 shrink-0 items-center justify-center rounded-r-[10px] text-[#374151] transition-colors hover:text-[#111827] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#6B9B7A]/25"
          aria-expanded={open && showAllFromChevron}
          aria-label="Browse counties"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setShowAllFromChevron((prev) => !prev)
            setOpen(true)
          }}
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform ${open && showAllFromChevron ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>

        {open && suggestions.length > 0 ? (
          <ul
            id={listId}
            role="listbox"
            className="absolute left-0 top-full z-50 mt-2 max-h-60 min-w-full overflow-auto rounded-xl border border-border bg-card py-1 shadow-lg"
          >
            {suggestions.map((o, i) => (
              <li key={optionKey(o)} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={
                    value != null &&
                    value.stateCode === o.stateCode &&
                    value.name === o.name
                  }
                  onMouseDown={(ev) => ev.preventDefault()}
                  onClick={() => handleSelect(o)}
                  className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors ${
                    i === activeIndex ? "bg-[#6B9B7A]/15 text-foreground" : "text-foreground hover:bg-muted/50"
                  }`}
                >
                  <span className="min-w-0 flex-1 font-medium">{o.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{o.stateCode}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  )
}
