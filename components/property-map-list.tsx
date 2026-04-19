"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronDown } from "lucide-react"
import { PropertyCard } from "@/components/property-card"
import { MarketplaceMap } from "@/components/marketplace-map"

const PAGE_SIZE = 50

/** Shared by list column and fixed map: width, flex stack, shrink, background */
const HALF_PANE_SHELL = "flex w-1/2 min-w-0 shrink-0 flex-col bg-background"

const SORT_OPTIONS = [
  { id: "default", label: "Default" },
  { id: "newest", label: "Newest" },
  { id: "price-asc", label: "Price: Low to High" },
  { id: "price-desc", label: "Price: High to Low" },
  { id: "acres-asc", label: "Acres: Small to Large" },
  { id: "acres-desc", label: "Acres: Large to Small" },
  { id: "pricePerAcre-asc", label: "Price per Acre: Low to High" },
  { id: "pricePerAcre-desc", label: "Price per Acre: High to Low" },
] as const

export type SortId = (typeof SORT_OPTIONS)[number]["id"]

export interface ListingItem {
  id: number
  images?: string[]
  category?: string
  categoryColor?: string
  name: string
  price: string
  /** Fallback when structured address fields are empty */
  location?: string
  address1?: string | null
  city?: string | null
  stateAbbreviation?: string | null
  stateName?: string | null
  zip?: string | null
  acreage: string
  latitude?: number | null
  longitude?: number | null
  /** When true, card heart shows as favorited (from API when user is signed in) */
  isFavorite?: boolean
  /** Listing URL from landListings.url; used for "view listing" link (opens in new tab) */
  aiMatchingScore?: number | null
  url?: string | null
  /** Description from landListings.description (array of strings) */
  description?: string[] | string | null
  /** Satellite Static Map PNG as data URL (parcel boundary on aerial), from land-location-search */
  parcelSatelliteMapDataUrl?: string | null
}

interface PropertyMapListProps {
  listings: ListingItem[]
  title?: string
  /** When provided, sort is controlled by parent (e.g. to refetch API with sort param). */
  sortId?: SortId
  onSortChange?: (sortId: SortId) => void
}

export function PropertyMapList({ listings, title = "Acreage", sortId: controlledSortId, onSortChange }: PropertyMapListProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [sortOpen, setSortOpen] = useState(false)
  const [internalSortId, setInternalSortId] = useState<SortId>("default")
  const [hoveredListingId, setHoveredListingId] = useState<number | null>(null)
  const sortRef = useRef<HTMLDivElement>(null)

  const sortId = controlledSortId ?? internalSortId
  const setSortId = (id: SortId) => {
    if (onSortChange) onSortChange(id)
    else setInternalSortId(id)
  }

  const totalPages = Math.max(1, Math.ceil(listings.length / PAGE_SIZE))
  const paginatedListings = listings.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [listings.length, sortId])

  useEffect(() => {
    if (!sortOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [sortOpen])

  const currentSortLabel = SORT_OPTIONS.find((o) => o.id === sortId)?.label ?? "Default"

  return (
    <div className="flex min-w-0 w-full max-w-full overflow-x-hidden">
      {/* List (left) */}
      <div className={`${HALF_PANE_SHELL} min-h-[calc(100vh-73px)] border-r border-border`}>
        <div className="shrink-0 border-b border-border px-6 pb-4 pt-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{listings.length}</span> parcels match your search
              </p>
            </div>
            <div className="relative shrink-0" ref={sortRef}>
              <button
                type="button"
                onClick={() => setSortOpen((prev) => !prev)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                aria-expanded={sortOpen}
                aria-haspopup="true"
              >
                <span className="whitespace-nowrap">
                  {"Ranked by match score: "}
                  <span className="font-medium text-foreground">{currentSortLabel}</span>
                </span>
                <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${sortOpen ? "rotate-180" : ""}`} />
              </button>
              {sortOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 min-w-[240px] rounded-xl border border-border bg-card py-1 shadow-lg">
                  {SORT_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        setSortId(option.id)
                        setSortOpen(false)
                      }}
                      className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                        sortId === option.id ? "bg-[#04C0AF] font-medium text-white" : "text-foreground hover:bg-muted"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-4">
          <div className="flex flex-col gap-4">
            {paginatedListings.map((listing) => (
              <PropertyCard
                id={listing.id}
                key={listing.id}
                images={listing.images}
                category={listing.category ?? ""}
                categoryColor={listing.categoryColor ?? "#6b7b6b"}
                name={listing.name}
                price={listing.price}
                location={listing.location ?? ""}
                address1={listing.address1}
                city={listing.city}
                stateAbbreviation={listing.stateAbbreviation}
                stateName={listing.stateName}
                zip={listing.zip}
                acreage={listing.acreage}
                initialIsFavorite={listing.isFavorite}
                aiMatchingScore={listing.aiMatchingScore}
                detailUrl={listing.url ?? undefined}
                description={listing.description}
                parcelSatelliteMapDataUrl={listing.parcelSatelliteMapDataUrl ?? undefined}
                variant="list"
                onMouseEnter={() => setHoveredListingId(listing.id)}
                onMouseLeave={() => setHoveredListingId(null)}
              />
            ))}
          </div>
        </div>

        <div className="mt-auto shrink-0 border-t border-border px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
            >
              Previous
            </button>
            <p className="text-sm text-muted-foreground">
              Page <span className="font-medium text-foreground">{currentPage}</span> of {totalPages}
            </p>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Fixed map (right): same half-pane shell as list; fixed + explicit height for viewport fill */}
      <div className={`${HALF_PANE_SHELL} fixed right-0 top-[210px] z-10 h-[calc(100vh-210px)]`}>
        <div className="relative min-h-0 flex-1">
          <MarketplaceMap listings={listings} selectedId={hoveredListingId} className="h-full w-full" />
        </div>
      </div>
      {/* Spacer so flex row reserves the same width as the fixed map (single 50% — avoids horizontal scroll) */}
      <div className="min-w-0 w-1/2 shrink-0" aria-hidden />
    </div>
  )
}
