"use client"

import { useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"
import {
  DEFAULT_LAND_FEATURE_FILTERS,
  type LandFeatureFilters,
} from "@/components/filter-option"
import { PropertyMapList, type SortId } from "@/components/property-map-list"
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

function LandPropertyPageContent() {
  const searchParams = useSearchParams()
  const typeFromUrl = searchParams.get("type") ?? ""
  const activitiesFromUrl = searchParams.getAll("activity").filter(Boolean)
  const locationFromUrl = searchParams.get("location") ?? ""
  const minAcresFromUrl = searchParams.get("minAcres")
  const maxAcresFromUrl = searchParams.get("maxAcres")
  const minPriceFromUrl = searchParams.get("minPrice")
  const maxPriceFromUrl = searchParams.get("maxPrice")
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
  const [sortId, setSortId] = useState<SortId>("default")

  useEffect(() => {
    const minFromUrl = minPriceFromUrl != null && minPriceFromUrl !== "" ? Number(minPriceFromUrl) : null
    const maxFromUrl = maxPriceFromUrl != null && maxPriceFromUrl !== "" ? Number(maxPriceFromUrl) : null
    const minAcresFromUrlNum = minAcresFromUrl != null && minAcresFromUrl !== "" ? Number(minAcresFromUrl) : null
    const maxAcresFromUrlNum = maxAcresFromUrl != null && maxAcresFromUrl !== "" ? Number(maxAcresFromUrl) : null
    if (minFromUrl != null && Number.isFinite(minFromUrl)) setPriceRange((p) => ({ ...p, min: minFromUrl }))
    if (maxFromUrl != null && Number.isFinite(maxFromUrl)) setPriceRange((p) => ({ ...p, max: maxFromUrl }))
    if (minAcresFromUrlNum != null && Number.isFinite(minAcresFromUrlNum)) setSizeRange((s) => ({ ...s, min: minAcresFromUrlNum }))
    if (maxAcresFromUrlNum != null && Number.isFinite(maxAcresFromUrlNum)) setSizeRange((s) => ({ ...s, max: maxAcresFromUrlNum }))
  }, [minAcresFromUrl, maxAcresFromUrl, minPriceFromUrl, maxPriceFromUrl])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const useLocationSearch = locationFromUrl.length > 0 || typeFromUrl.length > 0 || activitiesFromUrl.length > 0
        // const base = useLocationSearch ? `${getBaseUrl()}/api/land-location-search` : `${getBaseUrl()}/api/land-property`
        const base = `${getBaseUrl()}/api/land-location-search` 
        const params = new URLSearchParams()
        if (typeFromUrl) params.set("type", typeFromUrl)
        activitiesFromUrl.forEach((a) => params.append("activity", a))
        if (locationFromUrl) params.set("location", locationFromUrl)
        if (priceRange.min != null) params.set("minPrice", String(priceRange.min))
        if (priceRange.max != null) params.set("maxPrice", String(priceRange.max))
        if (sizeRange.min != null) params.set("minAcres", String(sizeRange.min))
        if (sizeRange.max != null) params.set("maxAcres", String(sizeRange.max))
        if (sortId && sortId !== "default") params.set("sort", sortId)
        if (useLocationSearch) {
          if (minPriceFromUrl != null && minPriceFromUrl !== "") params.set("minPrice", minPriceFromUrl)
          if (maxPriceFromUrl != null && maxPriceFromUrl !== "") params.set("maxPrice", maxPriceFromUrl)
          if (minAcresFromUrl != null && minAcresFromUrl !== "") params.set("minAcres", minAcresFromUrl)
          if (maxAcresFromUrl != null && maxAcresFromUrl !== "") params.set("maxAcres", maxAcresFromUrl)
        }
        const qs = params.toString()
        const url = `${base}${qs ? `?${qs}` : ""}`
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
  }, [
    typeFromUrl,
    activitiesFromUrl.join(","),
    locationFromUrl,
    minAcresFromUrl,
    maxAcresFromUrl,
    minPriceFromUrl,
    maxPriceFromUrl,
    priceRange.min,
    priceRange.max,
    sizeRange.min,
    sizeRange.max,
    sortId,
  ])

  const handleEmbeddingSearch = async (prompt: string) => {
    const base = getBaseUrl()
    const res = await fetch(`${base}/api/embedding-search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    })
    if (!res.ok) return
    const contentType = res.headers.get("content-type") ?? ""
    if (!contentType.includes("application/json")) return
    const listing = await res.json()
    if (!Array.isArray(listing)) return
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
  }

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
          onEmbeddingSearch={handleEmbeddingSearch}
          currentFilters={{
            minPrice: priceRange.min,
            maxPrice: priceRange.max,
            minAcres: sizeRange.min,
            maxAcres: sizeRange.max,
            location: locationFromUrl || null,
            propertyType: typeFromUrl || null,
            landType: typeFromUrl || null,
            activities:
              activitiesFromUrl.length > 0 ? activitiesFromUrl : null,
          }}
        />
      </div>
      <PropertyMapList
        listings={listingsData}
        title="Acreage"
        sortId={sortId}
        onSortChange={setSortId}
      />
    </div>
  )
}

function LandPropertyPageFallback() {
  return (
    <div className="flex h-[calc(100vh-73px)] w-full items-center justify-center font-ibm-plex-sans">
      <p className="text-sm text-muted-foreground">Loading marketplace…</p>
    </div>
  )
}

export default function LandPropertyPage() {
  return (
    <Suspense fallback={<LandPropertyPageFallback />}>
      <LandPropertyPageContent />
    </Suspense>
  )
}
