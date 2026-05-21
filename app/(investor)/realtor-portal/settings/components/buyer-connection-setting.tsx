"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

type ConnectedBuyer = {
  id: string
  name: string
  avatarUrl: string
}

function buyerInitials(name: string) {
  const parts = name.trim().split(/\s+/)
  const a = parts[0]?.[0] ?? "?"
  const b = parts[1]?.[0] ?? ""
  return `${a}${b}`.toUpperCase()
}

function BuyerAvatar({ name, avatarUrl }: { name: string; avatarUrl: string }) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={avatarUrl} alt={name} className="size-7 shrink-0 rounded-full object-cover" />
    )
  }
  return (
    <span
      className="flex size-7 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-semibold text-zinc-600"
    >
      {buyerInitials(name)}
    </span>
  )
}

export default function BuyerConnectionSetting() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedBuyerId, setSelectedBuyerId] = useState("")
  const [reasonNote, setReasonNote] = useState("")
  const [buyers, setBuyers] = useState<ConnectedBuyer[]>([])
  const [isLoadingBuyers, setIsLoadingBuyers] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isBuyerMenuOpen, setIsBuyerMenuOpen] = useState(false)
  const buyerSelectRef = useRef<HTMLDivElement>(null)

  const closeModal = useCallback(() => {
    setIsModalOpen(false)
    setSelectedBuyerId("")
    setReasonNote("")
    setIsBuyerMenuOpen(false)
  }, [])

  const selectedBuyer = buyers.find((buyer) => buyer.id === selectedBuyerId)

  useEffect(() => {
    if (!isBuyerMenuOpen) return

    function handlePointerDown(event: MouseEvent) {
      if (!buyerSelectRef.current?.contains(event.target as Node)) {
        setIsBuyerMenuOpen(false)
      }
    }

    document.addEventListener("mousedown", handlePointerDown)
    return () => document.removeEventListener("mousedown", handlePointerDown)
  }, [isBuyerMenuOpen])

  useEffect(() => {
    if (!isModalOpen) return

    let cancelled = false

    async function loadBuyers() {
      setIsLoadingBuyers(true)
      try {
        const response = await fetch("/api/realtor-portal/my-buyers", { cache: "no-store" })
        const data = (await response.json()) as {
          buyers?: Array<{ id: string; name: string; avatarUrl?: string }>
          error?: string
        }

        if (!response.ok) {
          throw new Error(data.error ?? "Failed to load buyers")
        }

        if (!cancelled) {
          setBuyers(
            (data.buyers ?? []).map((buyer) => ({
              id: buyer.id,
              name: buyer.name,
              avatarUrl: buyer.avatarUrl ?? "",
            })),
          )
        }
      } catch (error) {
        if (!cancelled) {
          setBuyers([])
          toast.error(error instanceof Error ? error.message : "Failed to load buyers")
        }
      } finally {
        if (!cancelled) {
          setIsLoadingBuyers(false)
        }
      }
    }

    void loadBuyers()

    return () => {
      cancelled = true
    }
  }, [isModalOpen])

  const handleApprove = async () => {
    if (!selectedBuyerId) {
      toast.error("Please select a buyer.")
      return
    }

    try {
      setIsSubmitting(true)
      const response = await fetch("/api/realtor-portal/settings/buyer-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyerId: selectedBuyerId,
          reasonNote: reasonNote.trim() || undefined,
        }),
      })
      const data = (await response.json().catch(() => ({}))) as { error?: string }

      if (!response.ok) {
        toast.error(data.error ?? "Failed to remove buyer from your network")
        return
      }

      toast.success("Buyer removed from your active network.")
      setBuyers((prev) => prev.filter((buyer) => buyer.id !== selectedBuyerId))
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
            <p className="mt-1 text-sm text-muted-foreground">Manage Buyer Connection</p>
          </div>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="shrink-0 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-card-foreground transition-colors hover:bg-accent"
          >
            Manage buyer relationship
          </button>
        </div>
      </section>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="realtor-buyer-relationship-title"
          onClick={() => {
            if (!isSubmitting) closeModal()
          }}
        >
          <div
            className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <h3
              id="realtor-buyer-relationship-title"
              className="text-lg font-semibold uppercase tracking-wide text-card-foreground"
            >
              Realtor-Buyer Relationship
            </h3>

            <div className="mt-5 rounded-lg border border-border p-4">
              <p id="buyer-to-remove-label" className="text-sm text-muted-foreground">
                Select a buyer to remove from your active network.
              </p>
              <div ref={buyerSelectRef} className="relative mt-2">
                <button
                  type="button"
                  id="buyer-to-remove"
                  aria-haspopup="listbox"
                  aria-expanded={isBuyerMenuOpen}
                  aria-labelledby="buyer-to-remove-label"
                  disabled={isSubmitting || isLoadingBuyers}
                  onClick={() => setIsBuyerMenuOpen((open) => !open)}
                  className="flex w-full items-center gap-2 rounded-md border border-border bg-card py-2 pl-2 pr-9 text-left text-sm text-card-foreground outline-none transition-colors focus:border-brand-green focus:ring-1 focus:ring-brand-green disabled:opacity-60"
                >
                  {selectedBuyer ? (
                    <>
                      <BuyerAvatar name={selectedBuyer.name} avatarUrl={selectedBuyer.avatarUrl} />
                      <span className="min-w-0 truncate">{selectedBuyer.name}</span>
                    </>
                  ) : (
                    <span className="pl-1 text-muted-foreground">
                      {isLoadingBuyers ? "Loading buyers..." : "Select a Buyer"}
                    </span>
                  )}
                </button>
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

                {isBuyerMenuOpen && buyers.length > 0 ? (
                  <ul
                    role="listbox"
                    aria-labelledby="buyer-to-remove-label"
                    className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border border-border bg-card py-1 shadow-md"
                  >
                    {buyers.map((buyer) => {
                      const isSelected = buyer.id === selectedBuyerId
                      return (
                        <li key={buyer.id} role="option" aria-selected={isSelected}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedBuyerId(buyer.id)
                              setIsBuyerMenuOpen(false)
                            }}
                            className={`flex w-full items-center gap-2 px-2 py-2 text-left text-sm transition-colors hover:bg-accent ${
                              isSelected ? "bg-accent/60" : ""
                            }`}
                          >
                            <BuyerAvatar name={buyer.name} avatarUrl={buyer.avatarUrl} />
                            <span className="min-w-0 truncate text-card-foreground">{buyer.name}</span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                ) : null}
              </div>
              {!isLoadingBuyers && buyers.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">No connected buyers in your network.</p>
              ) : null}
            </div>

            <div className="mt-5">
              <label htmlFor="buyer-removal-reason" className="text-sm font-medium text-card-foreground">
                Reason(Optional)
              </label>
              <textarea
                id="buyer-removal-reason"
                value={reasonNote}
                disabled={isSubmitting}
                onChange={(e) => setReasonNote(e.target.value)}
                rows={5}
                placeholder="Write your reason here."
                className="mt-2 w-full resize-none rounded-lg border border-transparent bg-muted px-3 py-2.5 text-sm text-card-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-brand-green focus:ring-1 focus:ring-brand-green disabled:opacity-60"
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
                disabled={isSubmitting || isLoadingBuyers || buyers.length === 0}
                onClick={() => void handleApprove()}
                className="rounded-xl bg-brand-green px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-green-hover active:bg-brand-green-active disabled:opacity-60"
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
