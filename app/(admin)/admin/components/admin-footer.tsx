"use client";

import Image from "next/image";
import Link from "next/link";
import ParcelLogo from "@/public/images/parcel.png";

const footerLinks = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/revenue", label: "Revenue" },
] as const;

export function AdminFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-white/10 bg-[#0B1D31] px-4 py-8 font-sans text-white md:px-10">
      <div className="mx-auto flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex max-w-sm flex-col gap-2">
          <Link href="/admin" className="inline-flex w-fit flex-col gap-0.5">
            <Image
              src={ParcelLogo}
              alt="ParcelHawk"
              width={100}
              height={36}
              className="h-8 w-auto"
            />
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">
              Smarter land search
            </span>
          </Link>
          <p className="text-sm text-white/60">
            Internal tools for ParcelHawk operations and user support.
          </p>
        </div>

        <div className="flex flex-wrap gap-x-8 gap-y-4">
          {footerLinks.map(({ href, label }) => (
            <Link
              key={label}
              href={href}
              className="text-sm font-medium text-white/80 transition-colors hover:text-white"
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      <div className="mx-auto mt-8 border-t border-white/10 pt-6 text-sm text-white/50">
        © {year} ParcelHawk. All rights reserved.
      </div>
    </footer>
  );
}
