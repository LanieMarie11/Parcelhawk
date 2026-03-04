"use client"

import { useState, useRef, useEffect } from "react"
import {
  MapPin,
  Plus,
  MoreVertical,
  SquarePen,
  Trash2,
  ChevronDown,
} from "lucide-react"

interface SavedSearch {
  id: string
  name: string
  location: string
  priceRange: string
  size: string
  type: string
  alertsEnabled: boolean
  frequency: string
}

const initialSearches: SavedSearch[] = [
  {
    id: "1",
    name: "Relaxed House",
    location: "Gillespie County, TX",
    priceRange: "$75,000 - $185,000",
    size: "Under $1.5M",
    type: "Agricultural",
    alertsEnabled: true,
    frequency: "Weekly",
  },
  {
    id: "2",
    name: "Relaxed House",
    location: "Gillespie County, TX",
    priceRange: "$75,000 - $185,000",
    size: "Under $1.5M",
    type: "Agricultural",
    alertsEnabled: true,
    frequency: "Weekly",
  },
  {
    id: "3",
    name: "Relaxed House",
    location: "Gillespie County, TX",
    priceRange: "$75,000 - $185,000",
    size: "Under $1.5M",
    type: "Agricultural",
    alertsEnabled: true,
    frequency: "Weekly",
  },
  {
    id: "4",
    name: "Relaxed House",
    location: "Gillespie County, TX",
    priceRange: "$75,000 - $185,000",
    size: "Under $1.5M",
    type: "Agricultural",
    alertsEnabled: true,
    frequency: "Weekly",
  },
]

const sortOptions = ["Newest", "Oldest", "A-Z", "Z-A"]
const frequencyOptions = ["Daily", "Weekly", "Monthly"]

export default function SavedSearches() {
  const [searches, setSearches] = useState<SavedSearch[]>(initialSearches)
  const [sortBy, setSortBy] = useState("Newest")
  const [sortOpen, setSortOpen] = useState(false)
  const sortRef = useRef<HTMLDivElement>(null)

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

  const handleDelete = (id: string) => {
    setSearches((prev) => prev.filter((s) => s.id !== id))
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

      {/* Search cards */}
      <div className="mt-8 flex flex-col gap-4">
        {searches.map((search) => (
          <SearchCard
            key={search.id}
            search={search}
            onToggleAlerts={() => handleToggleAlerts(search.id)}
            onFrequencyChange={(freq) =>
              handleFrequencyChange(search.id, freq)
            }
            onDelete={() => handleDelete(search.id)}
          />
        ))}
      </div>
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
}: {
  search: SavedSearch
  onToggleAlerts: () => void
  onFrequencyChange: (frequency: string) => void
  onDelete: () => void
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
        <div className="flex-1">
          <h3 className="text-lg font-medium text-foreground">
            {search.name}
          </h3>
          <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-3.5" />
            <span>{search.location}</span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <FilterTag label="Price Range" value={search.priceRange} />
            <FilterTag label="Size" value={search.size} />
            <FilterTag label="Type" value={search.type} />
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
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                >
                  <Trash2 className="size-4" />
                  Delete
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
