"use client"

import { useCallback, useState } from "react"
import { toast } from "sonner"

const RELATIONSHIP_CANCEL_REASONS = [
  { value: "", label: "Select a reason" },
  { value: "not_responsive_enough", label: "Not responsive enough" },
  { value: "search_area_changed", label: "Search area changed" },
  { value: "found_different_realtor", label: "Found a different realtor" },
  { value: "not_good_fit", label: "Not a good fit" },
  { value: "other", label: "Other" },
] as const

export default function RealtorConnectionSetting() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedReason, setSelectedReason] = useState("")
  const [otherReason, setOtherReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const closeModal = useCallback(() => {
    setIsModalOpen(false)
    setSelectedReason("")
    setOtherReason("")
  }, [])

  const handleApprove = async () => {
    if (!selectedReason) {
      toast.error("Please select a reason.")
      return
    }
    if (selectedReason === "other" && !otherReason.trim()) {
      toast.error("Please describe your reason.")
      return
    }

    try {
      setIsSubmitting(true)
      const response = await fetch("/api/buyer/realtor-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: selectedReason,
          otherNote: selectedReason === "other" ? otherReason.trim() : undefined,
        }),
      })
      const data = (await response.json().catch(() => ({}))) as { error?: string }

      if (!response.ok) {
        toast.error(data.error ?? "Failed to end realtor connection")
        return
      }

      toast.success("Your realtor connection has been ended.")
      closeModal()
    } catch {
      toast.error("Connection failed. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <section className="rounded-lg border border-border bg-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-card-foreground">Setting</h2>
            <p className="mt-1 text-sm text-muted-foreground">Manage Realtor Connection</p>
          </div>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="shrink-0 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-card-foreground transition-colors hover:bg-accent"
          >
            Cancel the relationship
          </button>
        </div>
      </section>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="buyer-realtor-relationship-title"
          onClick={() => {
            if (!isSubmitting) closeModal()
          }}
        >
          <div
            className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <h3
              id="buyer-realtor-relationship-title"
              className="text-lg font-semibold uppercase tracking-wide text-card-foreground"
            >
              Buyer-Realtor Relationship
            </h3>

            <div className="mt-5 rounded-lg border border-border p-4">
              <label htmlFor="relationship-cancel-reason" className="text-sm text-muted-foreground">
                Buyer-Realtor Relationship Controls
              </label>
              <div className="relative mt-2">
                <select
                  id="relationship-cancel-reason"
                  value={selectedReason}
                  disabled={isSubmitting}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  className="w-full appearance-none rounded-md border border-border bg-card py-2 pl-3 pr-9 text-sm text-card-foreground outline-none transition-colors focus:border-[#5cbcb6] focus:ring-1 focus:ring-[#5cbcb6] disabled:opacity-60"
                >
                  {RELATIONSHIP_CANCEL_REASONS.map((opt) => (
                    <option key={opt.value || "placeholder"} value={opt.value} disabled={opt.value === ""}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </span>
              </div>
            </div>

            <div className="mt-5">
              <label htmlFor="relationship-other-reason" className="text-sm font-medium text-muted-foreground">
                Other reason
              </label>
              <textarea
                id="relationship-other-reason"
                value={otherReason}
                disabled={isSubmitting}
                onChange={(e) => setOtherReason(e.target.value)}
                rows={5}
                placeholder="Write your reason here."
                className="mt-2 w-full resize-none rounded-lg border border-transparent bg-muted px-3 py-2.5 text-sm text-card-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-[#5cbcb6] focus:ring-1 focus:ring-[#5cbcb6] disabled:opacity-60"
              />
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={closeModal}
                className="rounded-md border border-border bg-card px-4 py-2.5 text-sm font-medium text-card-foreground transition-colors hover:bg-accent disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => void handleApprove()}
                className="rounded-md bg-[#345e37] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#2d5230] disabled:opacity-60"
              >
                {isSubmitting ? "Working…" : "Approve"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
