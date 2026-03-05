"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import {
  MapPin,
  Plus,
  MoreVertical,
  SquarePen,
  Trash2,
  ChevronDown,
  ExternalLink,
} from "lucide-react"

interface SavedSearch {
  id: string
  name: string
  location: string
  priceRange: string
  size: string
  type: string
  activities: string
  alertsEnabled: boolean
  frequency: string
  /** URL to land-property with this search's filters (for View Result) */
  viewResultHref: string
}

/** DB row shape from GET /api/saved-searches */
interface SavedSearchRow {
  id: string
  name: string
  frequency: string
  minPrice: string | null
  maxPrice: string | null
  minAcres: string | null
  maxAcres: string | null
  location: string | null
  propertyType: string | null
  landType: string | null
  activities: string[] | null
}

function formatPrice(num: string | null): string {
  if (num == null || num === "") return ""
  const n = Number(num.replace(/[^0-9.]/g, ""))
  if (!Number.isFinite(n)) return num
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
}

function formatPriceRange(min: string | null, max: string | null): string {
  const minF = formatPrice(min)
  const maxF = formatPrice(max)
  if (!minF && !maxF) return "Any"
  if (!minF) return `Up to ${maxF}`
  if (!maxF) return `${minF}+`
  return `${minF} - ${maxF}`
}

function formatAcres(num: string | null): string {
  if (num == null || num === "") return ""
  const n = Number(num)
  return Number.isFinite(n) ? `${n} Acres` : num
}

function formatSize(minAcres: string | null, maxAcres: string | null): string {
  const minF = formatAcres(minAcres)
  const maxF = formatAcres(maxAcres)
  if (!minF && !maxF) return "Any"
  if (!minF) return `Up to ${maxF}`
  if (!maxF) return `${minF}+`
  return `${minF} - ${maxF}`
}

function frequencyDisplayLabel(freq: string): string {
  const map: Record<string, string> = {
    instant: "Instant",
    daily: "Daily",
    none: "No Updates",
    Daily: "Daily",
    Weekly: "Weekly",
    Monthly: "Monthly",
  }
  return map[freq] ?? freq
}

function buildViewResultHref(row: SavedSearchRow): string {
  const params = new URLSearchParams()
  if (row.location?.trim()) params.set("location", row.location.trim())
  if (row.propertyType?.trim()) params.set("type", row.propertyType.trim())
  if (row.minPrice != null && row.minPrice !== "") params.set("minPrice", row.minPrice)
  if (row.maxPrice != null && row.maxPrice !== "") params.set("maxPrice", row.maxPrice)
  if (row.minAcres != null && row.minAcres !== "") params.set("minAcres", row.minAcres)
  if (row.maxAcres != null && row.maxAcres !== "") params.set("maxAcres", row.maxAcres)
  row.activities?.forEach((a) => params.append("activity", a))
  const qs = params.toString()
  return `/land-property${qs ? `?${qs}` : ""}`
}

function rowToSavedSearch(row: SavedSearchRow): SavedSearch {
  return {
    id: row.id,
    name: row.name,
    location: row.location ?? "Any location",
    priceRange: formatPriceRange(row.minPrice, row.maxPrice),
    size: formatSize(row.minAcres, row.maxAcres),
    type: row.propertyType ?? row.landType ?? "Any type",
    activities: row.activities?.length ? row.activities.join(", ") : "Any",
    alertsEnabled: true,
    frequency: frequencyDisplayLabel(row.frequency),
    viewResultHref: buildViewResultHref(row),
  }
}

const sortOptions = ["Newest", "Oldest", "A-Z", "Z-A"]
const frequencyOptions = ["Instant", "Daily", "Weekly", "Monthly", "No Updates"]

