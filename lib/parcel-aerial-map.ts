/**
 * Google Maps Static API: satellite imagery centered on listing coordinates.
 * No parcel boundary overlay. By default the map is only centered on the listing
 * coordinates (no path, no marker). Pass `showCenterMarker: true` if you want a pin.
 *
 * Auth: `GOOGLE_MAPS_API_KEY` (Maps Platform API key).
 *
 * @see https://developers.google.com/maps/documentation/maps-static/overview
 */

const STATIC_MAP_BASE = "https://maps.googleapis.com/maps/api/staticmap";

export function buildCenterSatelliteStaticMapUrl(opts: {
  centerLat: number
  centerLng: number
  width: number
  height: number
  apiKey: string
  zoom?: string
  /** When true, adds a marker at the center. Default false: satellite only, viewport anchored on the point. */
  showCenterMarker?: boolean
}): string {
  const u = new URL(STATIC_MAP_BASE)
  u.searchParams.set("center", `${opts.centerLat},${opts.centerLng}`)
  u.searchParams.set("zoom", opts.zoom ?? "16")
  u.searchParams.set("size", `${opts.width}x${opts.height}`)
  u.searchParams.set("maptype", "satellite")
  u.searchParams.set("scale", "2")
  u.searchParams.set("key", opts.apiKey)
  if (opts.showCenterMarker) {
    u.searchParams.set("markers", `scale:2|color:0xE53935|${opts.centerLat},${opts.centerLng}`)
  }
  return u.toString()
}

/**
 * Fetches a PNG from Static Maps and returns a data URL for `<img src>` (server-side).
 */
export async function fetchCenterSatelliteMapDataUrl(
  centerLat: number,
  centerLng: number,
  apiKey: string
): Promise<string | null> {
  const url = buildCenterSatelliteStaticMapUrl({
    centerLat,
    centerLng,
    width: 600,
    height: 384,
    apiKey,
    zoom: "16",
    showCenterMarker: true,
  })

  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) return null
  const ct = res.headers.get("content-type") ?? "image/png"
  const buf = Buffer.from(await res.arrayBuffer())
  const b64 = buf.toString("base64")
  return `data:${ct};base64,${b64}`
}
