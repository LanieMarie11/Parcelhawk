"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"

const TABS = ["Environmental", "Government", "Mapping", "Legal"] as const
type HelpfulTab = (typeof TABS)[number]

type HelpfulLinkCard = {
  id: string
  category: HelpfulTab
  title: string
  description: string
  imageSrc: string
  imageAlt: string
  href: string
}

const HELPFUL_LINK_CARDS: HelpfulLinkCard[] = [
  {
    id: "env-1",
    category: "Environmental",
    title: "Green Future Properties",
    description:
      "Explore listings and programs that emphasize renewable energy, open space, and low-impact development on rural land.",
    imageSrc: "/images/Land-Type-Images/Recreational-Property.png",
    imageAlt: "Open land with space for wind and solar projects",
    href: "#green-future",
  },
  {
    id: "env-2",
    category: "Environmental",
    title: "Sustainable Living",
    description:
      "Resources for buyers who want conservation-minded design, native landscaping, and efficient use of water and soil.",
    imageSrc: "/images/Land-Type-Images/Undeveloped-Land.png",
    imageAlt: "Natural undeveloped landscape",
    href: "#sustainable-living",
  },
  {
    id: "env-3",
    category: "Environmental",
    title: "Eco-Friendly Land",
    description:
      "Learn how wetlands, floodplains, and agricultural buffers affect what you can build and how to plan around them.",
    imageSrc: "/images/Land-Type-Images/Farms.png",
    imageAlt: "Green fields and rural waterways",
    href: "#eco-friendly",
  },
  {
    id: "env-4",
    category: "Environmental",
    title: "Nature-Friendly Land",
    description:
      "Guidance on wildlife corridors, tree retention, and stewardship so your parcel supports healthy ecosystems long term.",
    imageSrc: "/images/Land-Type-Images/Timberland.png",
    imageAlt: "Forested rolling hills",
    href: "#nature-friendly",
  },
  {
    id: "gov-1",
    category: "Government",
    title: "USDA Rural Programs",
    description:
      "Overview of farm service agencies, conservation reserve options, and where to start when you need federal program details.",
    imageSrc: "/images/Land-Type-Images/Farms.png",
    imageAlt: "Rural farmland",
    href: "#usda",
  },
  {
    id: "gov-2",
    category: "Government",
    title: "County Planning & Zoning",
    description:
      "How to find your local planning office, read zoning maps, and submit questions before you commit to a parcel.",
    imageSrc: "/images/Land-Type-Images/Residential-Property.png",
    imageAlt: "Planned residential and mixed rural land",
    href: "#county-planning",
  },
  {
    id: "gov-3",
    category: "Government",
    title: "State Environmental Agencies",
    description:
      "Permits, water rights, and environmental review portals vary by state—links to common starting points and glossaries.",
    imageSrc: "/images/Land-Type-Images/Riverfront-Property.png",
    imageAlt: "River and regulated shoreline",
    href: "#state-agencies",
  },
  {
    id: "gov-4",
    category: "Government",
    title: "Public Land Records",
    description:
      "Assessor data, tax parcels, and recorded documents: what each system shows and how to cross-check legal descriptions.",
    imageSrc: "/images/Land-Type-Images/Commercial-Property.png",
    imageAlt: "Aerial view style land use",
    href: "#public-records",
  },
  {
    id: "map-1",
    category: "Mapping",
    title: "Flood Hazard Maps",
    description:
      "Use official flood layers to compare listings, understand insurance triggers, and spot map revisions in progress.",
    imageSrc: "/images/Land-Type-Images/Lakefront-Property.png",
    imageAlt: "Lakefront and flood-prone terrain",
    href: "#flood-maps",
  },
  {
    id: "map-2",
    category: "Mapping",
    title: "Topo & Elevation Tools",
    description:
      "Slope, drainage, and viewshed tools help you interpret terrain before you walk the property or hire a surveyor.",
    imageSrc: "/images/Land-Type-Images/Hunting-Land.png",
    imageAlt: "Varied terrain and tree cover",
    href: "#topo",
  },
  {
    id: "map-3",
    category: "Mapping",
    title: "Parcel & GIS Portals",
    description:
      "County GIS viewers layer boundaries, zoning, utilities, and aerials—learn which toggles matter for land buyers.",
    imageSrc: "/images/Land-Type-Images/Ranches.png",
    imageAlt: "Large parcel aerial context",
    href: "#gis",
  },
  {
    id: "map-4",
    category: "Mapping",
    title: "Aerial Imagery Sources",
    description:
      "Compare freshness and resolution across free and paid imagery so you can spot roads, clearings, and encroachments.",
    imageSrc: "/images/Land-Type-Images/Beachfront-Property.png",
    imageAlt: "Coastal land from above",
    href: "#aerial",
  },
  {
    id: "leg-1",
    category: "Legal",
    title: "Easements Explained",
    description:
      "Ingress, utility, conservation, and prescriptive easements: how they appear in title work and what questions to ask.",
    imageSrc: "/images/Land-Type-Images/Undeveloped-Land.png",
    imageAlt: "Land access and boundaries concept",
    href: "#easements",
  },
  {
    id: "leg-2",
    category: "Legal",
    title: "Title Insurance Basics",
    description:
      "Why owner’s policies differ for vacant land, common exclusions, and how endorsements can cover access and survey gaps.",
    imageSrc: "/images/Land-Type-Images/Residential-Property.png",
    imageAlt: "Residential land transition",
    href: "#title",
  },
  {
    id: "leg-3",
    category: "Legal",
    title: "Zoning & Land Use",
    description:
      "From agricultural districts to estate lots, learn how zoning codes interact with septic, setbacks, and home businesses.",
    imageSrc: "/images/Land-Type-Images/Commercial-Property.png",
    imageAlt: "Zoned land use variety",
    href: "#zoning",
  },
  {
    id: "leg-4",
    category: "Legal",
    title: "Surveys & Boundaries",
    description:
      "When you need a boundary survey, how metes and bounds differ from lot-and-block, and how pins align with deeds.",
    imageSrc: "/images/Land-Type-Images/Timberland.png",
    imageAlt: "Survey lines through wooded land",
    href: "#surveys",
  },
]

