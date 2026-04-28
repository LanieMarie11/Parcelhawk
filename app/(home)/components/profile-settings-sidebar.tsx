"use client"

import { useEffect, useState } from "react"

const navItems = [
  { href: "#personal-info", label: "Personal Info" },
  { href: "#land-preferences", label: "Land Preferences" },
  { href: "#notification-preferences", label: "Notification Preferences" },
  { href: "#saved-search-alerts", label: "Saved Search Alerts" },
  { href: "#security", label: "Security" },
]

export default function ProfileSettingsSidebar() {
  const [activeHref, setActiveHref] = useState("#personal-info")

  useEffect(() => {
    if (window.location.hash) {
      setActiveHref(window.location.hash)
    }
  }, [])

  const handleNavClick = (
    event: React.MouseEvent<HTMLAnchorElement>,
    href: string
  ) => {
    event.preventDefault()
    setActiveHref(href)

    const target = document.querySelector(href)
    if (target instanceof HTMLElement) {
      target.scrollIntoView({ behavior: "smooth", block: "center" })
      window.history.replaceState(null, "", href)
    }
  }

  return (
    <aside className="hidden lg:block">
      <div className="sticky top-24">
        <nav className="space-y-2">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={(event) => handleNavClick(event, item.href)}
              className={`block rounded-lg px-4 py-3 text-[14px] font-ibm-plex-sans font-medium transition ${
                item.href === activeHref
                  ? "bg-[#E4ECE7] text-[#2E5B3D]"
                  : "text-[#838799] hover:text-foreground"
              }`}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </div>
    </aside>
  )
}
