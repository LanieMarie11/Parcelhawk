"use client"

import { Search } from "lucide-react"
import { useSession } from "next-auth/react"
import { Suspense, useEffect, useState } from "react"
import PriceRange from "@/components/price-range"
import SizeRange from "@/components/size-range"
import FilterOption from "@/components/filter-option"
import { PropertyMapList } from "@/components/property-map-list"
import type { ListingItem } from "@/components/property-map-list"

function FavoritePageContent() {
  const { data: session, status } = useSession()
  const [listingsData, setListingsData] = useState<ListingItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status !== "authenticated") {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    fetch("/api/favorites")
      .then((res) => {
        if (!res.ok) return []
        return res.json()
      })
      .then((data) => {
        if (!cancelled && Array.isArray(data)) setListingsData(data)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [status])

  if (status === "loading" || loading) {
    return (
      <div className="flex h-[calc(100vh-73px)] w-full items-center justify-center font-ibm-plex-sans">
        <p className="text-sm text-muted-foreground">Loading favorites…</p>
      </div>
    )
  }

  if (status !== "authenticated" || !session) {
    return (
      <div className="flex h-[calc(100vh-73px)] w-full flex-col items-center justify-center gap-4 font-ibm-plex-sans">
        <p className="text-sm text-muted-foreground">
          Sign in to view your favorite listings.
        </p>
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col font-ibm-plex-sans">
      <div className="sticky top-[73px] z-20 shrink-0 border-b border-border bg-background">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 max-w-1/2 flex-1 items-center gap-3">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by location"
                className="h-10 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <PriceRange />
            <SizeRange />
            <FilterOption />
          </div>
          <span className="shrink-0 text-sm font-medium text-foreground">
            Favorites
          </span>
        </div>
      </div>

      <PropertyMapList listings={listingsData} title="Favorites" />
    </div>
  )
}

function FavoritePageFallback() {
  return (
    <div className="flex h-[calc(100vh-73px)] w-full items-center justify-center font-ibm-plex-sans">
      <p className="text-sm text-muted-foreground">Loading…</p>
    </div>
  )
}

export default function FavoritePage() {
  return (
    <Suspense fallback={<FavoritePageFallback />}>
      <FavoritePageContent />
    </Suspense>
  )
}
