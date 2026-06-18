"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Brain, ChartColumnIncreasing, ChevronDown, LayoutDashboard, LogOut, MessageCircleIcon, Settings, Users } from "lucide-react";
import { signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

const menuItems = [
  { label: "Overview", href: "/realtor-portal", icon: LayoutDashboard },
  { label: "My Buyers", href: "/realtor-portal/my-buyers", icon: Users },
  { label: "Analytics", href: "/realtor-portal/analytics", icon: ChartColumnIncreasing },
  { label: "Messages", href: "/realtor-portal/messages", icon: MessageCircleIcon },
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
  const isRealtorMode =
    pathname === "/realtor-portal" || pathname.startsWith("/realtor-portal/");
  const roleLabel = isRealtorMode ? "Realtor" : "Investor";
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
        <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
          {/* Profile Section */}
          <div className="flex items-center gap-3 p-4">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-border bg-muted">
              {userImage ? (
                <Image
                  src={userImage}
                  alt={`${displayName} avatar`}
                  fill
                  className="object-cover"
                />
              ) : null}
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-base font-semibold text-foreground">
                {displayName === "Account" ? "Account" : displayName}
              </span>
              <span className="text-sm text-muted-foreground">{roleLabel}</span>
            </div>
          </div>

          <div className="h-px w-full bg-border" />

          {/* Navigation Items */}
          <nav className="flex flex-col py-2">
            {menuItems.map((item) => {
              const isActive =
                item.href === "/realtor-portal"
                  ? pathname === "/realtor-portal" || pathname === "/realtor-portal/"
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 text-[15px] font-medium transition-colors hover:bg-accent ${
                    isActive
                      ? "bg-accent/50 text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="h-px w-full bg-border" />

          {/* Log out */}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              signOut({ callbackUrl: "/" });
            }}
            className="flex w-full items-center gap-3 px-4 py-3 text-[15px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
