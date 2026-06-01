"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

function Toggle({
  enabled,
  onToggle,
  id,
  disabled,
}: {
  enabled: boolean
  onToggle: () => void
  id: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={enabled}
      disabled={disabled}
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${
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
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingGlobalAlerts, setIsSavingGlobalAlerts] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadSettings() {
      try {
        const response = await fetch("/api/realtor-portal/notifications/settings", {
          method: "GET",
        })
        const data = (await response.json().catch(() => ({}))) as {
          emailNotifications?: boolean
          error?: string
        }
        if (!response.ok) {
          throw new Error(data.error ?? "Failed to load notification settings")
        }
        if (!cancelled && typeof data.emailNotifications === "boolean") {
          setGlobalAlerts(data.emailNotifications)
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(
            error instanceof Error ? error.message : "Failed to load notification settings",
          )
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadSettings()
    return () => {
      cancelled = true
    }
  }, [])

  const handleGlobalAlertsToggle = useCallback(async () => {
    const previous = globalAlerts
    const next = !previous
    setGlobalAlerts(next)
    setIsSavingGlobalAlerts(true)

    try {
      const response = await fetch("/api/realtor-portal/notifications/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailNotifications: next }),
      })
      const data = (await response.json().catch(() => ({}))) as {
        emailNotifications?: boolean
        error?: string
      }
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to update notification settings")
      }
      if (typeof data.emailNotifications === "boolean") {
        setGlobalAlerts(data.emailNotifications)
      }
    } catch (error) {
      setGlobalAlerts(previous)
      toast.error(
        error instanceof Error ? error.message : "Failed to update notification settings",
      )
    } finally {
      setIsSavingGlobalAlerts(false)
    }
  }, [globalAlerts])

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
            disabled={isLoading || isSavingGlobalAlerts}
            onToggle={() => void handleGlobalAlertsToggle()}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label htmlFor="price-drop" className="text-sm font-semibold text-card-foreground">
              {"Notify when price drops > 5%"}
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
