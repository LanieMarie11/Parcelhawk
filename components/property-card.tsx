"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { useSession } from "next-auth/react"
import { Heart, MapPin, Maximize2 } from "lucide-react"
import { useSignInModal } from "@/lib/sign-in-modal-context"

export function formatPropertyLocation(p: {
  address1?: string | null
  city?: string | null
  stateAbbreviation?: string | null
  stateName?: string | null
  zip?: string | null
  /** Used when structured fields are all empty (legacy data) */
  location?: string | null
}): string {
  const a1 = p.address1?.trim() ?? ""
  const city = p.city?.trim() ?? ""
  const abbr = (p.stateAbbreviation?.trim() ?? "").toUpperCase()
  const stateNamePart = p.stateName?.trim() ?? ""
  const st = abbr || stateNamePart
  const zip = p.zip?.trim() ?? ""
  const stateZip = [st, zip].filter(Boolean).join(" ").trim()
  const cityPart = [city, stateZip].filter(Boolean).join(", ").trim()
  const parts = [a1, cityPart].filter(Boolean)
  if (parts.length > 0) return parts.join(", ")
  return (p.location?.trim() ?? "")
}

interface PropertyCardProps {
  id: number
  /** Single image (used by featured-list); ignored if images is provided */
  image?: string
  /** Multiple images for carousel (used by marketplace) */
  images?: string[]
  /** Display style */
  variant?: "grid" | "list"
  category: string
  categoryColor: string
  name: string
  price: string
  /** Plain location line when structured address fields are missing */
  location?: string
  address1?: string | null
  city?: string | null
  stateAbbreviation?: string | null
  stateName?: string | null
  zip?: string | null
  acreage: string
  aiMatchingScore?: number | null
  /** Description from landListings.description (array joined as paragraph); optional */
  description?: string | string[] | null
  /** When true, heart shows as favorited (e.g. from API isFavorite) */
  initialIsFavorite?: boolean
  /** URL to open when image is clicked (new tab). Use landListings.url when available; defaults to /property?id={id} */
  detailUrl?: string
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

function formatPrice(price: string): string {
  const num = Number(String(price).replace(/[^0-9.]/g, ""))
  if (Number.isNaN(num)) return price
  return `$${num.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
}

// land.com URLs like https://assets.land.com/resizedimages/0/1101/w/80/w/1-5533372506
// Use a larger width for card display (e.g. 600px)
function getImageSrc(url: string): string {
  if (!url) return "/placeholder.svg"
  if (url.startsWith("https://assets.land.com/") && url.includes("/w/80/")) {
    return url.replace("/w/80/", "/w/300/")
  }
  return url
}

function getAcresMatchBadgeClass(score: number): string {
  if (score >= 56) return "border-emerald-300 bg-emerald-50 text-emerald-700"
  if (score >= 35) return "border-sky-300 bg-sky-50 text-sky-700"
  return "border-slate-300 bg-slate-100 text-slate-700"
}

export function PropertyCard({
  id,
  image,
  images,
  variant = "grid",
  category,
  categoryColor,
  name,
  price,
  location = "",
  address1,
  city,
  stateAbbreviation,
  stateName,
  zip,
  acreage,
  aiMatchingScore,
  description,
  initialIsFavorite = false,
  detailUrl,
  onMouseEnter,
  onMouseLeave,
}: PropertyCardProps) {
  const { data: session } = useSession()
  const { openSignInModal } = useSignInModal()
  const [isFavorited, setIsFavorited] = useState(initialIsFavorite)

  useEffect(() => {
    setIsFavorited(initialIsFavorite)
  }, [initialIsFavorite])

  const firstImage =
    Array.isArray(images) && images.length > 0
      ? images[0]
      : image ?? ""

  const linkUrl = detailUrl ?? `/property?id=${id}`

  const descriptionText =
    description == null
      ? ""
      : Array.isArray(description)
        ? description.filter(Boolean).join(" ").trim()
        : String(description).trim()

  const locationLine = formatPropertyLocation({
    address1,
    city,
    stateAbbreviation,
    stateName,
    zip,
    location,
  })

  const saveFavorite = async (listingId: number) => {
    const res = await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ landListingIds: [listingId] }),
    })
    if (res.ok) setIsFavorited((prev) => !prev)
  }

  const numericPrice = Number(String(price).replace(/[^0-9.]/g, ""))
  const numericAcres = Number(String(acreage).replace(/[^0-9.]/g, ""))
  const showPricePerAcre = Number.isFinite(numericPrice) && Number.isFinite(numericAcres) && numericAcres > 0
  const pricePerAcre = showPricePerAcre ? numericPrice / numericAcres : null

  if (variant === "list") {
    return (
      <div
        className="group flex items-stretch gap-4 rounded-2xl border border-border bg-background p-4 font-ibm-plex-sans shadow-sm"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <a
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="relative block h-[92px] w-[148px] shrink-0 overflow-hidden rounded-xl bg-muted"
        >
          <Image
            src={getImageSrc(firstImage)}
            alt={name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="148px"
          />
        </a>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-col items-start gap-0.5">
                <p className="text-2xl font-bold tracking-tight text-foreground">{formatPrice(price)}</p>
                {showPricePerAcre ? (
                  <p className="text-sm font-normal text-muted-foreground">
                    ${Math.round(pricePerAcre!).toLocaleString("en-US")} / acre
                  </p>
                ) : null}
              </div>
              {/* <p className="mt-0.5 text-sm text-muted-foreground line-clamp-1">{name}</p> */}
              <p className="mt-0.5 flex items-center gap-1 text-sm line-clamp-2">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0">{locationLine}</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              {acreage ? (
                <span className="rounded-full border border-border bg-background px-2 py-1 text-xs font-medium text-foreground">
                  {String(acreage).trim()} ac
                </span>
              ) : null}
              {/* {category ? (
                <span
                  className="rounded-full px-2 py-1 text-xs font-medium text-white"
                  style={{ backgroundColor: categoryColor || "#6b7b6b" }}
                >
                  {category}
                </span>
              ) : null} */}
              {aiMatchingScore != null ? (
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium ${getAcresMatchBadgeClass(aiMatchingScore)}`}
                >
                  AI {aiMatchingScore}/70
                </span>
              ) : null}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  if (!session) {
                    openSignInModal()
                    return
                  }
                  saveFavorite(id)
                }}
                className="ml-1 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background transition-colors hover:bg-accent"
                aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
              >
                <Heart
                  className={`h-4 w-4 transition-colors ${
                    isFavorited ? "fill-red-500 text-red-500" : "text-muted-foreground"
                  }`}
                />
              </button>
            </div>
          </div>

          {descriptionText ? (
            <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{descriptionText}</p>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div
      className="group flex flex-col font-ibm-plex-sans p-4 rounded-xl bg-[#F3F3F5]"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <a
        href={linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group/img relative block aspect-4/3 overflow-hidden rounded-xl"
      >
        <Image
          src={getImageSrc(firstImage)}
          alt={name}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
        />
        {/* <span
          className="absolute left-3 top-3 rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-primary-foreground backdrop-blur-sm"
          // style={{ backgroundColor: categoryColor }}
        >
          {category}
        </span> */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            if (!session) {
              openSignInModal()
              return
            }
            saveFavorite(id)
          }}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm transition-colors hover:bg-background"
          aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart
            className={`h-4 w-4 transition-colors ${
              isFavorited
                ? "fill-red-500 text-red-500"
                : "text-foreground/70"
            }`}
          />
        </button>
      </a>

      <div className="flex items-start justify-between pt-3">
        <h3 className="text-sm font-medium text-[#030303]">{name}</h3>
        <span className="text-sm font-semibold text-foreground">{formatPrice(price)}</span>
      </div>

      {descriptionText ? (
        <p className="pt-1.5 text-xs text-muted-foreground line-clamp-3">
          {descriptionText}
        </p>
      ) : null}

      <div className="flex items-center gap-3 pt-1 text-xs text-muted-foreground">
        <span className="flex min-w-0 items-start gap-1">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="line-clamp-2">{locationLine}</span>
        </span>
        <span className="flex items-center gap-1">
          <Maximize2 className="h-3 w-3" />
          {acreage} Acres
        </span>
      </div>
    </div>
  )
}
