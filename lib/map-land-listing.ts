import type { ListingItem } from "@/components/property-map-list"

function formatListedDate(raw: unknown): string | null {
  if (raw == null) return null
  if (typeof raw !== "string") return null
  const trimmed = raw.trim()
  if (!trimmed) return null

  const isoDateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed)
  const parsed = isoDateOnly
    ? new Date(
        Number(isoDateOnly[1]),
        Number(isoDateOnly[2]) - 1,
        Number(isoDateOnly[3]),
      )
    : new Date(trimmed.includes(" at ") ? trimmed.replace(" at ", " ") : trimmed)
  if (Number.isNaN(parsed.getTime())) return trimmed

  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(parsed)
}

function normalizeListingUpdatedAtIso(raw: unknown): string | null {
  if (raw == null) return null
  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime()) ? null : raw.toISOString()
  }
  if (typeof raw === "string" && raw.trim()) {
    const d = new Date(raw)
    return Number.isNaN(d.getTime()) ? null : d.toISOString()
  }
  return null
}

/** Normalize API / DB row (camelCase or snake_case) into map + card shape.*/
// LOCATION: location is the city, state, and zip code
export function mapLandListingRow(item: any): ListingItem {
  const city = item.city ?? null
  const stateAbbreviation = item.stateAbbreviation ?? item.state_abbreviation ?? null
  const stateName = item.stateName ?? item.state_name ?? null
  const zip = item.zip ?? null
  const address1 = item.address1 ?? null
  const locFallback =
    [city, stateAbbreviation || stateName].filter(Boolean).join(", ").trim() || null

  return {
    id: item.id,
    images: item.photos,
    category: item.propertyType?.[0],
    categoryColor: "#3b8a6e",
    name: item.title,
    price: item.price,
    address1,
    city,
    stateAbbreviation,
    stateName,
    zip,
    location: locFallback ?? "",
    acreage: item.acres,
    latitude: item.latitude != null ? Number(item.latitude) : null,
    longitude: item.longitude != null ? Number(item.longitude) : null,
    isFavorite: !!item.isFavorite,
    hasViewingRequest: !!item.hasViewingRequest,
    aiMatchingScore: item.aiMatchingScore ?? null,
    url: item.url,
    description: item.description,
    parcelSatelliteMapDataUrl: item.parcelSatelliteMapDataUrl ?? null,
    listedDate: formatListedDate(item.listedDate ?? item.listed_date),
    updatedAt: normalizeListingUpdatedAtIso(item.updatedAt ?? item.updated_at),
  }
}
