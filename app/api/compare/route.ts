import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import type { Session } from "next-auth"
import { and, eq, inArray, type InferSelectModel } from "drizzle-orm"
import { db } from "@/db"
import { favorites, landListings } from "@/db/schema"
import { authOptions } from "@/lib/auth"
import { descriptionToText, inferFeaturesFromDescriptionWithLlm } from "@/lib/ai-compare"
import { summarizeComparedListingsWithLlm } from "@/lib/ai-description-summary"
import { fetchCenterSatelliteMapDataUrl } from "@/lib/parcel-aerial-map"

type LandListing = InferSelectModel<typeof landListings>
type CompareListingRow = Pick<
  LandListing,
  | "id"
  | "title"
  | "price"
  | "acres"
  | "city"
  | "county"
  | "stateAbbreviation"
  | "listingDate"
  | "latitude"
  | "longitude"
  | "photos"
  | "propertyType"
  | "propertyAmenities"
  | "brokerCompanyName"
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

function parseLatLon(value: unknown): number | null {
  if (value == null) return null
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  if (typeof value === "string") {
    const n = Number(value.replace(/[^0-9.-]/g, ""))
    return Number.isFinite(n) ? n : null
  }
  return null
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
      id: landListings.id,
      title: landListings.title,
      price: landListings.price,
      acres: landListings.acres,
      city: landListings.city,
      county: landListings.county,
      stateAbbreviation: landListings.stateAbbreviation,
      listingDate: landListings.listingDate,
      latitude: landListings.latitude,
      longitude: landListings.longitude,
      photos: landListings.photos,
      propertyType: landListings.propertyType,
      propertyAmenities: landListings.propertyAmenities,
      brokerCompanyName: landListings.brokerCompanyName,
      description: landListings.description,
      url: landListings.url,
    })
    .from(favorites)
    .innerJoin(landListings, eq(favorites.landListingId, landListings.id))
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

  const mapsApiKey = process.env.GOOGLE_MAPS_API_KEY?.trim()

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
      const daysOnMarket =
        row.listingDate != null
          ? Math.max(
              0,
              Math.floor(
                (Date.now() - new Date(row.listingDate).getTime()) /
                  (1000 * 60 * 60 * 24)
              )
            )
          : null

      const lat = parseLatLon(row.latitude)
      const lon = parseLatLon(row.longitude)
      const satellitePromise =
        mapsApiKey && lat != null && lon != null
          ? fetchCenterSatelliteMapDataUrl(lat, lon, mapsApiKey)
          : Promise.resolve(null as string | null)
      const descriptionText = descriptionToText(row.description)

      const [inferredFeatures, satelliteImage] = await Promise.all([
        inferFeaturesFromDescriptionWithLlm(descriptionText),
        satellitePromise,
      ])

      const photoFallback = row.photos?.[0] ?? "/placeholder.svg"

      return {
        id: row.id,
        name: row.title ?? `Property ${index + 1}`,
        url: row.url ?? null,
        image: satelliteImage ?? photoFallback,
        price: price != null ? formatCurrency(price) : "N/A",
        pricePerAcre: pricePerAcre != null ? `${formatCurrency(pricePerAcre)}/ac` : "N/A",
        acreage: acres != null ? `${acres} acres` : "N/A",
        location: [row.county, row.city, row.stateAbbreviation].filter(Boolean).join(", ") || "N/A",
        roadAccess: inferredFeatures.roadAccess,
        floodZone: inferredFeatures.floodZone,
        utilities: inferredFeatures.utilities === "Not provided"
          ? amenities || "Not provided"
          : inferredFeatures.utilities,
        zoning: row.propertyType?.[0] ?? "Not provided",
        aiMatchScore: Math.max(60, 92 - index * 4),
        source: row.brokerCompanyName || "Land listing source",
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