export default function SavedSearches() {
  const [searches, setSearches] = useState<SavedSearch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState("Newest")
  const [sortOpen, setSortOpen] = useState(false)
  const sortRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch("/api/saved-searches")
        if (!res.ok) {
          if (res.status === 401) {
            setSearches([])
            return
          }
          throw new Error("Failed to load saved searches")
        }
        const data = await res.json()
        if (cancelled || !Array.isArray(data)) return
        setSearches(data.map((row: SavedSearchRow) => rowToSavedSearch(row)))
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Something went wrong")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleToggleAlerts = (id: string) => {
    setSearches((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, alertsEnabled: !s.alertsEnabled } : s
      )
    )
  }

  const handleFrequencyChange = (id: string, frequency: string) => {
    setSearches((prev) =>
      prev.map((s) => (s.id === id ? { ...s, frequency } : s))
    )
  }

  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/saved-searches/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Failed to delete")
      }
      setSearches((prev) => prev.filter((s) => s.id !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete saved search")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8 font-ibm-plex-sans">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Saved Searches
          </h1>
          <p className="mt-1 text-base text-muted-foreground">
            Manage your saved filters and get alerts when new land matches.
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Sort dropdown */}
          <div className="relative flex items-center gap-2" ref={sortRef}>
            <span className="text-sm text-muted-foreground">Sort:</span>
            <button
              onClick={() => setSortOpen((o) => !o)}
              className="flex items-center gap-1 text-sm font-medium text-foreground"
            >
              {sortBy}
              <ChevronDown className="size-4 text-muted-foreground" />
            </button>
            {sortOpen && (
              <div className="absolute right-0 top-full z-20 mt-1 min-w-28 rounded-md border border-border bg-card py-1 shadow-lg">
                {sortOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => {
                      setSortBy(option)
                      setSortOpen(false)
                    }}
                    className={`block w-full px-3 py-1.5 text-left text-sm transition-colors hover:bg-secondary ${
                      sortBy === option
                        ? "font-medium text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Create new button */}
          <button className="flex items-center gap-2 rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90">
            <Plus className="size-4" />
            Create new
          </button>
        </div>
      </div>

      {/* Loading / error */}
      {loading && (
        <div className="mt-8 text-center text-sm text-muted-foreground">
          Loading saved searches…
        </div>
      )}
      {error && !loading && (
        <div className="mt-8 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Search cards */}
      {!loading && (
        <div className="mt-8 flex flex-col gap-4">
          {searches.length === 0 && !error && (
            <p className="text-center text-sm text-muted-foreground">
              No saved searches yet. Save a search from the land property page to see it here.
            </p>
          )}
          {searches.map((search) => (
            <SearchCard
              key={search.id}
              search={search}
              onToggleAlerts={() => handleToggleAlerts(search.id)}
              onFrequencyChange={(freq) =>
                handleFrequencyChange(search.id, freq)
              }
              onDelete={() => handleDelete(search.id)}
              isDeleting={deletingId === search.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Search Card                                                       */
/* ------------------------------------------------------------------ */

function SearchCard({
  search,
  onToggleAlerts,
  onFrequencyChange,
  onDelete,
  isDeleting = false,
}: {
  search: SavedSearch
  onToggleAlerts: () => void
  onFrequencyChange: (frequency: string) => void
  onDelete: () => void
  isDeleting?: boolean
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [freqOpen, setFreqOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const freqRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
      if (freqRef.current && !freqRef.current.contains(e.target as Node)) {
        setFreqOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div className="rounded-lg border border-border bg-card p-5 transition-colors hover:border-muted-foreground/20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {/* Left content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-lg font-medium text-foreground">
              {search.name}
            </h3>
            <Link
              href={search.viewResultHref}
              className="shrink-0 flex items-center gap-1.5 rounded-lg bg-[#04C0AF] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[#3dbdb5]"
            >
              <ExternalLink className="size-3.5" />
              View Result
            </Link>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-3.5" />
            <span>{search.location}</span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <FilterTag label="Price Range" value={search.priceRange} />
            <FilterTag label="Size" value={search.size} />
            <FilterTag label="Type" value={search.type} />
            <FilterTag label="Activities" value={search.activities} />
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-3">
          {/* Alerts + Frequency in one grey pill */}
          <div className="flex items-center rounded-lg bg-[#F5F5F4] py-2 px-2">
            {/* Toggle switch */}
            <div className="flex items-center gap-2">
              <button
                role="switch"
                aria-checked={search.alertsEnabled}
                onClick={onToggleAlerts}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                  search.alertsEnabled ? "bg-[#04C0AF]" : "bg-[#E5E7EB]"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block size-5 rounded-full bg-white shadow-sm ring-0 transition-transform ${
                    search.alertsEnabled ? "translate-x-5.5" : "translate-x-0.5"
                  }`}
                />
              </button>
              <span className="text-xs font-medium text-[#373940]">Alerts</span>
            </div>

            {/* Vertical separator */}
            <div className="mx-4 h-5 w-px shrink-0 bg-border" aria-hidden />

            {/* Frequency selector */}
            <div className="relative" ref={freqRef}>
              <button
                onClick={() => setFreqOpen((o) => !o)}
                className="flex items-center gap-1 text-xs font-medium text-[#5D606D]"
              >
                {search.frequency}
                <ChevronDown className="size-3.5 text-muted-foreground" />
              </button>
              {freqOpen && (
                <div className="absolute right-0 top-full z-20 mt-1 min-w-28 rounded-md border border-border bg-card py-1 shadow-lg">
                  {frequencyOptions.map((option) => (
                    <button
                      key={option}
                      onClick={() => {
                        onFrequencyChange(option)
                        setFreqOpen(false)
                      }}
                      className={`block w-full px-3 py-1.5 text-left text-xs transition-colors hover:bg-secondary ${
                        search.frequency === option
                          ? "font-medium text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Three-dot menu (outside grey box) */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label="More options"
            >
              <MoreVertical className="size-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded-md border border-border bg-card py-1 shadow-lg">
                <button
                  onClick={() => setMenuOpen(false)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left font-medium text-sm text-[#5D606D] transition-colors hover:bg-secondary"
                >
                  <SquarePen className="size-4" />
                  Edit Search
                </button>
                <button
                  onClick={() => {
                    onDelete()
                    setMenuOpen(false)
                  }}
                  disabled={isDeleting}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
                >
                  <Trash2 className="size-4" />
                  {isDeleting ? "Deleting…" : "Delete"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Filter Tag                                                        */
/* ------------------------------------------------------------------ */

function FilterTag({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2.5 py-1 text-xs text-[#373940]">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">{value}</span>
    </span>
  )
}
