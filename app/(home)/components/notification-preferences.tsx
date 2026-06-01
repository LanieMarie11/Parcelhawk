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

export default function NotificationPreferences() {
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadSettings() {
      try {
        const response = await fetch("/api/buyer/notifications/settings", { method: "GET" })
        const data = (await response.json().catch(() => ({}))) as {
          emailNotifications?: boolean
          error?: string
        }
        if (!response.ok) {
          throw new Error(data.error ?? "Failed to load notification settings")
        }
        if (!cancelled && typeof data.emailNotifications === "boolean") {
          setEmailNotifications(data.emailNotifications)
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

  const handleEmailNotificationsToggle = useCallback(async () => {
    const previous = emailNotifications
    const next = !previous
    setEmailNotifications(next)
    setIsSaving(true)

    try {
      const response = await fetch("/api/buyer/notifications/settings", {
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
        setEmailNotifications(data.emailNotifications)
      }
    } catch (error) {
      setEmailNotifications(previous)
      toast.error(
        error instanceof Error ? error.message : "Failed to update notification settings",
      )
    } finally {
      setIsSaving(false)
    }
  }, [emailNotifications])

  return (
    <section id="notifications" className="rounded-lg border border-border bg-card p-6">
      <h2 className="text-lg font-semibold text-card-foreground">
        Notification Preferences
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Choose how and when we contact you.
      </p>

      <div className="mt-6 flex flex-col gap-5">
        {/* Email Notifications */}
        <div className="flex items-center justify-between">
          <div>
            <label htmlFor="email-notif" className="text-sm font-semibold text-card-foreground cursor-pointer">
              Email Notifications
            </label>
            <p className="text-sm text-muted-foreground">
              Receive updates about your account and listings.
            </p>
          </div>
          <Toggle
            id="email-notif"
            enabled={emailNotifications}
            disabled={isLoading || isSaving}
            onToggle={() => void handleEmailNotificationsToggle()}
          />
        </div>

        {/* Push Notifications */}
        {/* <div className="flex items-center justify-between">
          <div>
            <label htmlFor="push-notif" className="text-sm font-semibold text-card-foreground cursor-pointer">
              Push Notifications
            </label>
            <p className="text-sm text-muted-foreground">
              Get instant alerts on your mobile device.
            </p>
          </div>
          <Toggle
            id="push-notif"
            enabled={pushNotifications}
            onToggle={() => setPushNotifications(!pushNotifications)}
          />
        </div> */}

        {/* SMS Updates */}
        {/* <div className="flex items-center justify-between">
          <div>
            <label htmlFor="sms-notif" className="text-sm font-semibold text-card-foreground cursor-pointer">
              SMS Updates
            </label>
            <p className="text-sm text-muted-foreground">
              Receive text messages for urgent alerts.
            </p>
          </div>
          <Toggle
            id="sms-notif"
            enabled={smsUpdates}
            onToggle={() => setSmsUpdates(!smsUpdates)}
          />
        </div> */}
      </div>
    </section>
  )
}