function HelpfulLinkCard({ card }: { card: HelpfulLinkCard }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <Link href={card.href} className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4D3E] focus-visible:ring-offset-2">
        <div className="relative aspect-16/10 w-full overflow-hidden rounded-t-xl bg-muted">
          <Image
            src={card.imageSrc}
            alt={card.imageAlt}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        </div>
        <div className="flex flex-col gap-2 p-5">
          <h3 className="text-lg font-semibold leading-snug text-foreground group-hover:underline">{card.title}</h3>
          <p className="line-clamp-4 text-sm leading-relaxed text-[#373940]">{card.description}</p>
        </div>
      </Link>
    </article>
  )
}

export default function HelpfulLinksPage() {
  const [activeTab, setActiveTab] = useState<HelpfulTab>("Environmental")

  const visibleCards = HELPFUL_LINK_CARDS.filter((c) => c.category === activeTab)

  return (
    <div className="w-full bg-background px-4 py-10 font-ibm-plex-sans sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1480px]">
        <h2 className="mb-8 text-center font-phudu text-4xl font-medium uppercase tracking-wide text-foreground sm:text-3xl">
          HELPFUL LINKS
        </h2>

        <div className="mb-10 flex flex-wrap justify-center gap-3">
          {TABS.map((tab) => {
            const isActive = tab === activeTab
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-transparent bg-[#1B4D3E] text-white"
                    : "border-border bg-white text-foreground hover:bg-muted/60"
                }`}
              >
                {tab}
              </button>
            )
          })}
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {visibleCards.map((card) => (
            <HelpfulLinkCard key={card.id} card={card} />
          ))}
        </div>
      </div>
    </div>
  )
}
