import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import type { Session } from "next-auth"
import { and, eq, inArray } from "drizzle-orm"
import { db } from "@/db"
import { favorites, landListings } from "@/db/schema"
import { authOptions } from "@/lib/auth"

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

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  const userId = getUserId(session)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const propertyIds = Array.isArray(body?.propertyIds)
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

  const rows = await db
    .select({
      id: landListings.id,
      title: landListings.title,
      price: landListings.price,
      acres: landListings.acres,
      city: landListings.city,
      county: landListings.county,
      stateAbbreviation: landListings.stateAbbreviation,
      listingDate: landListings.listingDate,
      photos: landListings.photos,
      propertyType: landListings.propertyType,
      propertyAmenities: landListings.propertyAmenities,
      brokerCompanyName: landListings.brokerCompanyName,
    })
    .from(favorites)
    .innerJoin(landListings, eq(favorites.landListingId, landListings.id))
    .where(
      and(
        eq(favorites.userId, userId),
        inArray(favorites.landListingId, propertyIds)
      )
    )

  const comparedProperties = rows.map((row, index) => {
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

    return {
      id: row.id,
      name: row.title ?? `Property ${index + 1}`,
      image: row.photos?.[0] ?? "/placeholder.svg",
      price: price != null ? formatCurrency(price) : "N/A",
      pricePerAcre: pricePerAcre != null ? `${formatCurrency(pricePerAcre)}/ac` : "N/A",
      acreage: acres != null ? `${acres} acres` : "N/A",
      location: [row.county, row.city, row.stateAbbreviation].filter(Boolean).join(", ") || "N/A",
      roadAccess: "Not provided",
      floodZone: "Not provided",
      utilities: amenities || "Not provided",
      zoning: row.propertyType?.[0] ?? "Not provided",
      aiMatchScore: Math.max(60, 92 - index * 4),
      source: row.brokerCompanyName || "Land listing source",
      daysOnMarket: daysOnMarket != null ? `${daysOnMarket} days` : "N/A",
    }
  })

  return NextResponse.json({
    ok: true,
    message: "Solid backend test words: compare API reached successfully.",
    comparedProperties,
  })
}
