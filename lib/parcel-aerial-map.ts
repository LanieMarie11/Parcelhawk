/**
 * Google Maps Static API: satellite imagery with a parcel boundary overlay.
 *
 * Auth: Static Maps expects a **Maps Platform API key** (`GOOGLE_MAPS_API_KEY`), not a
 * service account JSON. `GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY` is for other GCP APIs.
 *
 * @see https://developers.google.com/maps/documentation/maps-static/overview
 */

const STATIC_MAP_BASE = "https://maps.googleapis.com/maps/api/staticmap";

export type GeoJsonPosition = [number, number];

function isFeatureCollection(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && (x as { type?: string }).type === "FeatureCollection";
}

/**
 * First Polygon / MultiPolygon exterior ring from Regrid `parcels` GeoJSON (coordinates are [lng, lat]).
 */
export function extractFirstPolygonExteriorRingLngLat(
  featureCollection: Record<string, unknown>
): GeoJsonPosition[] | null {
  const features = featureCollection.features;
  if (!Array.isArray(features) || features.length === 0) return null;

  for (const raw of features) {
    if (!raw || typeof raw !== "object") continue;
    const geom = (raw as { geometry?: unknown }).geometry;
    if (!geom || typeof geom !== "object") continue;
    const g = geom as { type?: string; coordinates?: unknown };

    if (g.type === "Polygon" && Array.isArray(g.coordinates)) {
      const outer = g.coordinates[0] as unknown;
      const ring = normalizeRing(outer);
      if (ring && ring.length >= 3) return ring;
    }
    if (g.type === "MultiPolygon" && Array.isArray(g.coordinates)) {
      const first = g.coordinates[0] as unknown;
      if (Array.isArray(first)) {
        const outer = first[0];
        const ring = normalizeRing(outer);
        if (ring && ring.length >= 3) return ring;
      }
    }
  }
  return null;
}

function normalizeRing(outer: unknown): GeoJsonPosition[] | null {
  if (!Array.isArray(outer) || outer.length < 3) return null;
  const out: GeoJsonPosition[] = [];
  for (const p of outer) {
    if (!Array.isArray(p) || p.length < 2) continue;
    const lng = Number(p[0]);
    const lat = Number(p[1]);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    out.push([lng, lat]);
  }
  return out.length >= 3 ? out : null;
}

/** Evenly sample vertices so Static Maps URL stays under limits. */
export function sampleRingLngLat(ring: GeoJsonPosition[], maxVertices: number): GeoJsonPosition[] {
  if (ring.length <= maxVertices) return ring;
  const step = Math.ceil(ring.length / maxVertices);
  const sampled: GeoJsonPosition[] = [];
  for (let i = 0; i < ring.length; i += step) sampled.push(ring[i]!);
  const first = ring[0]!;
  const last = sampled[sampled.length - 1]!;
  if (first[0] !== last[0] || first[1] !== last[1]) sampled.push(first);
  return sampled;
}

/** Static Maps `path`: lat,lng|lat,lng (closed ring). */
export function ringLngLatToStaticMapPathSegment(ring: GeoJsonPosition[]): string {
  const parts: string[] = [];
  for (const [lng, lat] of ring) {
    parts.push(`${lat},${lng}`);
  }
  if (ring.length > 0) {
    const [fLng, fLat] = ring[0]!;
    const [lLng, lLat] = ring[ring.length - 1]!;
    if (fLng !== lLng || fLat !== lLat) {
      parts.push(`${fLat},${fLng}`);
    }
  }
  return parts.join("|");
}

export function buildStaticMapSatelliteUrl(opts: {
  centerLat: number;
  centerLng: number;
  pathLatLngPipe: string | null;
  width: number;
  height: number;
  apiKey: string;
  zoom?: string;
}): string {
  const u = new URL(STATIC_MAP_BASE);
  u.searchParams.set("center", `${opts.centerLat},${opts.centerLng}`);
  u.searchParams.set("zoom", opts.zoom ?? "16");
  u.searchParams.set("size", `${opts.width}x${opts.height}`);
  u.searchParams.set("maptype", "satellite");
  u.searchParams.set("scale", "2");
  u.searchParams.set("key", opts.apiKey);
  if (opts.pathLatLngPipe) {
    u.searchParams.set(
      "path",
      `color:0x00FF00FF|weight:3|fillcolor:0x00FF0033|${opts.pathLatLngPipe}`
    );
  }
  return u.toString();
}

const MAX_PATH_CHARS = 7200;
const MAX_VERTICES_START = 48;

/**
 * Fetches a PNG from Static Maps and returns a data URL for `<img src>` (server-side only; keep off public logs).
 */
export async function fetchParcelSatelliteMapDataUrl(
  regridParcels: unknown,
  centerLat: number,
  centerLng: number,
  apiKey: string
): Promise<string | null> {
  if (!isFeatureCollection(regridParcels)) return null;

  let ring = extractFirstPolygonExteriorRingLngLat(regridParcels);
  if (!ring) return null;

  let maxV = MAX_VERTICES_START;
  let url = "";
  for (let attempt = 0; attempt < 4; attempt++) {
    const sampled = sampleRingLngLat(ring, maxV);
    const pathSeg = ringLngLatToStaticMapPathSegment(sampled);
    url = buildStaticMapSatelliteUrl({
      centerLat,
      centerLng,
      pathLatLngPipe: pathSeg,
      width: 400,
      height: 240,
      apiKey,
    });
    if (url.length <= MAX_PATH_CHARS) break;
    maxV = Math.max(12, Math.floor(maxV / 2));
  }
  if (url.length > 8190) return null;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  const ct = res.headers.get("content-type") ?? "image/png";
  const buf = Buffer.from(await res.arrayBuffer());
  const b64 = buf.toString("base64");
  return `data:${ct};base64,${b64}`;
}
