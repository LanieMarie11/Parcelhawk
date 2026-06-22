"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronDown, Loader2 } from "lucide-react"
import { PropertyCard } from "@/app/(buyer)/components/property-card"
import { MarketplaceMap } from "@/app/(buyer)/components/marketplace-map"
import { resolveListingSatellitePreviewUrl } from "@/lib/parcel-satellite-preview-client"

const PAGE_SIZE = 20

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
  /** When true, buyer has a viewing request for this listing with their linked realtor */
  hasViewingRequest?: boolean
  /** Listing URL from landListings.url; used for "view listing" link (opens in new tab) */
  aiMatchingScore?: number | null
  url?: string | null
  /** Description from landListings.description (array of strings) */
  description?: string[] | string | null
  /**
   * Satellite preview for list cards: built on the client from latitude/longitude and
   * `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (Static Maps). Optional server-provided URL/data URL
   * when another API sets this (e.g. favorites).
   */
  parcelSatelliteMapDataUrl?: string | null
  /** ISO string from `land_listings.updated_at` */
  listedDate?: string | null
  updatedAt?: string | null
  /** ISO string from `favorites.created_at` when loaded from favorites API */
  createdAt?: string | null
}

interface PropertyMapListProps {
  listings: ListingItem[]
  /** Total rows matching filters (may exceed `listings.length` when API caps page size). */
  totalListingsNumber?: number
  pageSize?: number
  currentPage?: number
  onPageChange?: (page: number) => void
  title?: string
  /** When provided, sort is controlled by parent (e.g. to refetch API with sort param). */
  sortId?: SortId
  onSortChange?: (sortId: SortId) => void
  isLoading?: boolean
}

export function PropertyMapList({
  listings,
  totalListingsNumber,
  pageSize = PAGE_SIZE,
  currentPage: controlledCurrentPage,
  onPageChange,
  title = "Acreage",
  sortId: controlledSortId,
  onSortChange,
  isLoading = false,
}: PropertyMapListProps) {
  const [localCurrentPage, setLocalCurrentPage] = useState(1)
  const [sortOpen, setSortOpen] = useState(false)
  const [internalSortId, setInternalSortId] = useState<SortId>("default")
  const [hoveredListingId, setHoveredListingId] = useState<number | null>(null)
  const sortRef = useRef<HTMLDivElement>(null)

  const sortId = controlledSortId ?? internalSortId
  const isPaginationControlled =
    typeof controlledCurrentPage === "number" && typeof onPageChange === "function"
  const currentPage = isPaginationControlled ? controlledCurrentPage : localCurrentPage
  const setSortId = (id: SortId) => {
    if (onSortChange) onSortChange(id)
    else setInternalSortId(id)
  }

  const matchCount = totalListingsNumber ?? listings.length
  const totalPages = Math.max(1, Math.ceil(matchCount / pageSize))
  const paginatedListings = isPaginationControlled
    ? listings
    : listings.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const setCurrentPage = (nextPage: number | ((prev: number) => number)) => {
    const resolvedPage = typeof nextPage === "function" ? nextPage(currentPage) : nextPage
    const boundedPage = Math.min(totalPages, Math.max(1, resolvedPage))
    if (isPaginationControlled) onPageChange(boundedPage)
    else setLocalCurrentPage(boundedPage)
  }

  useEffect(() => {
    if (isPaginationControlled) return
    setCurrentPage(1)
  }, [isPaginationControlled, listings.length, sortId])

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
  const hasNextPage = isPaginationControlled
    ? currentPage < totalPages
    : currentPage * pageSize < listings.length

  return (
    <div className="flex min-h-0 min-w-0 w-full max-w-full flex-1 overflow-hidden">
      {/* List (left) */}
      <div className={`${HALF_PANE_SHELL} min-h-0 flex-1 border-r border-border`}>
        <div className="shrink-0 border-b border-border bg-background px-4 pb-1 pt-2">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {paginatedListings.length}/{matchCount}
                </span>{" "}
                parcels match your search
              </p>
            </div>
            <div className="relative shrink-0" ref={sortRef}>
              <button
                type="button"
                onClick={() => setSortOpen((prev) => !prev)}
                disabled={isLoading}
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
                        sortId === option.id ? "bg-brand-green font-medium text-white opacity-80" : "text-foreground hover:bg-muted"
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

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-6 py-4">
          <div className="flex flex-col gap-4">
            {isLoading ? (
              <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                <span>Loading properties...</span>
              </div>
            ) : null}
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
                hasViewingRequest={listing.hasViewingRequest}
                aiMatchingScore={listing.aiMatchingScore}
                detailUrl={listing.url ?? undefined}
                description={listing.description}
                parcelSatelliteMapDataUrl={resolveListingSatellitePreviewUrl(listing)}
                latitude={listing.latitude}
                longitude={listing.longitude}
                listedDate={listing.listedDate ?? undefined}
                updatedAt={listing.updatedAt ?? undefined}
                variant="list"
                onMouseEnter={() => setHoveredListingId(listing.id)}
                onMouseLeave={() => setHoveredListingId(null)}
              />
            ))}
          </div>
        </div>

        <div className="shrink-0 border-t border-border bg-background px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={isLoading || currentPage <= 1}
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
              disabled={isLoading || currentPage >= totalPages || !hasNextPage}
              className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Map (right): same half-pane shell as list */}
      <div className={`${HALF_PANE_SHELL} min-h-0 flex-1`}>
        <div className="relative min-h-0 flex-1">
          <MarketplaceMap listings={listings} selectedId={hoveredListingId} className="h-full w-full" />
        </div>
      </div>
    </div>
  )
}
