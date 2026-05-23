"use client"

import { useSearchParams } from "next/navigation"
import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import type { CountyFilterValue } from "@/components/county-filter"
import { PageLoadingIndicator } from "@/components/page-loading-indicator"
import {
  DEFAULT_LAND_FEATURE_FILTERS,
  type LandFeatureFilters,
} from "@/app/(buyer)/components/filter-option"
import { PropertyMapList, type ListingItem, type SortId } from "@/components/property-map-list"
import { SearchFiltersBar } from "@/components/search-filters-bar"
import type { StateFilterValue } from "@/components/state-filter"
import { useLandPropertySearchHandoff } from "@/lib/land-property-search-context"
import { mapLandListingRow } from "@/lib/map-land-listing"
import usStates from "@/data/us-states.json"
import countiesByState from "@/data/us-counties-by-state.json"

const CATEGORY_COLORS: Record<string, string> = {
  Recreational: "#3b8a6e",
  Acreage: "#5a7d5a",
  Investment: "#c77c32",
  Farm: "#6b7b6b",
}
const PAGE_SIZE = 20

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

function normalizeText(s: string) {
  return s.trim().toLowerCase()
}

function resolveStateFilterFromPromptFilters(promptFilters: any): StateFilterValue {
  const byCodeRaw = Array.isArray(promptFilters?.stateAbbreviations)
    ? promptFilters.stateAbbreviations[0]
    : null
  const byNameRaw = Array.isArray(promptFilters?.stateNames) ? promptFilters.stateNames[0] : null

  if (typeof byCodeRaw === "string") {
    const code = byCodeRaw.trim().toUpperCase()
    const hit = (usStates as { code: string; name: string }[]).find((s) => s.code === code)
    if (hit) return hit
  }

  if (typeof byNameRaw === "string") {
    const q = normalizeText(byNameRaw)
    const hit = (usStates as { code: string; name: string }[]).find(
      (s) => normalizeText(s.name) === q
    )
    if (hit) return hit
  }

  return null
}

function resolveCountyFilterFromPromptFilters(
  promptFilters: any,
  state: StateFilterValue
): CountyFilterValue {
  if (!state?.code) return null
  const raw = Array.isArray(promptFilters?.counties) ? promptFilters.counties[0] : null
  if (typeof raw !== "string") return null

  const normalized = normalizeText(raw).replace(/\s+county$/, "")
  const list = (countiesByState as Record<string, string[]>)[state.code] ?? []
  const hit = list.find((name) => normalizeText(name).replace(/\s+county$/, "") === normalized)
  return hit ? { stateCode: state.code, name: hit } : null
}

