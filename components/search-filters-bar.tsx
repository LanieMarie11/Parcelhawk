"use client"

import { Search, Heart } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import { LocationSearchInput } from "@/components/location-search-input"
import PriceRange from "@/app/(buyer)/components/price-range"
import type { PriceRangeOnApply } from "@/app/(buyer)/components/price-range"
import SizeRange from "@/app/(buyer)/components/size-range"
import type { SizeRangeOnApply } from "@/app/(buyer)/components/size-range"
import FilterOption, {
  type FilterApplyPayload,
  type LandFeatureFilters,
} from "@/app/(buyer)/components/filter-option"
import { SavePropertySearchModal, type SavedSearchFilters } from "@/app/(buyer)/components/save-search-property-modal"
import { useSignInModal } from "@/lib/sign-in-modal-context"
import CountyFilter, { type CountyFilterValue } from "./county-filter"
import StateFilter, { type StateFilterValue } from "./state-filter"

interface SearchFiltersBarProps {
  /** Listing IDs for "Save Search" (saves these to favorites). Button disabled when empty. */
  listingIds?: number[]
  /** Current min price from parent (single source of truth so PriceRange and FilterOption stay in sync). */
  priceMin?: number | null
  /** Current max price from parent (single source of truth so PriceRange and FilterOption stay in sync). */
  priceMax?: number | null
  /** Current min size in acres from parent (single source of truth so SizeRange and FilterOption stay in sync). */
  sizeMin?: number | null
  /** Current max size in acres from parent (single source of truth so SizeRange and FilterOption stay in sync). */
  sizeMax?: number | null
  /** Called when user applies price range (min, max in dollars; null = no limit). */
  onPriceRangeApply?: PriceRangeOnApply
  /** Called when user applies size range (min, max in acres; null = no limit). */
  onSizeRangeApply?: SizeRangeOnApply
  /** Called when user applies the full filter panel (price, size, property types, activities). */
  onFilterApply?: (payload: FilterApplyPayload) => void
  /** Called when user clicks Generate Filters with a prompt; parent POSTs to embedding search and sets results. */
  onEmbeddingSearch?: (prompt: string) => void | Promise<unknown>
  /** When set (e.g. after home → land-property handoff), keeps the AI search input in sync. */
  syncedEmbeddingPrompt?: string | null
  /** Current filters to save when user saves search (from parent state / URL). */
  currentFilters?: SavedSearchFilters | null
  /** Land feature toggles from More filters (keeps panel in sync with parent). */
  featureFilters?: LandFeatureFilters | null
  /** When set (including `null`), state filter is controlled by parent so list fetch can use it. */
  stateFilter?: StateFilterValue | null
  /** When set (including `null`), county filter is controlled by parent. */
  countyFilter?: CountyFilterValue | null
  /** Notifies parent when state is chosen; parent should update `stateFilter` when controlled. */
  onStateFilterApply?: (state: StateFilterValue) => void
  /** Notifies parent when county is chosen; parent should update `countyFilter` when controlled. */
  onCountyFilterApply?: (county: CountyFilterValue) => void
}

