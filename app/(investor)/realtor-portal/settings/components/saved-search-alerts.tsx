"use client"

import { useState } from "react"

function Toggle({
  enabled,
  onToggle,
  id,
}: {
  enabled: boolean
  onToggle: () => void
  id: string
}) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={enabled}
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ${
        enabled ? "bg-brand-green" : "bg-muted"
      }`}
    >
      <span className="sr-only">Toggle</span>
      <span
        className={`pointer-events-none inline-block size-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ${
          enabled ? "translate-x-5.5" : "translate-x-0.5"
        }`}
      />
    </button>
  )
}

export default function SavedSearchAlerts() {
  const [globalAlerts, setGlobalAlerts] = useState(true)
  const [priceDropAlerts, setPriceDropAlerts] = useState(true)

  return (
    <section id="saved-search-alerts" className="rounded-lg border border-border bg-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-card-foreground">
            Saved Search Alerts
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage alerts for saved searches and buyer activity in your portal.
          </p>
        </div>
        <button
          type="button"
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-card-foreground transition-colors hover:bg-accent"
        >
          Manage saved searches
        </button>
      </div>

      <div className="mt-6 flex flex-col gap-5">
        {/* Global Search Alerts */}
        <div className="flex items-center justify-between">
          <div>
            <label htmlFor="global-alerts" className="text-sm font-semibold text-card-foreground">
              Global Search Alerts
            </label>
            <p className="text-sm text-muted-foreground">
              Enable or disable all saved search notifications.
            </p>
          </div>
          <Toggle
            id="global-alerts"
            enabled={globalAlerts}
            onToggle={() => setGlobalAlerts(!globalAlerts)}
          />
        </div>

        {/* Price Drop */}
        <div className="flex items-center justify-between">
          <div>
            <label htmlFor="price-drop" className="text-sm font-semibold text-card-foreground">
              {'Notify when price drops > 5%'}
            </label>
          </div>
          <Toggle
            id="price-drop"
            enabled={priceDropAlerts}
            onToggle={() => setPriceDropAlerts(!priceDropAlerts)}
          />
        </div>
      </div>
    </section>
  )
}