function LandPropertyPageContent() {
  const searchParams = useSearchParams()
  const typeFromUrl = searchParams.get("type") ?? ""
  const activitiesFromUrl = searchParams.getAll("activity").filter(Boolean)
  const locationFromUrl = searchParams.get("location") ?? ""
  const { pendingPrompt: pendingSearchPrompt, setPendingPrompt: setPendingSearchPrompt } =
    useLandPropertySearchHandoff()
  const minAcresFromUrl = searchParams.get("minAcres")
  const maxAcresFromUrl = searchParams.get("maxAcres")
  const minPriceFromUrl = searchParams.get("minPrice")
  const maxPriceFromUrl = searchParams.get("maxPrice")
  const stateFromUrl = searchParams.get("state")
  const countyFromUrl = searchParams.get("county")
  const promptFromUrl = searchParams.get("prompt") ?? ""
  const [listingsData, setListingsData] = useState<any[]>([])
  const [totalListingsNumber, setTotalListingsNumber] = useState(0)
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
  const [currentPage, setCurrentPage] = useState(1)
  const [isServerPaginated, setIsServerPaginated] = useState(true)
  const [stateFilter, setStateFilter] = useState<StateFilterValue>(null)
  const [countyFilter, setCountyFilter] = useState<CountyFilterValue>(null)
  const [isLoading, setIsLoading] = useState(false)
  const autoEmbeddedPromptRef = useRef<string | null>(null)
  /**
   * Skips land-location fetches that would fight with AI results. Incremented when:
   * - embedding hydrates manual filters from `promptFilters`, and/or
   * - session handoff embedding finishes successfully (storage cleared right after).
   * Consumed in one effect run (handles React batching multiple reasons into one commit).
   */
  const pendingLandLocationFetchSkipsRef = useRef(0)
  /** True while handoff embedding request is running; blocks competing location fetches only during that window. */
  const handoffEmbeddingInProgressRef = useRef(false)

  useEffect(() => {
    const minFromUrl = minPriceFromUrl != null && minPriceFromUrl !== "" ? Number(minPriceFromUrl) : null
    const maxFromUrl = maxPriceFromUrl != null && maxPriceFromUrl !== "" ? Number(maxPriceFromUrl) : null
    const minAcresFromUrlNum = minAcresFromUrl != null && minAcresFromUrl !== "" ? Number(minAcresFromUrl) : null
    const maxAcresFromUrlNum = maxAcresFromUrl != null && maxAcresFromUrl !== "" ? Number(maxAcresFromUrl) : null
    const normalizedStateFromUrl = stateFromUrl ? normalizeText(stateFromUrl) : null
    const nextState =
      normalizedStateFromUrl == null
        ? null
        : (usStates as { code: string; name: string }[]).find(
            (s) =>
              normalizeText(s.code) === normalizedStateFromUrl ||
              normalizeText(s.name) === normalizedStateFromUrl
          ) ?? null

    const normalizedCountyFromUrl = countyFromUrl ? normalizeText(countyFromUrl) : null
    const nextCounty =
      normalizedCountyFromUrl == null || !nextState
        ? null
        : ((countiesByState as Record<string, string[]>)[nextState.code] ?? []).find(
            (name) => normalizeText(name) === normalizedCountyFromUrl
          ) ?? null

    if (minFromUrl != null && Number.isFinite(minFromUrl)) setPriceRange((p) => ({ ...p, min: minFromUrl }))
    if (maxFromUrl != null && Number.isFinite(maxFromUrl)) setPriceRange((p) => ({ ...p, max: maxFromUrl }))
    if (minAcresFromUrlNum != null && Number.isFinite(minAcresFromUrlNum)) setSizeRange((s) => ({ ...s, min: minAcresFromUrlNum }))
    if (maxAcresFromUrlNum != null && Number.isFinite(maxAcresFromUrlNum)) setSizeRange((s) => ({ ...s, max: maxAcresFromUrlNum }))
    setStateFilter(nextState)
    setCountyFilter(nextCounty && nextState ? { stateCode: nextState.code, name: nextCounty } : null)
  }, [minAcresFromUrl, maxAcresFromUrl, minPriceFromUrl, maxPriceFromUrl, stateFromUrl, countyFromUrl])

  useEffect(() => {
    setCurrentPage(1)
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
  ])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setIsLoading(true)
      try {
        // When a prompt is handed off from home, results should come only from embedding-search.
        if (pendingSearchPrompt) return
        if (pendingSearchPrompt && handoffEmbeddingInProgressRef.current) return
        if (pendingLandLocationFetchSkipsRef.current > 0) {
          pendingLandLocationFetchSkipsRef.current = 0
          return
        }
        setIsServerPaginated(true)
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
        params.set("page", String(currentPage))
        params.set("limit", String(PAGE_SIZE))
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
        const payload = await res.json()
        if (cancelled) return
        const listing = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.listings)
            ? payload.listings
            : null
        if (!Array.isArray(listing)) return
        const total =
          typeof payload?.totalListingsNumber === "number" && !Array.isArray(payload)
            ? payload.totalListingsNumber
            : listing.length
        setIsServerPaginated(true)
        setTotalListingsNumber(total)
        const mapped = listing
          .map(mapLandListingRow)
          .sort((a, b) => (b.aiMatchingScore ?? -1) - (a.aiMatchingScore ?? -1))
        setListingsData(mapped)
        console.log("mapped", mapped)
      } catch {
        setIsServerPaginated(true)
        setListingsData(properties)
        setTotalListingsNumber(properties.length)
      } finally {
        if (!cancelled) setIsLoading(false)
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
    pendingSearchPrompt,
    currentPage,
  ])

  const handleEmbeddingSearch = useCallback(async (prompt: string): Promise<boolean> => {
    setIsLoading(true)
    try {
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
      const data = await res.json()
      const rows = Array.isArray(data?.listings) ? data.listings : Array.isArray(data) ? data : null
      if (rows == null) return false
      const promptFilters = data?.promptFilters ?? null
      console.log("embedding-search promptFilters (from LLM / SQL pre-filter)", promptFilters)

      if (promptFilters) {
        pendingLandLocationFetchSkipsRef.current += 1
        const nextState = resolveStateFilterFromPromptFilters(promptFilters)
        setStateFilter(nextState)
        setCountyFilter(resolveCountyFilterFromPromptFilters(promptFilters, nextState))
        setPriceRange({ min: promptFilters.minPrice ?? null, max: promptFilters.maxPrice ?? null })
        setSizeRange({ min: promptFilters.minAcres ?? null, max: promptFilters.maxAcres ?? null })
      }

      const mapped = rows
        .map(mapLandListingRow)
        .sort(
          (a: ListingItem, b: ListingItem) =>
            (b.aiMatchingScore ?? -1) - (a.aiMatchingScore ?? -1)
        )
      setIsServerPaginated(false)
      setCurrentPage(1)
      setListingsData(mapped)
      setTotalListingsNumber(mapped.length)
      return true
    } finally {
      setIsLoading(false)
    }
  }, [landFeatureFilters])

  /** Saved search "View Result" links use ?prompt=… to re-run embedding search. */
  useEffect(() => {
    const trimmed = promptFromUrl.trim()
    if (!trimmed) return
    setPendingSearchPrompt(trimmed)
  }, [promptFromUrl, setPendingSearchPrompt])

  useEffect(() => {
    if (!pendingSearchPrompt) {
      autoEmbeddedPromptRef.current = null
      return
    }
    if (autoEmbeddedPromptRef.current === pendingSearchPrompt) return
    autoEmbeddedPromptRef.current = pendingSearchPrompt
    let cancelled = false
    handoffEmbeddingInProgressRef.current = true
    ;(async () => {
      try {
        const ok = await handleEmbeddingSearch(pendingSearchPrompt)
        if (!cancelled && ok) {
          pendingLandLocationFetchSkipsRef.current += 1
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Handoff embedding search failed:", err)
        }
      } finally {
        // Always clear the prompt we just handled, even if this effect run was cancelled
        // (covers React Strict Mode double-invocation in dev, where the cleanup runs
        // before the fetch resolves). Functional update guards against wiping a newer
        // prompt the user might have set while this request was in flight.
        setPendingSearchPrompt((current) =>
          current === pendingSearchPrompt ? "" : current
        )
        if (!cancelled) {
          handoffEmbeddingInProgressRef.current = false
        }
      }
    })()
    return () => {
      cancelled = true
      handoffEmbeddingInProgressRef.current = false
    }
  }, [pendingSearchPrompt, setPendingSearchPrompt, handleEmbeddingSearch])

  const searchBarCurrentFilters = {
    minPrice: priceRange.min,
    maxPrice: priceRange.max,
    minAcres: sizeRange.min,
    maxAcres: sizeRange.max,
    state: stateFilter?.name ?? null,
    county: countyFilter?.name ?? null,
    propertyType: typeFromUrl || null,
    landType: typeFromUrl || null,
    activities: activitiesFromUrl.length > 0 ? activitiesFromUrl : null,
  }

  return (
    <div className="relative flex min-h-[calc(100vh-73px)] w-full flex-col font-ibm-plex-sans">
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
          syncedEmbeddingPrompt={pendingSearchPrompt || null}
          currentFilters={searchBarCurrentFilters}
        />
      </div>

      <PropertyMapList
        listings={listingsData}
        totalListingsNumber={totalListingsNumber}
        pageSize={PAGE_SIZE}
        currentPage={isServerPaginated ? currentPage : undefined}
        onPageChange={isServerPaginated ? setCurrentPage : undefined}
        title="Acreage"
        sortId={sortId}
        onSortChange={setSortId}
      />
      {isLoading ? <PageLoadingIndicator label="Loading properties..." fixed /> : null}
    </div>
  )
}

function LandPropertyPageFallback() {
  return (
    <div className="relative flex h-[calc(100vh-73px)] w-full items-center justify-center font-ibm-plex-sans">
      <PageLoadingIndicator label="Loading marketplace..." fixed={false} />
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
