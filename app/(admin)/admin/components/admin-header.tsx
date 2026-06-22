"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import ParcelLogo from "@/public/images/parcel.png";
import { AdminProfileMenu } from "./admin-profile-menu";

const nav = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/revenue", label: "Revenue" },
] as const;

export function AdminHeader() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const isSignedIn = status === "authenticated" && !!session;

  return (
    <header className="sticky top-0 z-50 w-full shrink-0 border-b border-white/10 bg-[#0B1D31] px-4 py-4 font-sans md:px-10">
      <nav className="mx-auto flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <Link
          href="/admin"
          className="flex shrink-0 flex-col gap-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1D31]"
        >
          <div className="flex items-center gap-2">
            <Image
              src={ParcelLogo}
              alt="ParcelHawk"
              width={100}
              height={36}
              className="h-8 w-auto"
            />
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">
            Admin dashboard
          </span>
        </Link>

        <div className="flex flex-1 flex-wrap items-center justify-center gap-x-6 gap-y-2 lg:justify-center">
          {nav.map(({ href, label }) => {
            const active =
              href === "/admin"
                ? pathname === "/admin" || pathname === "/admin/"
                : pathname === href || pathname.startsWith(`${href}/`);

            return (
              <Link
                key={label}
                href={href}
                className={`relative inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium transition-colors ${
                  active
                    ? "text-white"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
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
              </Link>
            );
          })}
        </div>

        <div className="flex items-center justify-end gap-2">
          {status === "loading" ? (
            <div
              className="min-w-[140px] rounded-lg border border-white/40 px-4 py-2"
              aria-hidden
            >
              <span className="invisible text-sm">Admin</span>
            </div>
          ) : isSignedIn ? (
            <AdminProfileMenu triggerClassName="flex min-w-[140px] items-center justify-center gap-2 rounded-lg border border-white/80 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10" />
          ) : (
            <Link
              href="/admin/sign-in"
              className="rounded-lg border border-white/80 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              Sign in
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
