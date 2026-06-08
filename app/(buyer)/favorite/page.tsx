"use client"

import Image from "next/image"
import { MapPin, Plus, Search, Sparkles, Trash2 } from "lucide-react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Suspense, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { formatPropertyLocation } from "@/app/(buyer)/components/property-card"
import { OrderPropertyReportModal } from "@/app/(buyer)/favorite/components/order-property-report-modal"
import { UtilitySearchModal } from "@/app/(buyer)/favorite/components/utility-search-modal"
import { PageLoadingIndicator } from "@/components/page-loading-indicator"
import type { ListingItem } from "@/components/property-map-list"
import { resolveListingSatellitePreviewUrl } from "@/lib/parcel-satellite-preview-client"
import { ViewRequestModal } from "../components/view-request-modal"

const SORT_OPTIONS = [
  "Newest",
  "Oldest",
  "Price: Low to High",
  "Price: High to Low",
  "Price per Acre: Low to High",
  "Price per Acre: High to Low",
] as const

function formatPrice(price: string): string {
  const num = Number(String(price).replace(/[^0-9.]/g, ""))
  if (Number.isNaN(num)) return price
  return `$${num.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
}

function getImageSrc(url?: string): string {
  if (!url) return "/placeholder.svg"
  if (url.startsWith("https://assets.land.com/") && url.includes("/w/80/")) {
    return url.replace("/w/80/", "/w/600/")
  }
  return url
}

function getFavoriteCardImageSrc(listing: ListingItem): string {
  const satellite = resolveListingSatellitePreviewUrl(listing)
  if (satellite) return satellite
  const first = Array.isArray(listing.images) && listing.images.length > 0 ? listing.images[0] : undefined
  return getImageSrc(first)
}

function shouldUseUnoptimizedImage(src: string): boolean {
  return src.startsWith("data:") || src.includes("maps.googleapis.com")
}

function formatSavedRelativeLabel(iso: string | null | undefined): string {
  if (!iso?.trim()) return "Saved recently"
  const saved = new Date(iso)
  const t = saved.getTime()
  if (Number.isNaN(t)) return "Saved recently"

  const diffMs = Math.max(0, Date.now() - t)
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return "Saved just now"
  if (minutes < 60) return `Saved ${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Saved ${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 7) return `Saved ${days}d ago`

  const weeks = Math.floor(days / 7)
  if (weeks < 8) return `Saved ${weeks}w ago`

  const months = Math.floor(days / 30)
  if (months < 12) return `Saved ${months}mo ago`

  const years = Math.floor(days / 365)
  return `Saved ${years}y ago`
}

/** `favorites.created_at` from API (ISO); used for default sort order. */
function favoriteSavedAtMs(listing: ListingItem): number {
  const raw = listing.createdAt?.trim()
  if (!raw) return 0
  const t = new Date(raw).getTime()
  return Number.isNaN(t) ? 0 : t
}

function pricePerAcre(listing: ListingItem): number | null {
  const acres = Number(String(listing.acreage).replace(/[^0-9.]/g, ""))
  const price = Number(String(listing.price).replace(/[^0-9.]/g, ""))
  if (!Number.isFinite(acres) || acres <= 0 || !Number.isFinite(price)) return null
  return price / acres
}

function FavoritePropertyCard({
  listing,
  selectedForCompare,
  onToggleCompare,
  onRemoveFavorite,
  onViewingRequestSent,
  isRemovingFavorite,
}: {
  listing: ListingItem
  selectedForCompare: boolean
  onToggleCompare: () => void
  onRemoveFavorite: () => void
  onViewingRequestSent: (listingId: number) => void
  isRemovingFavorite: boolean
}) {
  const [isParcelPreviewOpen, setIsParcelPreviewOpen] = useState(false)
  const [isViewRequestOpen, setIsViewRequestOpen] = useState(false)
  const [isRemoveConfirmOpen, setIsRemoveConfirmOpen] = useState(false)
  const [isOrderReportOpen, setIsOrderReportOpen] = useState(false)
  const [isUtilitySearchOpen, setIsUtilitySearchOpen] = useState(false)
  const satelliteUrl = resolveListingSatellitePreviewUrl(listing) ?? null
  const cardImageSrc = getFavoriteCardImageSrc(listing)
  const priceText = formatPrice(listing.price)
  const acresValue = Number(String(listing.acreage).replace(/[^0-9.]/g, ""))
  const pricePerAcre = Number.isFinite(acresValue) && acresValue > 0 ? Number(String(listing.price).replace(/[^0-9.]/g, "")) / acresValue : null
  const aiScore = listing.aiMatchingScore ?? 88
  const locationLine = formatPropertyLocation({
    address1: listing.address1,
    city: listing.city,
    stateAbbreviation: listing.stateAbbreviation,
    stateName: listing.stateName,
    zip: listing.zip,
    location: listing.location,
  })

  const linkUrl = listing.url?.trim() ? listing.url : `/property?id=${listing.id}`
  const savedLabel = formatSavedRelativeLabel(listing.createdAt)

  return (
    <>
    <article className="rounded-2xl border border-border bg-card p-3 shadow-sm">
      <div className="relative overflow-hidden rounded-xl">
        <div className="absolute left-2 top-2 z-10">
          <button
            type="button"
            onClick={onToggleCompare}
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium backdrop-blur-sm ${
              selectedForCompare
                ? "border-brand-green bg-brand-green/80 text-white"
                : "border-black/10 bg-white/90 text-foreground"
            }`}
          >
            <Plus className="h-3.5 w-3.5" />
            Compare
          </button>
        </div>
        <div className="absolute bottom-2 right-2 z-10 rounded-full bg-black/55 px-2 py-1 text-xs font-medium text-white">
          {savedLabel}
        </div>
        <div className="group relative h-[156px] w-full bg-muted">
          {satelliteUrl ? (
            <div
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setIsParcelPreviewOpen(true)
              }}
              onKeyDown={(e) => {
                if (e.key !== "Enter" && e.key !== " ") return
                e.preventDefault()
                e.stopPropagation()
                setIsParcelPreviewOpen(true)
              }}
              className="relative h-full w-full cursor-pointer overflow-hidden"
              title="Open parcel boundary satellite preview"
              aria-label="Open parcel boundary satellite preview"
            >
              <Image
                src={cardImageSrc}
                alt={`${listing.name} — parcel on satellite map`}
                fill
                unoptimized={shouldUseUnoptimizedImage(cardImageSrc)}
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 1280px) 33vw, 300px"
              />
            </div>
          ) : (
            <Image
              src={cardImageSrc}
              alt={listing.name}
              fill
              unoptimized={shouldUseUnoptimizedImage(cardImageSrc)}
              className="object-cover"
              sizes="(max-width: 1280px) 33vw, 300px"
            />
          )}
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[20px] leading-none font-semibold text-foreground">{priceText}</p>
          {/* <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
            {aiScore}% match
          </span> */}
        </div>
        {pricePerAcre ? (
          <p className="mt-1 text-xs text-muted-foreground">
            ${Math.round(pricePerAcre).toLocaleString("en-US")} / acre
          </p>
        ) : null}
        <a
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 flex min-w-0 cursor-pointer items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground hover:underline"
        >
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0 truncate">{locationLine || listing.name}</span>
        </a>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {["Road access", listing.category ?? "Agricultural", "Water rights", "+1"].map((tag) => (
            <span key={tag} className="rounded-md bg-[#F3F3F5] px-2 py-1 text-[11px] text-[#5D606D]">
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-3 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsOrderReportOpen(true)}
              className="min-w-0 flex-1 rounded-lg bg-brand-green py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-green-hover"
            >
              Order Report
            </button>
            <button
              type="button"
              onClick={() => setIsViewRequestOpen(true)}
              className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-zinc-50"
            >
              View Request
            </button>
            <button
              type="button"
              onClick={() => setIsRemoveConfirmOpen(true)}
              disabled={isRemovingFavorite}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-[#EE5A5A] transition-colors hover:bg-red-50"
              aria-label="Remove from favorites"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setIsUtilitySearchOpen(true)}
            className="w-full rounded-lg border border-zinc-200 bg-white py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-zinc-50"
          >
            Utility Search
          </button>
        </div>
      </div>
    </article>

    {isParcelPreviewOpen && satelliteUrl ? (
      <div
        className="fixed inset-0 z-120 flex items-center justify-center bg-black/75 p-4"
        onClick={() => setIsParcelPreviewOpen(false)}
      >
        <div
          className="relative w-full max-w-5xl rounded-xl bg-background p-2 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => setIsParcelPreviewOpen(false)}
            className="absolute right-2 top-2 z-10 rounded-md bg-black/60 px-2 py-1 text-xs text-white"
          >
            Close
          </button>
          <div className="relative aspect-video w-full overflow-hidden rounded-lg">
            <Image
              src={satelliteUrl}
              alt={`${listing.name} — parcel boundary detailed satellite preview`}
              fill
              unoptimized
              className="object-contain bg-black"
              sizes="100vw"
            />
          </div>
        </div>
      </div>
    ) : null}

    <OrderPropertyReportModal
      open={isOrderReportOpen}
      onClose={() => setIsOrderReportOpen(false)}
      listingId={listing.id}
      propertySubtitle={listing.name}
    />

    <UtilitySearchModal
      open={isUtilitySearchOpen}
      onClose={() => setIsUtilitySearchOpen(false)}
      listingId={listing.id}
      propertySubtitle={listing.name}
    />

    {isRemoveConfirmOpen ? (
      <div
        className="fixed inset-0 z-120 flex items-center justify-center bg-black/50 p-4"
        onClick={() => {
          if (isRemovingFavorite) return
          setIsRemoveConfirmOpen(false)
        }}
      >
        <div
          className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-lg font-semibold text-foreground">Remove Favorite</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Are you sure you want to remove this property from your favorites?
          </p>
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              disabled={isRemovingFavorite}
              onClick={() => setIsRemoveConfirmOpen(false)}
              className="flex-1 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Back
            </button>
            <button
              type="button"
              disabled={isRemovingFavorite}
              onClick={() => {
                setIsRemoveConfirmOpen(false)
                onRemoveFavorite()
              }}
              className="flex-1 rounded-lg bg-[#EE5A5A] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#d94b4b] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRemovingFavorite ? "Removing..." : "Remove"}
            </button>
          </div>
        </div>
      </div>
    ) : null}

    <ViewRequestModal
      open={isViewRequestOpen}
      listingId={listing.id}
      viewingRequest={listing.hasViewingRequest ?? false}
      onClose={() => setIsViewRequestOpen(false)}
      onSuccess={() => onViewingRequestSent(listing.id)}
    />
    </>
  )
}

function FavoritePageContent() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [listingsData, setListingsData] = useState<ListingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<(typeof SORT_OPTIONS)[number]>("Newest")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCompareIds, setSelectedCompareIds] = useState<number[]>([])
  const [isComparing, setIsComparing] = useState(false)
  const [compareError, setCompareError] = useState("")
  const [removingFavoriteIds, setRemovingFavoriteIds] = useState<number[]>([])

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

  const visibleListings = useMemo(() => {
    let items = [...listingsData]
    if (searchTerm.trim()) {
      const query = searchTerm.trim().toLowerCase()
      items = items.filter((item) => {
        return (
          item.name.toLowerCase().includes(query) ||
          (item.location ?? "").toLowerCase().includes(query)
        )
      })
    }

    if (sortBy === "Price: Low to High") {
      items.sort((a, b) => Number(a.price) - Number(b.price))
    } else if (sortBy === "Price: High to Low") {
      items.sort((a, b) => Number(b.price) - Number(a.price))
    } else if (sortBy === "Price per Acre: Low to High") {
      items.sort((a, b) => {
        const pa = pricePerAcre(a)
        const pb = pricePerAcre(b)
        if (pa == null && pb == null) return a.id - b.id
        if (pa == null) return 1
        if (pb == null) return -1
        const diff = pa - pb
        if (diff !== 0) return diff
        return a.id - b.id
      })
    } else if (sortBy === "Price per Acre: High to Low") {
      items.sort((a, b) => {
        const pa = pricePerAcre(a)
        const pb = pricePerAcre(b)
        if (pa == null && pb == null) return a.id - b.id
        if (pa == null) return 1
        if (pb == null) return -1
        const diff = pb - pa
        if (diff !== 0) return diff
        return a.id - b.id
      })
    } else if (sortBy === "Oldest") {
      items.sort((a, b) => {
        const diff = favoriteSavedAtMs(a) - favoriteSavedAtMs(b)
        if (diff !== 0) return diff
        return a.id - b.id
      })
    } else if (sortBy === "Newest") {
      items.sort((a, b) => {
        const diff = favoriteSavedAtMs(b) - favoriteSavedAtMs(a)
        if (diff !== 0) return diff
        return b.id - a.id
      })
    }
    return items
  }, [listingsData, searchTerm, sortBy])

  const selectedCompareListings = useMemo(
    () => visibleListings.filter((listing) => selectedCompareIds.includes(listing.id)).slice(0, 3),
    [visibleListings, selectedCompareIds]
  )

  const toggleCompare = (listingId: number) => {
    setSelectedCompareIds((prev) => {
      if (prev.includes(listingId)) return prev.filter((id) => id !== listingId)
      if (prev.length >= 3) return prev
      return [...prev, listingId]
    })
  }

  const handleCompareProperties = async () => {
    if (selectedCompareListings.length < 2 || isComparing) return

    setCompareError("")
    setIsComparing(true)
    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyIds: selectedCompareIds }),
      })

      if (!res.ok) {
        throw new Error("Failed to compare properties")
      }

      const compareResult = await res.json()
      if (typeof window !== "undefined") {
        sessionStorage.setItem("compareResult", JSON.stringify(compareResult))
      }
      router.push("/compare")
    } catch (error) {
      console.error(error)
      setCompareError("Unable to start comparison right now. Please try again.")
    } finally {
      setIsComparing(false)
    }
  }

  const handleViewingRequestSent = (listingId: number) => {
    setListingsData((prev) =>
      prev.map((item) =>
        item.id === listingId ? { ...item, hasViewingRequest: true } : item
      )
    )
  }

  const handleRemoveFavorite = async (listingId: number) => {
    if (removingFavoriteIds.includes(listingId)) return
    setRemovingFavoriteIds((prev) => [...prev, listingId])

    try {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ landListingIds: [listingId] }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to remove favorite")
      }

      setListingsData((prev) => prev.filter((item) => item.id !== listingId))
      setSelectedCompareIds((prev) => prev.filter((id) => id !== listingId))
      toast.success("Removed from favorites")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove favorite")
    } finally {
      setRemovingFavoriteIds((prev) => prev.filter((id) => id !== listingId))
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="relative flex h-[calc(100vh-73px)] w-full items-center justify-center font-ibm-plex-sans">
        <PageLoadingIndicator label="Loading favorites..." fixed={false} />
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

  const userProfileLocation = (session.user?.location ?? "").trim()

  return (
    <div className="min-h-[calc(100vh-73px)] w-full bg-[#F8F8F8] font-ibm-plex-sans">
      <div className="mx-auto w-full max-w-[1480px] px-5 py-4">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="relative min-w-[280px] flex-1 max-w-[440px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by location, county..."
              className="h-10 w-full rounded-lg border border-border bg-white pl-9 pr-3 text-sm outline-none ring-[#04C0AF] placeholder:text-muted-foreground focus:ring-2"
            />
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-[#373940]">
              <span className="text-muted-foreground">Sort:</span>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as (typeof SORT_OPTIONS)[number])}
                className="bg-transparent text-sm outline-none"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            {userProfileLocation ? (
              <div
                className="flex min-w-0 max-w-[240px] items-center gap-1 text-muted-foreground"
                title={userProfileLocation}
              >
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{userProfileLocation}</span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section>
            <p className="mb-4 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{visibleListings.length}</span> Saved Properties
            </p>

            {visibleListings.length === 0 ? (
              <div className="flex min-h-[420px] rounded-xl border border-border bg-white items-center justify-center">
                <div className="text-center font-ibm-plex-sans">
                  <h2 className="text-2xl font-medium font-phudu uppercase tracking-tight text-[#1D1D1F]">
                    No Saved Parcels Yet
                  </h2>
                  <p className="mt-2 text-sm font-ibm-plex-sans text-[#7B7F8A]">
                    Start exploring and save parcels you like to find them here anytime.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {visibleListings.map((listing) => (
                  <FavoritePropertyCard
                    key={listing.id}
                    listing={listing}
                    selectedForCompare={selectedCompareIds.includes(listing.id)}
                    onToggleCompare={() => toggleCompare(listing.id)}
                    onRemoveFavorite={() => void handleRemoveFavorite(listing.id)}
                    onViewingRequestSent={handleViewingRequestSent}
                    isRemovingFavorite={removingFavoriteIds.includes(listing.id)}
                  />
                ))}
              </div>
            )}
          </section>

          <aside className="self-start rounded-2xl border border-border bg-white p-4">
            <div className="rounded-xl border border-border bg-[#F7F7F7] p-5 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#4f5160]">
                <Sparkles className="h-4 w-4" />
              </div>
              <h2 className="mt-3 text-xl font-semibold font-phudu text-[#2E3037]">AI COMPARISON</h2>
              <p className="mx-auto mt-2 max-w-[260px] text-sm text-[#6A6D79]">
                Select up to 2-5 properties using the{" "}
                <span className="font-semibold text-[#2D5A36]">Compare</span>{" "}
                button on each card to see an AI-powered side-by-side analysis.
              </p>

              <div className="mt-4 grid grid-cols-3 gap-2">
                {[0, 1, 2].map((index) => {
                  const selected = selectedCompareListings[index]
                  return (
                    <div
                      key={index}
                      className={`rounded-lg border border-dashed p-2 text-xs ${
                        selected ? "border-[#04C0AF]/40 bg-[#EFFFFD] text-[#146C64]" : "border-border text-muted-foreground"
                      }`}
                    >
                      <div className="mb-1 flex justify-center">
                        <Plus className="h-3.5 w-3.5" />
                      </div>
                      {selected ? (
                        <p className="line-clamp-2">{selected.name}</p>
                      ) : (
                        <p>Add property {index + 1}</p>
                      )}
                    </div>
                  )
                })}
              </div>

              <button
                type="button"
                onClick={handleCompareProperties}
                disabled={selectedCompareListings.length < 2 || isComparing}
                className="mt-4 w-full rounded-lg bg-brand-green py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-green-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isComparing ? "Comparing..." : "Compare properties"}
              </button>
              {compareError ? <p className="mt-2 text-xs text-[#B3261E]">{compareError}</p> : null}
            </div>

            <div className="mt-3 rounded-xl border border-[#BFD7EF] bg-[#F5FAFF] p-3">
              <p className="text-sm font-semibold text-[#002C58]">How AI Comparison Works</p>
              <p className="mt-1 text-xs text-[#58708C]">
                Click Compare on any 2 of your saved properties. ParcelHawk AI compares location fit, pricing, acreage, and investment potential side-by-side.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

export default function FavoritePage() {
  return (
    <Suspense
      fallback={
        <div className="relative flex h-[calc(100vh-73px)] w-full items-center justify-center font-ibm-plex-sans">
          <PageLoadingIndicator label="Loading..." fixed={false} />
        </div>
      }
    >
      <FavoritePageContent />
    </Suspense>
  )
}
