"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import type { CountyFilterValue } from "@/components/county-filter"
import {
  DEFAULT_LAND_FEATURE_FILTERS,
  type LandFeatureFilters,
} from "@/components/filter-option"
import { PropertyMapList, type SortId } from "@/components/property-map-list"
import { SearchFiltersBar } from "@/components/search-filters-bar"
import type { StateFilterValue } from "@/components/state-filter"
import { mapLandListingRow } from "@/lib/map-land-listing"

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
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const typeFromUrl = searchParams.get("type") ?? ""
  const activitiesFromUrl = searchParams.getAll("activity").filter(Boolean)
  const locationFromUrl = searchParams.get("location") ?? ""
  const promptFromUrl = searchParams.get("prompt")?.trim() ?? ""
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
  const [stateFilter, setStateFilter] = useState<StateFilterValue>(null)
  const [countyFilter, setCountyFilter] = useState<CountyFilterValue>(null)
  const autoEmbeddedPromptRef = useRef<string | null>(null)
  const postEmbeddingSkipRef = useRef(false)

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
        if (postEmbeddingSkipRef.current) {
          postEmbeddingSkipRef.current = false
          return
        }
        if (promptFromUrl) return
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
        if (stateFilter) params.set("state", stateFilter.code)
        if (countyFilter) params.set("county", countyFilter.name)
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
        const mapped = listing
          .map(mapLandListingRow)
          .sort((a, b) => (b.aiMatchingScore ?? -1) - (a.aiMatchingScore ?? -1))
        setListingsData(mapped)
        console.log("mapped", mapped)
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
    stateFilter?.code,
    countyFilter?.stateCode,
    countyFilter?.name,
    promptFromUrl,
  ])

  const handleEmbeddingSearch = useCallback(async (prompt: string): Promise<boolean> => {
    const base = getBaseUrl()
    const res = await fetch(`${base}/api/embedding-search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        features: landFeatureFilters,
      }),
    })
    if (!res.ok) return false
    const contentType = res.headers.get("content-type") ?? ""
    if (!contentType.includes("application/json")) return false
    const listing = await res.json()
    if (!Array.isArray(listing)) return false
    const mapped = listing
      .map(mapLandListingRow)
      .sort((a, b) => (b.aiMatchingScore ?? -1) - (a.aiMatchingScore ?? -1))
    setListingsData(mapped)
    return true
  }, [landFeatureFilters])

  useEffect(() => {
    if (!promptFromUrl) {
      autoEmbeddedPromptRef.current = null
      return
    }
    if (autoEmbeddedPromptRef.current === promptFromUrl) return
    autoEmbeddedPromptRef.current = promptFromUrl
    let cancelled = false
    ;(async () => {
      const ok = await handleEmbeddingSearch(promptFromUrl)
      if (cancelled) return
      const params = new URLSearchParams(searchParams.toString())
      params.delete("prompt")
      const q = params.toString()
      if (ok) postEmbeddingSkipRef.current = true
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false })
    })()
    return () => {
      cancelled = true
    }
  }, [promptFromUrl, handleEmbeddingSearch, searchParams, router, pathname])

  const searchBarCurrentFilters = {
    minPrice: priceRange.min,
    maxPrice: priceRange.max,
    minAcres: sizeRange.min,
    maxAcres: sizeRange.max,
    location: locationFromUrl || null,
    propertyType: typeFromUrl || null,
    landType: typeFromUrl || null,
    activities: activitiesFromUrl.length > 0 ? activitiesFromUrl : null,
  }

  return (
    <div className="flex min-h-[calc(100vh-73px)] w-full flex-col font-ibm-plex-sans">
      <div className="sticky top-[73px] z-40 shrink-0 border-b border-border bg-background">
        <SearchFiltersBar
          listingIds={listingsData.map((l) => l.id)}
          priceMin={priceRange.min}
          priceMax={priceRange.max}
          sizeMin={sizeRange.min}
          sizeMax={sizeRange.max}
          stateFilter={stateFilter}
          countyFilter={countyFilter}
          onStateFilterApply={(s) => {
            setStateFilter(s)
            setCountyFilter((c) => {
              if (!c || !s) return c
              return c.stateCode === s.code ? c : null
            })
          }}
          onCountyFilterApply={setCountyFilter}
          featureFilters={landFeatureFilters}
          onPriceRangeApply={(min, max) => setPriceRange({ min, max })}
          onSizeRangeApply={(min, max) => setSizeRange({ min, max })}
          onFilterApply={(payload) => {
            setLandFeatureFilters(payload.features)
          }}
          onEmbeddingSearch={handleEmbeddingSearch}
          syncedEmbeddingPrompt={promptFromUrl || null}
          currentFilters={searchBarCurrentFilters}
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
