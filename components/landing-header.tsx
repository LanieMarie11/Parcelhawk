"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { createPortal } from "react-dom";
import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import ParcelLogo from "@/public/images/parcel.png";
import SignInForm from "./sign-in-form";
import BuyerProfileSidebar from "../app/(buyer)/components/buyer-profile-sidebar";
import { useSignInModal } from "@/lib/sign-in-modal-context";

const nav = [
  { href: "/land-property", label: "Search" },
  { href: "/saved-search", label: "Saved Searches" },
  { href: "/favorite", label: "Saved Properties" },
  { href: "/compare", label: "Compare" },
  { href: "/resources", label: "Resources" },
  { href: "/message", label: "Messages" },
  { href: "/profile-settings", label: "Profile" },
] as const;

export function LandingHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const { registerOpenSignInModal } = useSignInModal();
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const isSignedIn = status === "authenticated" && !!session;
  const role = (session?.user as { role?: string } | undefined)?.role;
  const isBuyer = isSignedIn && role === "buyer";

  const user = session?.user as { firstName?: string; lastName?: string; name?: string } | undefined;
  const profileLabel =
    user?.firstName?.trim() && user?.lastName?.trim()
      ? `${user.firstName.trim()[0]}${user.lastName.trim()[0]}`.toUpperCase()
      : (user?.name ?? "Account");

  useEffect(() => {
    registerOpenSignInModal(() => setShowSignInModal(true));
  }, [registerOpenSignInModal]);

  useEffect(() => {
    if (!isBuyer) {
      setUnreadMessages(0);
      return;
    }

    let isMounted = true;

    const fetchUnreadCount = async () => {
      try {
        const response = await fetch("/api/buyer/messages/unread-count", {
          method: "GET",
          cache: "no-store",
        });
        if (!response.ok) return;

        const data = (await response.json()) as { unreadCount?: number };
        if (isMounted) {
          setUnreadMessages(Number.isFinite(data.unreadCount) ? (data.unreadCount ?? 0) : 0);
        }
      } catch {
        if (isMounted) {
          setUnreadMessages(0);
        }
      }
    };

    fetchUnreadCount();

    return () => {
      isMounted = false;
    };
  }, [isBuyer, pathname]);

  return (
    <header className="fixed left-0 right-0 top-0 z-50 w-full border-b border-white/10 bg-[#0B1D31] px-4 py-4 font-sans md:px-10">
      <nav className="mx-auto flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <Link
          href="/"
          className="flex shrink-0 flex-col gap-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1D31]"
        >
          <div className="flex items-center gap-2">
            <Image src={ParcelLogo} alt="ParcelHawk" width={100} height={36} className="h-8 w-auto" />
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">
            Smarter land search
          </span>
        </Link>

        <div className="flex flex-1 flex-wrap items-center justify-center gap-x-6 gap-y-2 lg:justify-center">
          {nav.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            const badge =
              href === "/message" && unreadMessages > 0
                ? unreadMessages > 99
                  ? "99+"
                  : unreadMessages
                : undefined;
            return (
              <Link
                key={label}
                href={href}
                className={`inline-flex items-center gap-1.5 text-sm font-medium text-white transition-colors hover:text-white/90 ${
                  active ? "border-b-2 border-white pb-0.5" : "text-white/90"
                }`}
              >
                {label}
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
          <Link
            href="/notification"
            className="relative rounded-lg p-2 text-white/90 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Notifications"
          >
            <Bell className="size-5" />
            <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-red-500 ring-2 ring-[#0B1D31]" />
          </Link>

          {status === "loading" ? (
            <div className="min-w-[140px] rounded-lg border border-white/40 px-4 py-2" aria-hidden>
              <span className="invisible text-sm">Login</span>
            </div>
          ) : isSignedIn ? (
            <BuyerProfileSidebar
              triggerClassName="flex min-w-[140px] items-center justify-center gap-2 rounded-lg border border-white/80 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
              userName={profileLabel}
            />
          ) : (
            <div className="flex rounded-lg border border-white/80 text-sm font-medium text-white">
              <button
                type="button"
                onClick={() => setShowSignInModal(true)}
                className="rounded-l-lg px-4 py-2 transition-colors hover:bg-white/10"
              >
                Log in
              </button>
              <span className="my-2 w-px shrink-0 bg-white/50" aria-hidden />
              <button
                type="button"
                onClick={() => router.push("/sign-up")}
                className="rounded-r-lg px-4 py-2 transition-colors hover:bg-white/10"
              >
                Sign up
              </button>
            </div>
          )}
        </div>
      </nav>

      {showSignInModal &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-100 flex h-full w-full items-center justify-center">
            <button
              className="absolute inset-0 bg-black/50 animate-in fade-in animation-duration-200"
              aria-label="Close modal"
              onClick={() => setShowSignInModal(false)}
            />
            <div
              className="relative z-10 px-4 animate-in fade-in zoom-in-95 animation-duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <SignInForm onClose={() => setShowSignInModal(false)} />
            </div>
          </div>,
          document.body
        )}

    </header>
  );
}
