"use client"

import { FileText, X } from "lucide-react"
import { useEffect, useId, useState } from "react"
import { toast } from "sonner"

export type OrderPropertyReportModalProps = {
  open: boolean
  onClose: () => void
  /** Shown under the main title (e.g. listing name). */
  propertySubtitle: string
  defaultFullName?: string
  defaultEmail?: string
  defaultParcelAddress?: string
}

export function OrderPropertyReportModal({
  open,
  onClose,
  propertySubtitle,
  defaultFullName = "",
  defaultEmail = "",
  defaultParcelAddress = "",
}: OrderPropertyReportModalProps) {
  const titleId = useId()
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [parcelAddress, setParcelAddress] = useState("")

  useEffect(() => {
    if (!open) return
    setFullName(defaultFullName.trim())
    setEmail(defaultEmail.trim())
    setParcelAddress(defaultParcelAddress.trim())
  }, [open, defaultFullName, defaultEmail, defaultParcelAddress])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-120 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="bg-[#2D4A31] px-5 pb-5 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm ring-1 ring-white/10"
              aria-hidden
            >
              <FileText className="h-5 w-5" strokeWidth={2} />
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white shadow-sm ring-1 ring-white/10 transition-colors hover:bg-white/30"
              aria-label="Close"
            >
              <X className="h-5 w-5" strokeWidth={2} />
            </button>
          </div>
          <div className="mt-5 min-w-0">
            <h2 id={titleId} className="text-lg font-semibold font-ibm-plex-sans leading-tight tracking-tight text-white">
              Order Property Report
            </h2>
            <p className="mt-1.5 truncate text-sm font-regular font-ibm-plex-sans leading-snug text-white/95">{propertySubtitle}</p>
          </div>
        </div>

        <div className="p-4">
          <div className="rounded-xl border border-emerald-200/90 bg-[#EDFCEA] px-3.5 py-3">
            <div className="flex gap-2.5">
              <span className="text-lg leading-none" aria-hidden>
                🚧
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#2D5A36]">Coming Soon</p>
                <p className="mt-1 text-xs font-ibm-plex-sans leading-relaxed text-[#4b5563]">
                  Full report generation is in development. Register your interest below and we will reach out as soon
                  as it&apos;s ready.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-8">
            <label className="block">
              <span className="text-md font-ibm-plex-sans font-regular text-[#001225]">Full name</span>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter full name"
                className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-[#f3f4f6] px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-300"
              />
            </label>
            <label className="block">
              <span className="text-md font-ibm-plex-sans font-regular text-[#001225]">Email Address</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Jane@example.com"
                className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-[#f3f4f6] px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-300"
              />
            </label>
            <label className="block">
              <span className="text-md font-ibm-plex-sans font-regular text-[#001225]">Parcel Address / Location</span>
              <input
                type="text"
                value={parcelAddress}
                onChange={(e) => setParcelAddress(e.target.value)}
                placeholder="Example Location"
                className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-[#f3f4f6] px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-300"
              />
            </label>
          </div>

          <div className="flex gap-2 pt-6 pb-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-zinc-200 bg-white py-2.5 text-sm font-ibm-plex-sans font-medium text-[#374151] transition-colors hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (!email.trim()) {
                  toast.error("Please enter your email address.")
                  return
                }
                toast.success("Thanks — we'll notify you when property reports are available.")
                onClose()
              }}
              className="min-w-[52%] flex-1 rounded-lg bg-[#2D4A31] py-2.5 text-sm font-ibm-plex-sans font-medium text-white transition-colors hover:bg-[#253e2a]"
            >
              Register Interest
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
