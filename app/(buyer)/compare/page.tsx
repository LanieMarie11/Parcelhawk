"use client"

import Image from "next/image"
import Link from "next/link"
import { ChevronLeft, ShieldCheck, Sparkles } from "lucide-react"
import { useEffect, useState } from "react"

type PropertyOption = {
  id: number
  name: string
  /** Listing detail URL when present; otherwise compare UI falls back to `/property?id=`. */
  url?: string | null
  image: string
  aiMatchScore: number
  isVerifiedBest?: boolean
  price: string
  pricePerAcre: string
  acreage: string
  location: string
  roadAccess: string
  floodZone: string
  utilities: string
  zoning: string
  source: string
  daysOnMarket: string
}

type CompareApiPayload = {
  message?: string
  comparedProperties?: PropertyOption[]
}

function listingLinkUrl(url: string | undefined | null, id: number): string {
  const trimmed = typeof url === "string" ? url.trim() : ""
  return trimmed ? trimmed : `/property?id=${id}`
}

const COMPARISON_ROWS: Array<{ label: string; key: keyof PropertyOption }> = [
  { label: "Price", key: "price" },
  { label: "Price per acre", key: "pricePerAcre" },
  { label: "Acreage", key: "acreage" },
  { label: "Location", key: "location" },
  { label: "Road access", key: "roadAccess" },
  { label: "Flood zone", key: "floodZone" },
  { label: "Utilities", key: "utilities" },
  { label: "Zoning", key: "zoning" },
  { label: "AI Match Score", key: "aiMatchScore" },
  { label: "Source", key: "source" },
  { label: "Days on market", key: "daysOnMarket" },
]

