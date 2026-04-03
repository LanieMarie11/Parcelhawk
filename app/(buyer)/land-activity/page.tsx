// TODO : Remove this page once the API is implemented
"use client"

import { useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"
import {
  DEFAULT_LAND_FEATURE_FILTERS,
  type LandFeatureFilters,
} from "@/components/filter-option"
import { PropertyMapList } from "@/components/property-map-list"
import { SearchFiltersBar } from "@/components/search-filters-bar"

const CATEGORY_COLORS: Record<string, string> = {
  Recreational: "#3b8a6e",
  Acreage: "#5a7d5a",
  Investment: "#c77c32",
  Farm: "#6b7b6b",
}

// Fallback when API fails; no lat/lng so map will show default view
const properties = [
  { id: 1, image: "/images/property-1.png", name: "Whispering Pines", price: "$450,000", location: "Asheville, NC", acreage: "12.5 Acres", category: "Recreational", categoryColor: CATEGORY_COLORS["Recreational"] ?? "#6b7b6b" },
  { id: 2, image: "/images/property-2.png", name: "Whispering Pines", price: "$450,000", location: "Asheville, NC", acreage: "12.5 Acres", category: "Recreational", categoryColor: CATEGORY_COLORS["Recreational"] ?? "#6b7b6b" },
  { id: 3, image: "/images/property-3.png", name: "Whispering Pines", price: "$450,000", location: "Asheville, NC", acreage: "12.5 Acres", category: "Recreational", categoryColor: CATEGORY_COLORS["Recreational"] ?? "#6b7b6b" },
  { id: 4, image: "/images/property-4.png", name: "Whispering Pines", price: "$450,000", location: "Asheville, NC", acreage: "12.5 Acres", category: "Recreational", categoryColor: CATEGORY_COLORS["Recreational"] ?? "#6b7b6b" },
  { id: 5, image: "/images/property-1.png", name: "Whispering Pines", price: "$450,000", location: "Asheville, NC", acreage: "12.5 Acres", category: "Recreational", categoryColor: CATEGORY_COLORS["Recreational"] ?? "#6b7b6b" },
  { id: 6, image: "/images/property-2.png", name: "Whispering Pines", price: "$450,000", location: "Asheville, NC", acreage: "12.5 Acres", category: "Recreational", categoryColor: CATEGORY_COLORS["Recreational"] ?? "#6b7b6b" },
]

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function LandActivityPageContent() {
  const searchParams = useSearchParams()
  const typeFromUrl = searchParams.get("type") ?? ""
  const [listingsData, setListingsData] = useState<any[]>([])
  const [priceRange, setPriceRange] = useState<{
    min: number | null
    max: number | null
  }>({ min: null, max: null })
  const [sizeRange, setSizeRange] = useState<{
    min: number | null
    max: number | null
  }>({ min: null, max: null })
  const [landFeatureFilters, setLandFeatureFilters] =
    useState<LandFeatureFilters>(DEFAULT_LAND_FEATURE_FILTERS)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const params = new URLSearchParams()
        if (typeFromUrl) params.set("type", typeFromUrl)
        if (priceRange.min != null) params.set("minPrice", String(priceRange.min))
        if (priceRange.max != null) params.set("maxPrice", String(priceRange.max))
        if (sizeRange.min != null) params.set("minAcres", String(sizeRange.min))
        if (sizeRange.max != null) params.set("maxAcres", String(sizeRange.max))
        const qs = params.toString()
        const url = `${getBaseUrl()}/api/land-activity${qs ? `?${qs}` : ""}`
        const res = await fetch(url)
        if (!res.ok) return
        const contentType = res.headers.get("content-type") ?? ""
        if (!contentType.includes("application/json")) return
        const listing = await res.json()
        if (cancelled || !Array.isArray(listing)) return
        const mapped = listing.map((item: any) => ({
          id: item.id,
          images: item.photos,
          category: item.propertyType?.[0],
          categoryColor: "#3b8a6e",
          name: item.title,
          price: item.price,
          location: item.city,
          acreage: item.acres,
          latitude: item.latitude != null ? Number(item.latitude) : null,
          longitude: item.longitude != null ? Number(item.longitude) : null,
          isFavorite: !!item.isFavorite,
          url: item.url,
          description: item.description,
        }))
        setListingsData(mapped)
      } catch {
        setListingsData(properties)
      }
    }
    load()
    return () => { cancelled = true }
  }, [typeFromUrl, priceRange.min, priceRange.max, sizeRange.min, sizeRange.max])

  return (
    <div className="flex min-h-[calc(100vh-73px)] w-full flex-col font-ibm-plex-sans">
      <div className="sticky top-[73px] z-20 shrink-0 border-b border-border bg-background">
        <SearchFiltersBar
          listingIds={listingsData.map((l) => l.id)}
          priceMin={priceRange.min}
          priceMax={priceRange.max}
          sizeMin={sizeRange.min}
          sizeMax={sizeRange.max}
          featureFilters={landFeatureFilters}
          onPriceRangeApply={(min, max) => setPriceRange({ min, max })}
          onSizeRangeApply={(min, max) => setSizeRange({ min, max })}
          onFilterApply={(payload) => {
            setLandFeatureFilters(payload.features)
          }}
        />
      </div>
      <PropertyMapList listings={listingsData} title="Acreage" />
    </div>
  )
}

function LandActivityPageFallback() {
  return (
    <div className="flex h-[calc(100vh-73px)] w-full items-center justify-center font-ibm-plex-sans">
      <p className="text-sm text-muted-foreground">Loading marketplace…</p>
    </div>
  )
}

export default function LandActivityPage() {
  return (
    <Suspense fallback={<LandActivityPageFallback />}>
      <LandActivityPageContent />
    </Suspense>
  )
}
