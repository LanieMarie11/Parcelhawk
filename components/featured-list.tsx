"use client"

import { useState, useEffect } from "react"
import { ArrowUpRight } from "lucide-react"
import { PropertyCard } from "./property-card"
import { mapLandListingRow } from "@/lib/map-land-listing"

// TODO: Remove this once the API is implemented
const listings = [
  { id: 1, images: ["/images/property-1.png"], category: "Recreational", categoryColor: "#3b8a6e", name: "Whispering Pines Estate", price: "$450,000", location: "Asheville, NC", acreage: "12.5 Acres" },
  { id: 2, images: ["/images/property-2.png"], category: "Acreage", categoryColor: "#5a7d5a", name: "Whispering Pines Estate", price: "$450,000", location: "Asheville, NC", acreage: "12.5 Acres" },
  { id: 3, images: ["/images/property-3.png"], category: "Investment", categoryColor: "#c77c32", name: "Whispering Pines Estate", price: "$450,000", location: "Asheville, NC", acreage: "12.5 Acres" },
  { id: 4, images: ["/images/property-4.png"], category: "Farm", categoryColor: "#6b7b6b", name: "Whispering Pines Estate", price: "$450,000", location: "Asheville, NC", acreage: "12.5 Acres" },
]

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function parseJsonSafe<T>(res: Response): Promise<T> {
  const contentType = res.headers.get("content-type") ?? "";
  if (!res.ok || !contentType.includes("application/json")) {
    return Promise.resolve([] as T);
  }
  return res.json();
}

export function FeaturedListings() {
  const [listingsData, setListingsData] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`${getBaseUrl()}/api/land-property`);
        const raw = await parseJsonSafe<any[]>(res);
        if (cancelled || !Array.isArray(raw)) return;
        const mapped = raw.map((listing: any) =>
          mapLandListingRow({ ...listing, photos: listing.photos ?? [] }),
        );
        setListingsData(mapped);
      } catch {
        if (!cancelled) setListingsData(listings);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // console.log("listingsData", listingsData);

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center font-ibm-plex-sans">
        <h2 className="text-3xl font-medium font-phudu uppercase tracking-wide text-foreground sm:text-4xl lg:text-5xl text-balance">
          Featured Listings
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Hand-Picked Properties That Offer Exceptional Value And Natural
          Beauty.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 font-ibm-plex-sans gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {listingsData.map((listing: any) => (
          <PropertyCard
            key={listing.id}
            id={listing.id as number}
            images={listing.images}
            category={listing.category ?? ""}
            categoryColor={listing.categoryColor ?? "#6b7b6b"}
            name={listing.name}
            price={listing.price}
            location={listing.location ?? ""}
            address1={listing.address1}
            city={listing.city}
            stateAbbreviation={listing.stateAbbreviation}
            stateName={listing.stateName}
            zip={listing.zip}
            acreage={listing.acreage}
            initialIsFavorite={listing.isFavorite}
            detailUrl={listing.url ?? undefined}
            description={listing.description}
          />
        ))}
      </div>

      <div className="mt-12 flex justify-center">
        <a
          href="#"
          className="inline-flex items-center font-ibm-plex-sans gap-2 rounded-md border border-border px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          View all listings
          <ArrowUpRight className="h-4 w-4" />
        </a>
      </div>
    </section>
  )
}
