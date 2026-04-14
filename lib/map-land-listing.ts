import type { ListingItem } from "@/components/property-map-list"

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
    aiMatchingScore: item.aiMatchingScore ?? null,
    url: item.url,
    description: item.description,
    parcelSatelliteMapDataUrl: item.parcelSatelliteMapDataUrl ?? null,
  }
}
