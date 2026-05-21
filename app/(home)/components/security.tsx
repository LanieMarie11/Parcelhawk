"use client"

import type { FocusEvent } from "react"
import { useState } from "react"
import { toast } from "sonner"

/** Lets users type while reducing browser/password-manager autofill on first paint. */
function enablePasswordFieldOnFocus(event: FocusEvent<HTMLInputElement>) {
  event.currentTarget.removeAttribute("readonly")
}

export default function Security() {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  const openChangePasswordModal = () => {
    if (!currentPassword.trim() || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields.")
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirmation do not match.")
      return
    }
    setIsChangePasswordModalOpen(true)
  }

  const handleUpdatePassword = async () => {
    try {
      setIsChangingPassword(true)
      const response = await fetch("/api/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      })
      const data = await response.json().catch(() => ({}))
      if (response.ok) {
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
        setIsChangePasswordModalOpen(false)
        toast.success("Password updated successfully")
      } else {
        toast.error(data.error ?? "Failed to update password")
      }
    } catch {
      toast.error("Connection failed. Please try again.")
    } finally {
      setIsChangingPassword(false)
    }
  }

  return (
    <>
      {/* Security Section */}
      <section id="security" className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-card-foreground">Security</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Update password and secure your account.
        </p>

        <form
          className="mt-6"
          autoComplete="off"
          onSubmit={(event) => {
            event.preventDefault()
            openChangePasswordModal()
          }}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Current Password */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="currentPassword" className="text-sm text-muted-foreground">
                Current Password
              </label>
              <input
                id="currentPassword"
                name="profile_settings_current_password"
                type="password"
                value={currentPassword}
                placeholder="Enter your current password"
                readOnly
                onFocus={enablePasswordFieldOnFocus}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="rounded-md border border-border bg-card px-3 py-2 text-sm text-card-foreground outline-none transition-colors focus:border-brand-green focus:ring-1 focus:ring-brand-green"
              />
            </div>

            {/* New Password */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="newPassword" className="text-sm text-muted-foreground">
                New Password
              </label>
              <input
                id="newPassword"
                name="profile_settings_new_password"
                type="password"
                value={newPassword}
                placeholder="Enter your new password"
                readOnly
                onFocus={enablePasswordFieldOnFocus}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="rounded-md border border-border bg-card px-3 py-2 text-sm text-card-foreground outline-none transition-colors focus:border-brand-green focus:ring-1 focus:ring-brand-green"
              />
            </div>

            {/* Confirm Password */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirmPassword" className="text-sm text-muted-foreground">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="profile_settings_confirm_password"
                type="password"
                value={confirmPassword}
                placeholder="Confirm your new password"
                readOnly
                onFocus={enablePasswordFieldOnFocus}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="rounded-md border border-border bg-card px-3 py-2 text-sm text-card-foreground outline-none transition-colors focus:border-brand-green focus:ring-1 focus:ring-brand-green"
              />
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="submit"
              className="text-sm font-medium text-brand-green underline-offset-4 transition-colors hover:text-brand-green-hover hover:underline"
            >
              Change password
            </button>
          </div>
        </form>
      </section>

      {isChangePasswordModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="change-password-title"
          onClick={() => !isChangingPassword && setIsChangePasswordModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="change-password-title" className="text-lg font-semibold text-card-foreground">
              Change password?
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Your current session stays signed in. Use the new password the next time you sign in.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={isChangingPassword}
                onClick={() => setIsChangePasswordModalOpen(false)}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-card-foreground transition-colors hover:bg-accent disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isChangingPassword}
                onClick={() => void handleUpdatePassword()}
                className="rounded-xl bg-brand-green px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-green-hover active:bg-brand-green-active disabled:opacity-60"
              >
                {isChangingPassword ? "Updating..." : "Confirm change"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
