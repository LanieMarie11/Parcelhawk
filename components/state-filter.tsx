"use client"

import { ChevronDown } from "lucide-react"
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import usStates from "@/data/us-states.json"

export type USState = { code: string; name: string }

const STATES: readonly USState[] = usStates

export type StateFilterValue = USState | null

export type StateFilterOnApply = (state: StateFilterValue) => void

interface StateFilterProps {
  value?: StateFilterValue
  onApply?: StateFilterOnApply
}

function normalize(s: string) {
  return s.trim().toLowerCase()
}

function filterStates(query: string): USState[] {
  const q = normalize(query)
  if (!q) return []
  return STATES.filter((s) => {
    const name = s.name.toLowerCase()
    const code = s.code.toLowerCase()
    return name.includes(q) || code.startsWith(q) || name.startsWith(q)
  })
}

/** Resolve a single state from user text on blur, or null if ambiguous / partial. */
function resolveCommittedState(raw: string): USState | null {
  const q = normalize(raw)
  if (!q) return null
  const upper = raw.trim().toUpperCase()
  if (upper.length === 2) {
    const byCode = STATES.find((s) => s.code === upper)
    if (byCode) return byCode
  }
  const exactName = STATES.find((s) => s.name.toLowerCase() === q)
  if (exactName) return exactName
  const candidates = STATES.filter(
    (s) =>
      s.name.toLowerCase().startsWith(q) ||
      s.code.toLowerCase() === q ||
      s.name.toLowerCase().includes(q)
  )
  if (candidates.length === 1) return candidates[0]
  return null
}

export default function StateFilter({ value, onApply }: StateFilterProps) {
  const [draft, setDraft] = useState("")
  const [open, setOpen] = useState(false)
  const [showAllFromChevron, setShowAllFromChevron] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [listPos, setListPos] = useState({ top: 0, left: 0, width: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const inputWrapperRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const listId = useId()

  useEffect(() => {
    if (value == null) setDraft("")
    else setDraft(value.name)
  }, [value?.code, value?.name])

  const suggestions = useMemo(() => {
    const list = showAllFromChevron ? [...STATES] : filterStates(draft)
    return showAllFromChevron ? list : list.slice(0, 50)
  }, [draft, showAllFromChevron])

  useEffect(() => {
    setActiveIndex(0)
  }, [draft, showAllFromChevron])

  useEffect(() => {
    setMounted(true)
  }, [])

  const updateListPos = useCallback(() => {
    const el = inputWrapperRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setListPos({
      top: rect.bottom + 8,
      left: rect.left,
      width: rect.width,
    })
  }, [])

  useEffect(() => {
    if (!open) return
    updateListPos()
    window.addEventListener("resize", updateListPos)
    window.addEventListener("scroll", updateListPos, true)
    return () => {
      window.removeEventListener("resize", updateListPos)
      window.removeEventListener("scroll", updateListPos, true)
    }
  }, [open, updateListPos])

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      if (containerRef.current?.contains(target)) return
      if (listRef.current?.contains(target)) return
      setOpen(false)
      setShowAllFromChevron(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  function commit(next: USState | null) {
    onApply?.(next)
    if (next == null) setDraft("")
    else setDraft(next.name)
  }

  function handleSelect(s: USState) {
    commit(s)
    setOpen(false)
    setShowAllFromChevron(false)
  }

  function handleBlurCommit() {
    setOpen(false)
    setShowAllFromChevron(false)
    const resolved = resolveCommittedState(draft)
    if (draft.trim() === "") {
      if (value != null) commit(null)
      return
    }
    if (resolved) {
      if (value?.code !== resolved.code) commit(resolved)
      else setDraft(resolved.name)
      return
    }
    if (value != null) setDraft(value.name)
  }

  const inputClass =
    "box-border h-[34px] w-full rounded-[10px] border border-[#E5E7EB] bg-[#F8F9FA] py-0 pl-3 pr-9 text-left text-sm text-[#374151] shadow-none transition-colors placeholder:text-muted-foreground/70 focus:border-[#6B9B7A]/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6B9B7A]/15"

  return (
    <div className="relative inline-flex flex-col font-ibm-plex-sans" ref={containerRef}>
      <span className="text-xs font-normal text-muted-foreground">State</span>

      <div className="relative mt-1.5 w-[180px]" ref={inputWrapperRef}>
        <input
          type="text"
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label="State"
          placeholder="e.g. Colorado or CO"
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
              if (value != null) setDraft(value.name)
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
          aria-label="Show all states"
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

        {mounted && open && suggestions.length > 0
          ? createPortal(
              <ul
                ref={listRef}
                id={listId}
                role="listbox"
                style={{ top: listPos.top, left: listPos.left, width: listPos.width }}
                className="fixed z-120 max-h-60 overflow-auto rounded-xl border border-border bg-card py-1 shadow-lg"
              >
                {suggestions.map((s, i) => (
                  <li key={s.code} role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={value?.code === s.code}
                      onMouseDown={(ev) => ev.preventDefault()}
                      onClick={() => handleSelect(s)}
                      className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors ${
                        i === activeIndex ? "bg-[#6B9B7A]/15 text-foreground" : "text-foreground hover:bg-muted/50"
                      }`}
                    >
                      <span className="font-medium">{s.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{s.code}</span>
                    </button>
                  </li>
                ))}
              </ul>,
              document.body
            )
          : null}
      </div>
    </div>
  )
}
