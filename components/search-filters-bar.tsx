"use client"

import { Search, Heart } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import { LocationSearchInput } from "@/components/location-search-input"
import PriceRange from "@/components/price-range"
import type { PriceRangeOnApply } from "@/components/price-range"
import SizeRange from "@/components/size-range"
import type { SizeRangeOnApply } from "@/components/size-range"
import FilterOption from "@/components/filter-option"
import { SavePropertySearchModal } from "@/components/save-search-property-modal"
import { useSignInModal } from "@/lib/sign-in-modal-context"

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
}

export function SearchFiltersBar({
  listingIds = [],
  priceMin: priceMinProp,
  priceMax: priceMaxProp,
  sizeMin: sizeMinProp,
  sizeMax: sizeMaxProp,
  onPriceRangeApply,
  onSizeRangeApply,
}: SearchFiltersBarProps) {
  const { data: session } = useSession()
  const { openSignInModal } = useSignInModal()
  const [saveModalOpen, setSaveModalOpen] = useState(false)
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

  useEffect(() => {
    setLocationDraft(locationFromUrl)
  }, [locationFromUrl])

  const handleLocationSelect = (selected: string) => {
    const next = new URLSearchParams(searchParams.toString())
    if (selected.trim()) next.set("location", selected.trim())
    else next.delete("location")
    router.push(`${pathname}?${next.toString()}`)
  }

  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-4 py-3">
      <div className="flex min-w-0 max-w-1/2 flex-1 items-center gap-3">
        <div className="relative flex min-w-0 flex-1 items-center">
          <Search className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <LocationSearchInput
            value={locationDraft}
            onChange={setLocationDraft}
            onSelect={handleLocationSelect}
            placeholder="Search by location"
            className="h-10 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <PriceRange
          value={{ min: priceMin, max: priceMax }}
          onApply={handlePriceApply}
        />
        <SizeRange
          value={{ min: sizeMin, max: sizeMax }}
          onApply={handleSizeApply}
        />
        <FilterOption
          priceMin={priceMin}
          priceMax={priceMax}
          onPriceChange={handlePriceApply}
          sizeMin={sizeMin}
          sizeMax={sizeMax}
          onSizeChange={handleSizeApply}
          onApply={() => {
            onPriceRangeApply?.(priceMin, priceMax)
            onSizeRangeApply?.(sizeMin, sizeMax)
          }}
        />
      </div>
      <button
        type="button"
        onClick={() => {
          if (!session) {
            openSignInModal()
            return
          }
          setSaveModalOpen(true)
        }}
        className="shrink-0 flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors bg-[#04C0AF] text-white hover:bg-[#3dbdb5] disabled:opacity-50"
      >
        <Heart className="h-4 w-4 fill-white" />
        Save Search
      </button>
      <SavePropertySearchModal
        isOpen={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        onSave={() => setSaveModalOpen(false)}
      />
    </div>
  )
}
