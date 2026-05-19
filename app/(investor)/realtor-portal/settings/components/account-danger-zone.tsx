"use client"

import { useState } from "react"
import { signOut } from "next-auth/react"
import { toast } from "sonner"

export default function AccountDangerZone() {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDeleteAccount = async () => {
    try {
      setIsDeleting(true)
      const response = await fetch("/api/realtor-portal/settings/security", {
        method: "DELETE",
      })
      const data = await response.json().catch(() => ({} as { error?: string }))

      if (!response.ok) {
        toast.error(data.error ?? "Failed to delete account")
        return
      }

      toast.success("Account deleted successfully")
      setIsDeleteModalOpen(false)
      signOut({ callbackUrl: "/" })
    } catch {
      toast.error("Connection failed. Please try again.")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-card-foreground">Danger Zone</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Irreversible account actions.
        </p>

        <div className="mt-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-card-foreground">Delete Account</p>
            <p className="text-sm text-muted-foreground">
              Permanently remove your account and all data.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="text-sm font-medium text-destructive underline-offset-4 transition-colors hover:underline"
          >
            Delete Account
          </button>
        </div>
      </section>

      {isDeleteModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-title"
          onClick={() => !isDeleting && setIsDeleteModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="delete-account-title" className="text-lg font-semibold text-card-foreground">
              Delete account?
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              This action is permanent and will remove your account and profile data.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setIsDeleteModalOpen(false)}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-card-foreground transition-colors hover:bg-accent disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => void handleDeleteAccount()}
                className="rounded-md border border-destructive px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-60"
              >
                {isDeleting ? "Deleting..." : "Delete account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
