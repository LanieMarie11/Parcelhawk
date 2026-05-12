import { buildCenterSatelliteStaticMapUrl } from "@/lib/parcel-aerial-map"

/** Any object that may carry listing coordinates (API / DB often use string or number). */
export type LatLonFields = {
  latitude?: unknown
  longitude?: unknown
}

export type ListingWithSatelliteFallback = LatLonFields & {
  parcelSatelliteMapDataUrl?: string | null
}

/**
 * Parses a single coordinate from listing JSON (number, numeric string, or null).
 */
export function parseListingLatLon(value: unknown): number | null {
  if (value == null) return null
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  if (typeof value === "string") {
    const n = Number(value.replace(/[^0-9.-]/g, ""))
    return Number.isFinite(n) ? n : null
  }
  return null
}

export type ParcelSatellitePreviewOptions = {
  /** Defaults to `process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`. */
  apiKey?: string
  width?: number
  height?: number
  zoom?: string
  showCenterMarker?: boolean
}

/**
 * Builds a Google Static Maps (satellite) HTTPS URL for use in `<img src>` on the client.
 * Requires `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (or `apiKey` in options). Returns `undefined` if
 * coordinates or key are missing.
 */
export function buildParcelSatelliteStaticMapPreviewUrl(
  input: LatLonFields,
  options?: ParcelSatellitePreviewOptions
): string | undefined {
  const apiKey = (options?.apiKey ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)?.trim()
  if (!apiKey) return undefined
  const lat = parseListingLatLon(input.latitude)
  const lng = parseListingLatLon(input.longitude)
  if (lat == null || lng == null) return undefined
  const width = options?.width ?? 600
  const height = options?.height ?? 384
  return buildCenterSatelliteStaticMapUrl({
    centerLat: lat,
    centerLng: lng,
    width,
    height,
    apiKey,
    zoom: options?.zoom ?? "16",
    showCenterMarker: options?.showCenterMarker ?? true,
  })
}

/**
 * Client-built Static Maps URL from coordinates, else optional server-provided URL/data URL
 * (e.g. favorites API).
 */
export function resolveListingSatellitePreviewUrl(
  listing: ListingWithSatelliteFallback,
  options?: ParcelSatellitePreviewOptions
): string | undefined {
  const built = buildParcelSatelliteStaticMapPreviewUrl(listing, options)
  if (built) return built
  const fallback = listing.parcelSatelliteMapDataUrl
  if (fallback == null || String(fallback).trim() === "") return undefined
  return fallback
}
