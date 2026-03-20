"use client"

import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  type GoogleMapProps,
} from "@react-google-maps/api"
import { useMemo } from "react"

const DEFAULT_CENTER = { lat: 39.8283, lng: -98.5795 } // US center
const DEFAULT_ZOOM = 4

export type ListingMapItem = {
  id: number | string
  latitude?: number | null
  longitude?: number | null
  name?: string
  price?: string | number
  location?: string
}

const containerStyle = {
  width: "100%",
  height: "100%",
}

type MarketplaceMapProps = {
  listings: ListingMapItem[]
  /** Optional: control selected listing to center or highlight */
  selectedId?: number | string | null
  className?: string
  mapOptions?: GoogleMapProps["options"]
}

export function MarketplaceMap({
  listings,
  selectedId,
  className = "",
  mapOptions,
}: MarketplaceMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: apiKey ?? "",
    libraries: ["maps", "places"],
    language: "en",
    preventGoogleFontsLoading: true,
  })

  const markersWithCoords = useMemo(
    () =>
      listings.filter(
        (l): l is ListingMapItem & { latitude: number; longitude: number } =>
          l.latitude != null &&
          l.longitude != null &&
          Number.isFinite(l.latitude) &&
          Number.isFinite(l.longitude)
      ),
    [listings]
  )

  const options = useMemo<GoogleMapProps["options"]>(
    () => ({
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: true,
      scaleControl: true,
      streetViewControl: false,
      fullscreenControl: true,
      ...mapOptions,
    }),
    [mapOptions]
  )

  const makePinSvgDataUrl = (fillColor: string) => {
    // "Classic pin" SVG (data URL) so we can change fill color on hover.
    // This mimics a location-marker silhouette rather than a simple circle.
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
        <path
          d="M32 3C20.4 3 11 12.4 11 24c0 16.7 21 37 21 37s21-20.3 21-37c0-11.6-9.4-21-21-21z"
          fill="${fillColor}"
          stroke="#ffffff"
          stroke-width="4"
          stroke-linejoin="round"
        />
        <circle cx="32" cy="26" r="12" fill="#ffffff" opacity="0.92"/>
        <circle cx="32" cy="26" r="7" fill="${fillColor}"/>
      </svg>
    `.trim()

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
  }

  const defaultMarkerIcon = useMemo<google.maps.Icon | undefined>(() => {
    if (!isLoaded) return undefined
    const url = makePinSvgDataUrl("#04C0AF")
    return {
      url,
      // Size + anchor so the "tip" points at the coordinate.
      scaledSize: new google.maps.Size(38, 38),
      anchor: new google.maps.Point(19, 38),
    }
  }, [isLoaded])

  const highlightedMarkerIcon = useMemo<google.maps.Icon | undefined>(() => {
    if (!isLoaded) return undefined
    const url = makePinSvgDataUrl("#FF6B35")
    return {
      url,
      scaledSize: new google.maps.Size(42, 42),
      anchor: new google.maps.Point(21, 42),
    }
  }, [isLoaded])

  if (!apiKey) {
    return (
      <div
        className={`flex items-center justify-center bg-muted/30 text-muted-foreground ${className}`}
        style={containerStyle}
      >
        <p className="text-center text-sm">
          Add <code className="rounded bg-muted px-1">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to
          .env.local to show the map.
        </p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div
        className={`flex items-center justify-center bg-muted/30 text-destructive ${className}`}
        style={containerStyle}
      >
        <p className="text-center text-sm">Failed to load Google Maps.</p>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div
        className={`flex items-center justify-center bg-muted/30 text-muted-foreground ${className}`}
        style={containerStyle}
      >
        <p className="text-center text-sm">Loading map…</p>
      </div>
    )
  }

  return (
    <div className={`overflow-hidden ${className}`} style={containerStyle}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        options={options}
        onLoad={(map) => {
          if (markersWithCoords.length === 0) return
          const bounds = new google.maps.LatLngBounds()
          markersWithCoords.forEach((l) => {
            bounds.extend({ lat: l.latitude!, lng: l.longitude! })
          })
          map.fitBounds(bounds, { top: 24, right: 24, bottom: 24, left: 24 })
        }}
      >
        {markersWithCoords.map((listing) => (
          <Marker
            key={`${listing.id}-${selectedId != null && String(selectedId) === String(listing.id) ? "h" : "d"}`}
            position={{ lat: listing.latitude!, lng: listing.longitude! }}
            title={[listing.name, listing.price].filter(Boolean).join(" — ") || undefined}
            icon={selectedId != null && String(selectedId) === String(listing.id) ? highlightedMarkerIcon : defaultMarkerIcon}
            zIndex={selectedId != null && String(selectedId) === String(listing.id) ? 999 : undefined}
          />
        ))}
      </GoogleMap>
    </div>
  )
}
