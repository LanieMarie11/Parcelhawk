"use client";

import { useRealtorMessagesUnread } from "@/lib/realtor-messages-unread-context";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Bell } from "lucide-react";
import ParcelLogo from "@/public/images/parcel.png";
import InvestorProfileMenu from "./investor-profile-menu";
import { PortalModeToggle } from "./portal-mode-toggle";

type NavItem = {
  href: string;
  label: string;
  badge?: number | string;
};

const realtorNavItems: readonly NavItem[] = [
  { href: "/realtor-portal", label: "Overview" },
  { href: "/realtor-portal/my-buyers", label: "My buyers" },
  // { href: "/realtor-portal/buyer-intel", label: "Buyer intel" },
  // { href: "/realtor-portal/curated-parcels", label: "Curated parcels" },
  { href: "/realtor-portal/analytics", label: "Analytics" },
  { href: "/realtor-portal/messages", label: "Messages" },
  { href: "/realtor-portal/invite-links", label: "Invite links" },
  { href: "/realtor-portal/settings", label: "Settings" },
];

const investorNavItems: readonly NavItem[] = [
  { href: "/investor-portal", label: "Overview" },
  // { href: "/investor-portal/curated-parcels", label: "Curated parcels" },
  // { href: "/investor-portal/analytics", label: "Analytics" },
  { href: "/realtor-portal/settings", label: "Settings" },
];

export function InvestorHeader() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const { unreadCount: unreadMessages, notificationUnreadCount: unreadNotifications } =
    useRealtorMessagesUnread();
  const isSignedIn = status === "authenticated" && !!session;
  const isRealtorMode =
    pathname === "/realtor-portal" || pathname.startsWith("/realtor-portal/");
  const navItems = isRealtorMode
    ? realtorNavItems.map((item) =>
        item.href === "/realtor-portal/messages"
          ? {
              ...item,
              badge:
                unreadMessages > 0 ? (unreadMessages > 99 ? "99+" : unreadMessages) : undefined,
            }
          : item,
      )
    : investorNavItems;
  const portalRoot = isRealtorMode ? "/realtor-portal" : "/investor-portal";
  const isNotificationsActive =
    pathname === "/realtor-portal/notifications" ||
    pathname.startsWith("/realtor-portal/notifications/");

  const user = session?.user as
    | { firstName?: string; lastName?: string; name?: string; image?: string | null }
    | undefined;
  const profileLabel =
    user?.firstName?.trim() && user?.lastName?.trim()
      ? `${user.firstName.trim()[0]}${user.lastName.trim()[0]}`.toUpperCase()
      : (user?.name ?? "Account");
  const initials =
    user?.firstName?.trim() && user?.lastName?.trim()
      ? `${user.firstName.trim()[0]}${user.lastName.trim()[0]}`.toUpperCase()
      : (user?.name?.slice(0, 2).toUpperCase() ?? "?");

  return (
    <header className="sticky top-0 z-50 w-full shrink-0 border-b border-white/10 bg-[#0B1D31] px-4 py-4 font-sans md:px-10">
      <nav className="mx-auto flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <Link
          href={portalRoot}
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
              href === portalRoot
                ? pathname === portalRoot || pathname === `${portalRoot}/`
                : pathname === href || pathname.startsWith(`${href}/`);

            return (
              <Link
                key={href}
                href={href}
                className={`relative inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium transition-colors ${
                  active ? "text-white" : "text-white/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span
                  className={
                    active
                      ? "border-b-2 border-white"
                      : "border-b-2 border-transparent"
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
          <PortalModeToggle />

          {isRealtorMode ? (
            <Link
              href="/realtor-portal/notifications"
              className={`relative rounded-lg p-2 transition-colors ${
                isNotificationsActive
                  ? "bg-white/20 text-white"
                  : "text-white/90 hover:bg-white/10 hover:text-white"
              }`}
              aria-current={isNotificationsActive ? "page" : undefined}
              aria-label={
                unreadNotifications > 0
                  ? `Notifications (${unreadNotifications} unread)`
                  : "Notifications"
              }
            >
              <Bell className="size-5" />
              {unreadNotifications > 0 ? (
                <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-[#0B1D31]">
                  {unreadNotifications > 99 ? "99+" : unreadNotifications}
                </span>
              ) : null}
            </Link>
          ) : null}

          {status === "loading" ? (
            <div className="min-w-[140px] rounded-lg border border-white/40 px-4 py-2" aria-hidden>
              <span className="invisible text-sm">Login</span>
            </div>
          ) : isSignedIn ? (
            <InvestorProfileMenu
              triggerClassName="flex min-w-[140px] items-center justify-center gap-2 rounded-lg border border-white/80 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
              displayName={profileLabel}
              userImage={user?.image}
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
