"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, LayoutDashboard, LogOut, Settings } from "lucide-react";
import { signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

const menuItems = [
  { label: "Overview", href: "/realtor-portal", icon: LayoutDashboard },
  { label: "Settings", href: "/realtor-portal/settings", icon: Settings },
] as const;

type InvestorProfileMenuProps = {
  /** Matches header trigger styles (e.g. dark border / min width). */
  triggerClassName?: string;
  displayName?: string;
  userImage?: string | null;
};

export default function InvestorProfileMenu({
  triggerClassName,
  displayName = "Account",
  userImage,
}: InvestorProfileMenuProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const initial = displayName.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={
          triggerClassName ??
          "flex min-w-[140px] items-center justify-between gap-2 rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm text-white transition-colors hover:bg-white/10"
        }
        aria-expanded={open}
        aria-haspopup="true"
      >
        <span className="truncate">{displayName}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-white/80 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-white/20 bg-[#0B1D31] shadow-lg ring-1 ring-white/10">
          <div className="flex items-center gap-3 p-4">
            {userImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={userImage}
                alt=""
                className="h-12 w-12 shrink-0 rounded-full border-2 border-white/30 object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-white/30 bg-white/10 text-lg font-semibold text-white">
                {initial}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold text-white">
                {displayName === "Account" ? "Account" : displayName}
              </p>
              <p className="text-sm text-white/60">Investor</p>
            </div>
          </div>

          <div className="h-px w-full bg-white/10" />

          <nav className="flex flex-col py-2">
            {menuItems.map((item) => {
              const isActive =
                item.href === "/realtor-portal"
                  ? pathname === "/realtor-portal" || pathname === "/realtor-portal/"
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 text-[15px] font-medium transition-colors ${
                    isActive
                      ? "bg-white/10 text-white"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <item.icon className="h-5 w-5 shrink-0" aria-hidden />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="h-px w-full bg-white/10" />

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              signOut({ callbackUrl: "/" });
            }}
            className="flex w-full items-center gap-3 px-4 py-3 text-[15px] font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-5 w-5 shrink-0" aria-hidden />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
