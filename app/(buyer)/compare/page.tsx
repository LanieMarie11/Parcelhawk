"use client"

import Image from "next/image"
import Link from "next/link"
import { ChevronLeft, ChevronDown, ShieldCheck, Sparkles } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

type PropertyOption = {
  id: number
  name: string
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

const FALLBACK_PROPERTIES: PropertyOption[] = [
  {
    id: 1,
    name: "Creek Side Property",
    image: "/placeholder.svg",
    aiMatchScore: 92,
    isVerifiedBest: true,
    price: "$450,000",
    pricePerAcre: "$29,032/ac",
    acreage: "15.5 acres",
    location: "Boulder County, CO",
    roadAccess: "Paved road access",
    floodZone: "Zone X (minimal risk)",
    utilities: "Electric, Well, Septic",
    zoning: "Agricultural",
    source: "Lands of America",
    daysOnMarket: "45 days",
  },
  {
    id: 2,
    name: "Mountain View Ranch",
    image: "/placeholder.svg",
    aiMatchScore: 85,
    price: "$380,000",
    pricePerAcre: "$30,894/ac",
    acreage: "12.3 acres",
    location: "Larimer County, CO",
    roadAccess: "Gravel road access",
    floodZone: "Zone A (high risk)",
    utilities: "Electric, Well, Septic",
    zoning: "Residential",
    source: "LandWatch",
    daysOnMarket: "62 days",
  },
  {
    id: 3,
    name: "Sunset Hills Estate",
    image: "/placeholder.svg",
    aiMatchScore: 90,
    price: "$520,000",
    pricePerAcre: "$27,807/ac",
    acreage: "18.7 acres",
    location: "Boulder County, CO",
    roadAccess: "Paved road access",
    floodZone: "Zone X (minimal risk)",
    utilities: "Electric, Public water, Septic",
    zoning: "Agricultural",
    source: "LandWatch",
    daysOnMarket: "42 days",
  },
]

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
  const [propertyOptions, setPropertyOptions] = useState<PropertyOption[]>(FALLBACK_PROPERTIES)
  const [selectedIds, setSelectedIds] = useState<number[]>(FALLBACK_PROPERTIES.map((item) => item.id))

  useEffect(() => {
    if (typeof window === "undefined") return
    const rawPayload = window.sessionStorage.getItem("compareResult")
    if (!rawPayload) return

    try {
      const parsedPayload = JSON.parse(rawPayload) as CompareApiPayload
      if (parsedPayload.message) {
        setBackendMessage(parsedPayload.message)
      }
      if (Array.isArray(parsedPayload.comparedProperties) && parsedPayload.comparedProperties.length >= 2) {
        setPropertyOptions(parsedPayload.comparedProperties.slice(0, 3))
        setSelectedIds(parsedPayload.comparedProperties.slice(0, 3).map((item) => item.id))
      }
    } catch {
      // Ignore malformed test payloads and keep fallback data.
    }
  }, [])

  const selectedProperties = useMemo(
    () =>
      selectedIds.map(
        (id) => propertyOptions.find((option) => option.id === id) ?? propertyOptions[0]
      ),
    [propertyOptions, selectedIds]
  )
  const tableGridStyle = {
    gridTemplateColumns: `220px repeat(${Math.max(2, selectedProperties.length)}, minmax(0, 1fr))`,
  }

  const handleSelectProperty = (index: number, id: number) => {
    setSelectedIds((prev) => {
      const next = [...prev]
      next[index] = id
      return next
    })
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
            {selectedProperties.map((property, index) => {
              const isBest = Boolean(property.isVerifiedBest)
              return (
                <div
                  key={`${property.id}-${index}`}
                  className={`border-b border-[#EAECEF] p-3 ${
                    index < selectedProperties.length - 1 ? "border-r" : ""
                  } ${isBest ? "bg-[#EDF7EE]" : "bg-white"}`}
                >
                  <label className="block">
                    <span className="sr-only">Select property for column {index + 1}</span>
                    <div className="relative">
                      <select
                        value={property.id}
                        onChange={(event) => handleSelectProperty(index, Number(event.target.value))}
                        className="h-10 w-full appearance-none rounded-lg border border-transparent bg-transparent pl-12 pr-9 text-sm font-semibold text-[#1F232B] outline-none ring-[#04C0AF] focus:border-[#DCE3E8] focus:ring-2"
                      >
                        {propertyOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute left-2 top-1/2 h-8 w-8 -translate-y-1/2 overflow-hidden rounded-full">
                        <Image
                          src={property.image}
                          alt={property.name}
                          width={32}
                          height={32}
                          className="h-8 w-8 object-cover"
                        />
                      </div>
                      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-[#717887]" />
                    </div>
                  </label>
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
              {selectedProperties.map((property, index) => (
                <div
                  key={`${property.id}-${row.key}-${index}`}
                  className={`border-t border-[#EAECEF] px-4 py-3 text-sm text-[#2F3640] ${
                    index < selectedProperties.length - 1 ? "border-r" : ""
                  }`}
                >
                  {property[row.key]}
                </div>
              ))}
            </div>
          ))}
        </section>
      </div>
    </div>
  )
}
