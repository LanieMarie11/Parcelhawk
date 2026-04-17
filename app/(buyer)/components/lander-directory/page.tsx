import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

type LenderEntry = {
  id: string
  badge: string
  name: string
  description: string
  href: string
}

const LENDERS: LenderEntry[] = [
  {
    id: "1",
    badge: "Land Loan Specialist",
    name: "Summit Ridge Capital",
    description:
      "Financing for recreational and investment parcels, with clear guidance on surveys, access, and closing timelines for vacant land.",
    href: "#lender-1",
  },
  {
    id: "2",
    badge: "Agricultural Lender",
    name: "Prairie Trust & Credit",
    description:
      "Loans tailored to farms, ranches, and timberland, including operating lines and long-term mortgages secured by rural acreage.",
    href: "#lender-2",
  },
  {
    id: "3",
    badge: "Land Loan Specialist",
    name: "Clearwater Lending Group",
    description:
      "Raw land and lot loans with flexible terms, so you can buy now and build later while keeping payments aligned with your plans.",
    href: "#lender-3",
  },
  {
    id: "4",
    badge: "Agricultural Lender",
    name: "Heritage Field Finance",
    description:
      "Specialists in soil, water, and conservation easements, helping borrowers structure debt around seasonal income and crop cycles.",
    href: "#lender-4",
  },
]

function LenderDirectoryIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {/* House + handshake line art */}
      <path
        d="M60 10L88 34V58H32V34L60 10Z"
        stroke="currentColor"
        strokeWidth={2.2}
        strokeLinejoin="round"
      />
      <path d="M38 58V72H82V58" stroke="currentColor" strokeWidth={2.2} strokeLinejoin="round" />
      <rect x="46" y="42" width="10" height="10" rx="1" stroke="currentColor" strokeWidth={2} />
      <rect x="64" y="42" width="10" height="10" rx="1" stroke="currentColor" strokeWidth={2} />
      <path d="M54 72V62H66V72" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" />
      {/* Handshake below */}
      <path
        d="M12 88c8-14 22-22 36-18 4 1 8 4 10 8"
        stroke="currentColor"
        strokeWidth={2.2}
        strokeLinecap="round"
      />
      <path
        d="M108 88c-8-14-22-22-36-18-4 1-8 4-10 8"
        stroke="currentColor"
        strokeWidth={2.2}
        strokeLinecap="round"
      />
      <path
        d="M48 78c6-4 14-4 24 0"
        stroke="currentColor"
        strokeWidth={2.2}
        strokeLinecap="round"
      />
    </svg>
  )
}

function LenderCard({ lender }: { lender: LenderEntry }) {
  return (
    <article
      id={lender.id}
      className="flex flex-col overflow-hidden rounded-xl border border-border bg-[#F5F6F8] shadow-sm"
    >
      <div className="relative rounded-t-xl bg-[#1F232B] px-4 pb-10 pt-12">
        <span className="absolute left-3 top-3 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-white backdrop-blur-sm sm:text-xs">
          {lender.badge}
        </span>
        <div className="flex justify-center text-[#CFBA7A]">
          <LenderDirectoryIcon className="h-[88px] w-[100px]" />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <h2 className="text-lg font-semibold leading-snug text-foreground">{lender.name}</h2>
        <p className="line-clamp-3 flex-1 text-sm leading-relaxed text-[#373940]">{lender.description}</p>
        <Link
          href={lender.href}
          className="inline-flex items-center gap-1 text-sm font-medium text-[#04C0AF] transition-colors hover:text-[#3dbdb5]"
        >
          Learn more
          <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden />
        </Link>
      </div>
    </article>
  )
}

export default function LenderDirectoryPage() {
  return (
    <div className="w-full bg-background px-4 py-10 font-ibm-plex-sans sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1480px]">
        <h2 className="mb-10 text-center font-phudu text-4xl font-medium uppercase tracking-wide text-foreground sm:text-3xl">
          LENDER DIRECTORY
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {LENDERS.map((lender) => (
            <LenderCard key={lender.id} lender={lender} />
          ))}
        </div>
      </div>
    </div>
  )
}
