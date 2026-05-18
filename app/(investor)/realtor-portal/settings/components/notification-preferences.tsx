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
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
        enabled ? "bg-[#5cbcb6]" : "bg-muted"
      }`}
    >
      <span className="sr-only">Toggle</span>
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
          enabled ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  )
}

export default function NotificationPreferences() {
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(true)
  const [smsUpdates, setSmsUpdates] = useState(false)

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
            <label htmlFor="email-notif" className="text-sm font-semibold text-card-foreground">
              Email Notifications
            </label>
            <p className="text-sm text-muted-foreground">
              Receive updates about your account and listings.
            </p>
          </div>
          <Toggle
            id="email-notif"
            enabled={emailNotifications}
            onToggle={() => setEmailNotifications(!emailNotifications)}
          />
        </div>

        {/* Push Notifications */}
        <div className="flex items-center justify-between">
          <div>
            <label htmlFor="push-notif" className="text-sm font-semibold text-card-foreground">
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
        </div>

        {/* SMS Updates */}
        <div className="flex items-center justify-between">
          <div>
            <label htmlFor="sms-notif" className="text-sm font-semibold text-card-foreground">
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
        </div>
      </div>
    </section>
  )
}
