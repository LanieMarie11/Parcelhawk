"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Bell, Home, LineChart } from "lucide-react";
import ParcelLogo from "@/public/images/parcel.png";

type NavItem = {
  href: string;
  label: string;
  badge?: number;
};

const navItems: readonly NavItem[] = [
  { href: "/realtor-portal", label: "Overview" },
  { href: "/realtor-portal/my-buyers", label: "My buyers" },
  { href: "/realtor-portal/buyer-intel", label: "Buyer intel" },
  { href: "/realtor-portal/curated-parcels", label: "Curated parcels" },
  { href: "/realtor-portal/analytics", label: "Analytics" },
  { href: "/realtor-portal/messages", label: "Messages"},
  { href: "/realtor-portal/invite-links", label: "Invite links" },
  { href: "/realtor-portal/settings", label: "Settings" },
];

type PortalMode = "realtor" | "investor";

type InvestorHeaderProps = {
  /** Which tab is visually selected in the Realtor / Investor switch. */
  activeMode?: PortalMode;
};

export function InvestorHeader({ activeMode = "investor" }: InvestorHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();

  const user = session?.user as
    | { firstName?: string; lastName?: string; name?: string; image?: string | null }
    | undefined;
  const initials =
    user?.firstName?.trim() && user?.lastName?.trim()
      ? `${user.firstName.trim()[0]}${user.lastName.trim()[0]}`.toUpperCase()
      : (user?.name?.slice(0, 2).toUpperCase() ?? "?");

  return (
    <header className="fixed left-0 right-0 top-0 z-50 w-full border-b border-white/10 bg-[#0B1D31] px-4 py-4 font-sans md:px-10">
      <nav className="mx-auto flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <Link
          href="/realtor-portal"
          className="flex shrink-0 flex-col gap-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1D31]"
        >
          <div className="flex items-center gap-2">
            <Image
              src={ParcelLogo}
              alt="ParcelHawk"
              width={100}
              height={36}
              className="h-8 w-auto"
              priority
            />
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">
            Smarter land search
          </span>
        </Link>

        <div className="flex flex-1 flex-wrap items-center justify-center gap-x-6 gap-y-2 lg:justify-center">
          {navItems.map(({ href, label, badge }) => {
            const active =
              href === "/realtor-portal"
                ? pathname === "/realtor-portal" || pathname === "/realtor-portal/"
                : pathname === href || pathname.startsWith(`${href}/`);

            return (
              <Link
                key={href}
                href={href}
                className={`relative inline-flex items-center gap-1.5 text-sm font-medium transition-colors ${
                  active ? "text-white" : "text-white/75 hover:text-white"
                }`}
              >
                <span
                  className={
                    active
                      ? "border-b-2 border-white pb-0.5"
                      : "border-b-2 border-transparent pb-0.5"
                  }
                >
                  {label}
                </span>
                {badge != null && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center justify-end gap-2">
          <div
            className="flex rounded-full border border-white/20 bg-white/5 p-0.5"
            role="group"
            aria-label="Portal mode"
          >
            <button
              type="button"
              onClick={() => router.push("/land-property")}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeMode === "realtor"
                  ? "bg-[#04C0AF] text-white shadow-sm"
                  : "text-white/80 hover:text-white"
              }`}
            >
              <Home className="size-3.5 shrink-0" aria-hidden />
              Realtor
            </button>
            <button
              type="button"
              onClick={() => router.push("/realtor-portal")}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeMode === "investor"
                  ? "bg-[#04C0AF] text-white shadow-sm"
                  : "text-white/80 hover:text-white"
              }`}
            >
              <LineChart className="size-3.5 shrink-0" aria-hidden />
              Investor
            </button>
          </div>

          <button
            type="button"
            className="relative rounded-lg p-2 text-white/90 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Notifications"
          >
            <Bell className="size-5" />
            <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-red-500 ring-2 ring-[#0B1D31]" />
          </button>

          {status === "loading" ? (
            <div
              className="size-9 shrink-0 rounded-full border border-white/30 bg-white/10"
              aria-hidden
            />
          ) : (
            <div
              className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white/30 bg-white/15 text-xs font-semibold text-white"
              title={user?.name ?? "Account"}
            >
              {user?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.image} alt="" className="size-full object-cover" />
              ) : (
                initials
              )}
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