export default function ComparePage() {
  const [backendMessage, setBackendMessage] = useState("")
  const [propertyOptions, setPropertyOptions] = useState<PropertyOption[]>([])
  const [hasCheckedStorage, setHasCheckedStorage] = useState(false)
  const [imagePreview, setImagePreview] = useState<{ src: string; name: string } | null>(null)

  useEffect(() => {
    const rawPayload = window.sessionStorage.getItem("compareResult")
    if (!rawPayload) {
      setHasCheckedStorage(true)
      return
    }

    try {
      const parsedPayload = JSON.parse(rawPayload) as CompareApiPayload
      if (parsedPayload.message) {
        setBackendMessage(parsedPayload.message)
      }
      if (Array.isArray(parsedPayload.comparedProperties) && parsedPayload.comparedProperties.length >= 2) {
        const list = parsedPayload.comparedProperties.slice(0, 3)
        setPropertyOptions(list)
      }
    } catch {
      // Malformed payload: show empty state.
    } finally {
      setHasCheckedStorage(true)
    }
  }, [])

  const hasComparison = propertyOptions.length >= 2

  const tableGridStyle = {
    gridTemplateColumns: `220px repeat(${Math.max(2, propertyOptions.length)}, minmax(0, 1fr))`,
  }

  return (
    <div className="min-h-[calc(100vh-73px)] w-full bg-[#F7F8FA] font-ibm-plex-sans">
      <div className="mx-auto w-full max-w-[1480px] px-5 py-6">
        <div className="mb-5">
          <Link
            href="/favorite"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#5E6470] transition-colors hover:text-[#1F232B]"
          >
            <ChevronLeft className="h-4 w-4" />
            Saved Properties
          </Link>
          <h1 className="mt-2 text-3xl font-ibm-plex-sans font-semibold uppercase tracking-tight text-[#1F232B]">
            Property Comparison
          </h1>
        </div>

        {!hasCheckedStorage ? (
          <div className="flex min-h-[40vh] items-center justify-center rounded-2xl border border-[#E7E9EF] bg-white p-10 shadow-sm">
            <p className="text-sm text-[#5E6470]">Loading comparison…</p>
          </div>
        ) : !hasComparison ? (
          <section className="rounded-2xl border border-[#E7E9EF] bg-white p-10 text-center shadow-sm">
            <p className="text-base font-semibold text-[#1F232B]">No properties to compare yet</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-[#5E6470]">
              Go to Saved Properties, choose at least two listings to compare, then run compare from
              there. This page will show your comparison after you open it from favorites.
            </p>
            <Link
              href="/favorite"
              className="mt-6 inline-flex items-center justify-center rounded-lg bg-[#04C0AF] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#03ac9d]"
            >
              Open Saved Properties
            </Link>
          </section>
        ) : (
          <>
            <section className="mb-5 rounded-2xl border border-[#E7E9EF] bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F2F8F7] text-[#2E5A33]">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-lg font-semibold font-phudu text-[#1F232B]">AI COMPARISON</p>
                  <p className="mt-1 max-w-[1180px] text-sm text-[#5E6470]">
                    The comparison table below is now using payload values returned from the backend
                    compare API.
                  </p>
                  {backendMessage ? (
                    <p className="mt-2 text-sm font-semibold text-[#2D5A36]">{backendMessage}</p>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-[#E7E9EF] bg-white">
              <div className="grid" style={tableGridStyle}>
                <div className="border-b border-r border-[#EAECEF] bg-[#F8FAF8] p-4">
                  <p className="text-sm font-semibold text-[#3E454F]">Field Name</p>
                </div>
                {propertyOptions.map((property, index) => {
                  const isBest = Boolean(property.isVerifiedBest)
                  return (
                    <div
                      key={`${property.id}-${index}`}
                      className={`border-b border-[#EAECEF] p-3 ${
                        index < propertyOptions.length - 1 ? "border-r" : ""
                      } ${isBest ? "bg-[#EDF7EE]" : "bg-white"}`}
                    >
                      <div className="flex min-h-10 items-center gap-2">
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setImagePreview({ src: property.image, name: property.name })
                          }}
                          onKeyDown={(e) => {
                            if (e.key !== "Enter" && e.key !== " ") return
                            e.preventDefault()
                            e.stopPropagation()
                            setImagePreview({ src: property.image, name: property.name })
                          }}
                          className="relative h-8 w-8 shrink-0 cursor-pointer overflow-hidden rounded-full outline-none ring-[#04C0AF] focus-visible:ring-2"
                          title="Open detailed image preview"
                          aria-label="Open detailed image preview"
                        >
                          <Image
                            src={property.image}
                            alt={property.name}
                            width={32}
                            height={32}
                            unoptimized={property.image.startsWith("data:")}
                            className="h-8 w-8 object-cover transition-opacity hover:opacity-90"
                          />
                        </div>
                        <a
                          href={listingLinkUrl(property.url, property.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-w-0 text-sm font-semibold leading-tight text-[#1F232B] transition-colors hover:text-[#04C0AF] hover:underline"
                        >
                          {property.name}
                        </a>
                      </div>
                      <p className="mt-1 text-xs font-medium text-[#44A160]">
                        {isBest ? (
                          <span className="inline-flex items-center gap-1">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            AI Verified Best
                          </span>
                        ) : (
                          `${property.aiMatchScore}% AI Match`
                        )}
                      </p>
                    </div>
                  )
                })}
              </div>

              {COMPARISON_ROWS.map((row) => (
                <div key={row.key} className="grid" style={tableGridStyle}>
                  <div className="border-r border-t border-[#EAECEF] bg-[#FBFCFD] px-4 py-3 text-sm font-medium text-[#4D5563]">
                    {row.label}
                  </div>
                  {propertyOptions.map((property, index) => (
                    <div
                      key={`${property.id}-${row.key}-${index}`}
                      className={`border-t border-[#EAECEF] px-4 py-3 text-sm text-[#2F3640] ${
                        index < propertyOptions.length - 1 ? "border-r" : ""
                      }`}
                    >
                      {property[row.key]}
                    </div>
                  ))}
                </div>
              ))}
            </section>

            {imagePreview ? (
              <div
                className="fixed inset-0 z-120 flex items-center justify-center bg-black/75 p-4"
                onClick={() => setImagePreview(null)}
              >
                <div
                  className="relative w-full max-w-5xl rounded-xl bg-white p-2 shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => setImagePreview(null)}
                    className="absolute right-2 top-2 z-10 rounded-md bg-black/60 px-2 py-1 text-xs text-white"
                  >
                    Close
                  </button>
                  <div className="relative aspect-video w-full overflow-hidden rounded-lg">
                    <Image
                      src={imagePreview.src}
                      alt={`${imagePreview.name} — detailed preview`}
                      fill
                      unoptimized={imagePreview.src.startsWith("data:")}
                      className="object-contain bg-black"
                      sizes="100vw"
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
