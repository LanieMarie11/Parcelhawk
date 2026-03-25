import Link from "next/link"
import {
  Bell,
  CircleUserRound,
  EyeOff,
  Heart,
  type LucideIcon,
  Mail,
  RotateCw,
} from "lucide-react"

type DashboardItem = {
  label: string
  href: string
  icon: LucideIcon
}

const dashboardItems: DashboardItem[] = [
  { label: "Favorite", href: "/favorite", icon: Heart },
  { label: "Saved Searches", href: "/saved-search", icon: Bell },
  { label: "Viewed Listings", href: "/viewed-listings", icon: CircleUserRound },
  { label: "Edit Preferences", href: "/profile-settings", icon: Mail },
  { label: "Edit Locations", href: "/profile-settings", icon: RotateCw },
  { label: "Edit Profile", href: "/profile-settings", icon: EyeOff },
]

export default function BuyerDashboardPage() {
  return (
    <section className="w-full bg-background font-ibm-plex-sans">
      <div className="mx-auto max-w-6xl px-6 py-8 md:py-10">
        <h1 className="text-4xl font-semibold tracking-tight text-foreground">
          My Dashboard
        </h1>

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {dashboardItems.map((item) => {
            const Icon = item.icon

            return (
              <Link
                key={`${item.label}-${item.href}-${Icon.displayName ?? Icon.name}`}
                href={item.href}
                className="group flex h-[140px] items-center justify-center rounded-2xl border border-[#ececec] bg-[#f5f5f5] transition-colors hover:bg-[#efefef] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <div className="flex flex-col items-center justify-center gap-3">
                  <Icon className="h-9 w-9 text-[#79cdc2]" strokeWidth={1.6} />
                  <span className="text-2xl font-medium leading-none text-[#373940]">
                    {item.label}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}