export function SearchFiltersBar({
  listingIds = [],
  priceMin: priceMinProp,
  priceMax: priceMaxProp,
  sizeMin: sizeMinProp,
  sizeMax: sizeMaxProp,
  onPriceRangeApply,
  onSizeRangeApply,
  onFilterApply,
  onEmbeddingSearch,
  syncedEmbeddingPrompt,
  currentFilters,
  featureFilters,
  stateFilter: stateFilterProp,
  countyFilter: countyFilterProp,
  onStateFilterApply,
  onCountyFilterApply,
}: SearchFiltersBarProps) {
  const { data: session } = useSession()
  const { openSignInModal } = useSignInModal()
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [aiPrompt, setAiPrompt] = useState("")
  const [embeddingSearching, setEmbeddingSearching] = useState(false)
  const [localStateFilter, setLocalStateFilter] = useState<StateFilterValue>(null)
  const [localCountyFilter, setLocalCountyFilter] = useState<CountyFilterValue>(null)
  const filterState = stateFilterProp !== undefined ? stateFilterProp : localStateFilter
  const filterCounty = countyFilterProp !== undefined ? countyFilterProp : localCountyFilter
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const locationFromUrl = searchParams.get("location") ?? ""
  const [locationDraft, setLocationDraft] = useState(locationFromUrl)

  // When parent passes price, use it (single source of truth). Otherwise keep local state for pages that don't pass.
  const [localPriceMin, setLocalPriceMin] = useState<number | null>(null)
  const [localPriceMax, setLocalPriceMax] = useState<number | null>(null)
  const priceMin = priceMinProp !== undefined ? priceMinProp : localPriceMin
  const priceMax = priceMaxProp !== undefined ? priceMaxProp : localPriceMax

  // When parent passes size, use it (single source of truth). Otherwise keep local state.
  const [localSizeMin, setLocalSizeMin] = useState<number | null>(null)
  const [localSizeMax, setLocalSizeMax] = useState<number | null>(null)
  const sizeMin = sizeMinProp !== undefined ? sizeMinProp : localSizeMin
  const sizeMax = sizeMaxProp !== undefined ? sizeMaxProp : localSizeMax

  const handlePriceApply = (min: number | null, max: number | null) => {
    if (priceMinProp === undefined) setLocalPriceMin(min)
    if (priceMaxProp === undefined) setLocalPriceMax(max)
    onPriceRangeApply?.(min, max)
  }

  const handleSizeApply = (min: number | null, max: number | null) => {
    if (sizeMinProp === undefined) setLocalSizeMin(min)
    if (sizeMaxProp === undefined) setLocalSizeMax(max)
    onSizeRangeApply?.(min, max)
  }

  const handleStateFilterApply = (s: StateFilterValue) => {
    if (stateFilterProp === undefined) {
      setLocalStateFilter(s)
      setLocalCountyFilter((c) => {
        if (!c || !s) return c
        return c.stateCode === s.code ? c : null
      })
    }
    onStateFilterApply?.(s)
  }

  const handleCountyFilterApply = (c: CountyFilterValue) => {
    if (countyFilterProp === undefined) setLocalCountyFilter(c)
    onCountyFilterApply?.(c)
  }

  useEffect(() => {
    setLocationDraft(locationFromUrl)
  }, [locationFromUrl])

  useEffect(() => {
    const t = syncedEmbeddingPrompt?.trim()
    if (!t) return
    setAiPrompt(t)
  }, [syncedEmbeddingPrompt])

  const handleLocationSelect = (selected: string) => {
    const next = new URLSearchParams(searchParams.toString())
    if (selected.trim()) next.set("location", selected.trim())
    else next.delete("location")
    router.push(`${pathname}?${next.toString()}`)
  }

  return (
    <div className="w-full shrink-0 border-b border-border bg-background px-4 py-3">
      {onEmbeddingSearch ? (
        <div className="mt-3">
          <div
            className="flex h-10 items-center gap-2.5 rounded-full border border-[#E5E7EB] bg-[#F8F9FA] pl-4 pr-1.5 shadow-sm outline-none"
            role="search"
          >
            <Search
              className="pointer-events-none h-4 w-4 shrink-0 text-muted-foreground"
              strokeWidth={1.75}
              aria-hidden
            />
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return
                e.preventDefault()
                const q = aiPrompt.trim()
                if (!q || embeddingSearching) return
                setEmbeddingSearching(true)
                void Promise.resolve(onEmbeddingSearch(q)).finally(() => setEmbeddingSearching(false))
              }}
              placeholder="e.g. 100 acres in Montana with a creek and mountain views"
              className="min-h-0 min-w-0 flex-1 border-0 bg-transparent py-0 text-sm leading-none text-foreground placeholder:text-muted-foreground/80 focus:outline-none focus:ring-0"
              aria-label={"Describe what you're looking for"}
            />
            <button
              type="button"
              // TODO: Re-enable this when the embedding search is working
              // disabled={!aiPrompt.trim() || embeddingSearching}
              onClick={async () => {
                const q = aiPrompt.trim()
                if (!q) return
                setEmbeddingSearching(true)
                try {
                  await onEmbeddingSearch(q)
                } finally {
                  setEmbeddingSearching(false)
                }
              }}
              className="flex h-8 w-8 shrink-0 z-100 items-center justify-center cursor-pointer rounded-full bg-[#2F5B3A] text-white shadow-sm transition-[background-color,transform,box-shadow] duration-150 hover:bg-[#264A30] hover:shadow-md active:scale-[0.92] active:bg-[#1a3324] active:shadow-inner disabled:pointer-events-none disabled:opacity-45"
              aria-label={embeddingSearching ? "Searching" : "Search"}
            >
              <Search className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
            </button>
          </div>
        </div>
      ) : null}

      {/* Second row: quick filters — items-start + label row on each group aligns inputs with More Filters */}
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-start gap-6">
          <StateFilter value={filterState} onApply={handleStateFilterApply} />
          <CountyFilter
            stateCode={filterState?.code ?? null}
            value={filterCounty}
            onApply={handleCountyFilterApply}
          />
          <PriceRange value={{ min: priceMin, max: priceMax }} onApply={handlePriceApply} />
          <SizeRange value={{ min: sizeMin, max: sizeMax }} onApply={handleSizeApply} />
          <FilterOption
            initialFeatures={featureFilters ?? undefined}
            onApply={(payload) => {
              onFilterApply?.(payload)
            }}
          />
        </div>

        <div className="flex shrink-0 items-center gap-3 self-end">
          <button
            type="button"
            onClick={() => {
              if (!session) {
                openSignInModal()
                return
              }
              setSaveModalOpen(true)
            }}
            className="flex h-[34px] items-center gap-2 rounded-xl bg-[#04C0AF] px-4 text-sm font-medium text-white transition-colors hover:bg-[#3dbdb5] disabled:opacity-50"
          >
            <Heart className="h-4 w-4 fill-white" />
            Save Search
          </button>
        </div>
      </div>

      

      <SavePropertySearchModal
        isOpen={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        onSave={() => setSaveModalOpen(false)}
        filters={currentFilters}
      />
    </div>
  )
}
