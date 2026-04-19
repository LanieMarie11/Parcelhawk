import Image from "next/image"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

type BuyingGuide = {
  id: string
  title: string
  description: string
  href: string
  imageSrc: string
  imageAlt: string
  imageBadge?: string
}

const BUYING_GUIDES: BuyingGuide[] = [
  {
    id: "first-time",
    title: "How to buy land for the first time",
    description:
      "Learn the basics of due diligence, working with agents, and what to verify before you make an offer on vacant land.",
    href: "#first-time",
    imageSrc: "/images/Land-Type-Images/Lakefront-Property.png",
    imageAlt: "Scenic lake and shoreline",
  },
  {
    id: "road-access",
    title: "Understanding road access",
    description:
      "Easements, public roads, and legal access can make or break a parcel. Here is how to read listings and title commitments with confidence.",
    href: "#road-access",
    imageSrc: "/images/Land-Type-Images/Lakefront-Property.png",
    imageAlt: "Rural road leading to open land",
    // imageBadge: "UX",
  },
  {
    id: "flood-zones",
    title: "Flood zones explained",
    description:
      "FEMA maps, insurance requirements, and buildability rules—simplified so you can compare parcels without surprises after closing.",
    href: "#flood-zones",
    imageSrc: "/images/Land-Type-Images/Lakefront-Property.png",
    imageAlt: "Wetland and open terrain",
  },
  {
    id: "finance",
    title: "How to finance raw land",
    description:
      "Land loans differ from home mortgages. Compare lender options, typical down payments, and how to strengthen your application.",
    href: "#finance",
    imageSrc: "/images/Land-Type-Images/Lakefront-Property.png",
    imageAlt: "Open acreage at sunset",
  },
]

function BuyingGuideCard({ guide }: { guide: BuyingGuide }) {
  return (
    <article
      id={guide.id}
      className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
    >
      <div className="relative aspect-16/10 w-full bg-muted">
        <Image
          src={guide.imageSrc}
          alt={guide.imageAlt}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />
        {guide.imageBadge ? (
          <span className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-black text-xs font-semibold text-white">
            {guide.imageBadge}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <h2 className="text-lg font-medium font-ibm-plex-sans leading-snug text-foreground">{guide.title}</h2>
        <p className="line-clamp-4 flex-1 text-sm font-ibm-plex-sans leading-relaxed text-[#373940]">
          {guide.description}
        </p>
        <Link
          href={guide.href}
          className="inline-flex items-center gap-1 text-sm font-medium text-[#04C0AF] transition-colors hover:text-[#3dbdb5]"
        >
          Read more
          <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden />
        </Link>
      </div>
    </article>
  )
}

export default function BuyingGuidePage() {
  return (
    <div className="w-full bg-background px-4 py-10 font-ibm-plex-sans sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1480px]">
        <h1 className="mb-10 text-center font-phudu text-4xl font-medium uppercase tracking-wide text-foreground sm:text-3xl">
          BUYING GUIDES
        </h1>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {BUYING_GUIDES.map((guide) => (
            <BuyingGuideCard key={guide.id} guide={guide} />
          ))}
        </div>
      </div>
    </div>
  )
}
