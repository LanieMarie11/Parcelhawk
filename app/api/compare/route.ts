import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import type { Session } from "next-auth"
import { and, eq, inArray, type InferSelectModel } from "drizzle-orm"
import { db } from "@/db"
import { favorites, mergedListings } from "@/db/schema"
import { authOptions } from "@/lib/auth"
import { descriptionToText, inferFeaturesFromDescriptionWithLlm } from "@/lib/ai-compare"
import { summarizeComparedListingsWithLlm } from "@/lib/ai-description-summary"
import { jsonbArrayFirst } from "@/lib/land-updated-listing-filters"

type LandListing = InferSelectModel<typeof mergedListings>
type CompareListingRow = Pick<
  LandListing,
  | "id"
  | "title"
  | "price"
  | "acres"
  | "address1"
  | "city"
  | "county"
  | "stateAbbreviation"
  | "listedDate"
  | "latitude"
  | "longitude"
  | "propertyType"
  | "propertyAmenities"
  | "description"
  | "url"
>

function getUserId(session: Session | null): string | null {
  return (session?.user as { id?: string } | undefined)?.id ?? null
}

function formatCurrency(value: number): string {
  return `$${Math.round(value).toLocaleString("en-US")}`
}

function toNumber(value: unknown): number | null {
  if (value == null) return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

/** Parses `listed_date` text (e.g. "May 13, 2026 at 6:57 AM") for days-on-market math. */
function parseListedDate(value: string | null | undefined): Date | null {
  if (value == null) return null
  const trimmed = value.trim()
  if (!trimmed) return null

  const normalized = trimmed.includes(" at ") ? trimmed.replace(" at ", " ") : trimmed
  const parsed = new Date(normalized)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function computeDaysOnMarket(listedDate: string | null | undefined): number | null {
  const parsed = parseListedDate(listedDate)
  if (!parsed) return null

  return Math.max(
    0,
    Math.floor((Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24)),
  )
}

function inferListingSource(url: string | null | undefined): string {
  const trimmed = url?.trim()
  if (!trimmed) return "Unknown"

  try {
    const { hostname, pathname } = new URL(trimmed)
    const host = hostname.replace(/^www\./i, "").toLowerCase()

    if (host === "land.com") return "Land.com"
    if (host === "redfin.com") return "Redfin"
    if (host === "facebook.com" && pathname.includes("/marketplace/")) {
      return "Facebook Marketplace"
    }
  } catch {
    // invalid URL
  }

  return "Unknown"
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  const userId = getUserId(session)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const propertyIds: number[] = Array.isArray(body?.propertyIds)
    ? body.propertyIds.filter(
        (id: unknown): id is number => typeof id === "number" && Number.isInteger(id) && id > 0
      )
    : []

  if (propertyIds.length < 2) {
    return NextResponse.json(
      { error: "Please select at least 2 properties to compare." },
      { status: 400 }
    )
  }

  const rows: CompareListingRow[] = await db
    .select({
      id: mergedListings.id,
      title: mergedListings.title,
      price: mergedListings.price,
      acres: mergedListings.acres,
      address1: mergedListings.address1,
      city: mergedListings.city,
      county: mergedListings.county,
      stateAbbreviation: mergedListings.stateAbbreviation,
      listedDate: mergedListings.listedDate,
      latitude: mergedListings.latitude,
      longitude: mergedListings.longitude,
      propertyType: mergedListings.propertyType,
      propertyAmenities: mergedListings.propertyAmenities,
      description: mergedListings.description,
      url: mergedListings.url,
    })
    .from(favorites)
    .innerJoin(mergedListings, eq(favorites.landListingId, mergedListings.id))
    .where(
      and(
        eq(favorites.userId, userId),
        inArray(favorites.landListingId, propertyIds)
      )
    )

  const rowById = new Map<number, CompareListingRow>(rows.map((r) => [r.id, r]))
  const orderedRows: CompareListingRow[] = propertyIds
    .map((id) => rowById.get(id))
    .filter((r): r is CompareListingRow => r != null)

  const comparedProperties = await Promise.all(
    orderedRows.map(async (row, index) => {
      const price = toNumber(row.price)
      const acres = toNumber(row.acres)
      const pricePerAcre = price != null && acres != null && acres > 0 ? price / acres : null
      const amenities =
        row.propertyAmenities && typeof row.propertyAmenities === "object"
          ? Object.keys(row.propertyAmenities as Record<string, unknown>)
              .slice(0, 3)
              .join(", ")
          : ""
      const daysOnMarket = computeDaysOnMarket(row.listedDate)

      const descriptionText = descriptionToText(row.description)
      const inferredFeatures = await inferFeaturesFromDescriptionWithLlm(descriptionText)

      const photoFallback = "/placeholder.svg"

      return {
        id: row.id,
        name: row.title ?? `Property ${index + 1}`,
        url: row.url ?? null,
        latitude: toNumber(row.latitude),
        longitude: toNumber(row.longitude),
        image: photoFallback,
        price: price != null ? formatCurrency(price) : "N/A",
        pricePerAcre: pricePerAcre != null ? `${formatCurrency(pricePerAcre)}/ac` : "N/A",
        acreage: acres != null ? `${acres} acres` : "N/A",
        location:
          [row.address1?.trim(), row.county?.trim(), row.stateAbbreviation?.trim()]
            .filter(Boolean)
            .join(", ") || "N/A",
        roadAccess: inferredFeatures.roadAccess,
        floodZone: inferredFeatures.floodZone,
        utilities: inferredFeatures.utilities === "Not provided"
          ? amenities || "Not provided"
          : inferredFeatures.utilities,
        zoning: jsonbArrayFirst(row.propertyType) ?? "Not provided",
        aiMatchScore: Math.max(60, 92 - index * 4),
        source: inferListingSource(row.url),
        daysOnMarket: daysOnMarket != null ? `${daysOnMarket} days` : "N/A",
      }
    })
  )

  const summaryItems = orderedRows.map((row, index) => ({
    index: index + 1,
    title: row.title?.trim() || `Property ${index + 1}`,
    location: [row.county, row.city, row.stateAbbreviation].filter(Boolean).join(", "),
    description: descriptionToText(row.description),
  }))
  const aiSummary = await summarizeComparedListingsWithLlm(summaryItems)

  return NextResponse.json({
    ok: true,
    message: "Solid backend test words: compare API reached successfully.",
    comparedProperties,
    aiSummary,
  })
}
