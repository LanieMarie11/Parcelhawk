"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown } from "lucide-react"
import { signOut } from "next-auth/react"
import { useEffect, useRef, useState } from "react"

const menuItems = [
  { label: "Dashboard", href: "/buyer-dashboard", icon: DashboardIcon },
  { label: "Saved Searches", href: "/saved-search", icon: SavedSearchesIcon },
  { label: "Favorite", href: "/favorite", icon: FavoriteIcon },
  { label: "Profile Settings", href: "/profile-settings", icon: ProfileSettingsIcon },
]

type BuyerProfileSidebarProps = {
  /** Optional class for the trigger button to match header styles (e.g. scrolled/dark) */
  triggerClassName?: string
  /** User display name; falls back to session or "Account" */
  userName?: string
}

export default function BuyerProfileSidebar({
  triggerClassName,
  userName = "Account",
}: BuyerProfileSidebarProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  return (
    <div className="relative inline-block font-ibm-plex-sans" ref={containerRef}>
      {/* Trigger - same pattern as price-range */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={
          triggerClassName ??
          "flex min-w-28 items-center justify-between gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:border-[#4ECDC4]/50 hover:text-foreground focus:border-[#4ECDC4] focus:outline-none focus:ring-1 focus:ring-[#4ECDC4]"
        }
        aria-expanded={open}
        aria-haspopup="true"
      >
        <span>{userName}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
          {/* Profile Section */}
          <div className="flex items-center gap-3 p-4">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-border bg-muted" />
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-base font-semibold text-foreground">
                {userName === "Account" ? "Account" : userName}
              </span>
              <span className="text-sm text-muted-foreground">Buyer</span>
            </div>
          </div>

          <div className="h-px w-full bg-border" />

          {/* Navigation Items */}
          <nav className="flex flex-col py-2">
            {menuItems.map((item) => {
              const isActive = pathname === item.href
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
              )
            })}
          </nav>

          <div className="h-px w-full bg-border" />

          {/* Log out */}
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              signOut({ callbackUrl: "/" })
            }}
            className="flex w-full items-center gap-3 px-4 py-3 text-[15px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <LogoutIcon className="h-5 w-5 shrink-0" />
            Log out
          </button>
        </div>
      )}
    </div>
  )
}

/* ── Icon Components ── */

function DashboardIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  )
}

function SavedSearchesIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m16.5 16.5 4 4" />
      <path d="M11 7v4" />
      <path d="M9 9h4" />
    </svg>
  )
}

function FavoriteIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M12 8.5c-.5-1.5-2.5-2-3.5-1s-1 3 .5 4.5L12 15l3-3c1.5-1.5 1.5-3.5.5-4.5s-3-.5-3.5 1Z" />
    </svg>
  )
}

function ProfileSettingsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 20c0-3.5 2.5-6 6-6s6 2.5 6 6" />
      <path d="M18 8v6" />
      <path d="M15 11h6" />
    </svg>
  )
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}
