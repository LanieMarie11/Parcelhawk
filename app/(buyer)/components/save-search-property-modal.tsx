"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"

export type Frequency = "instant" | "daily" | "none"

export interface SavedSearchFilters {
  minPrice?: number | null
  maxPrice?: number | null
  minAcres?: number | null
  maxAcres?: number | null
  state?: string | null
  county?: string | null
  propertyType?: string | null
  landType?: string | null
  activities?: string[] | null
  prompt?: string | null
}

interface SavePropertySearchModalProps {
  isOpen: boolean
  onClose: () => void
  onSave?: (data: { searchName: string; frequency: Frequency }) => void
  defaultSearchName?: string
  defaultFrequency?: Frequency
  /** When set, updates an existing saved search instead of creating one */
  searchId?: string
  /** Current filters to persist to saved_searches when user clicks Save Search */
  filters?: SavedSearchFilters | null
}

function parseFrequency(value: string | undefined): Frequency {
  if (value === "daily" || value === "none") return value
  return "instant"
}

export function SavePropertySearchModal({
  isOpen,
  onClose,
  onSave,
  defaultSearchName = "",
  defaultFrequency = "instant",
  searchId,
  filters,
}: SavePropertySearchModalProps) {
  const [searchName, setSearchName] = useState(defaultSearchName)
  const [frequency, setFrequency] = useState<Frequency>(defaultFrequency)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isEditMode = searchId != null && searchId !== ""

  useEffect(() => {
    if (isOpen) {
      setSearchName(defaultSearchName)
      setFrequency(parseFrequency(defaultFrequency))
      setError(null)
    }
  }, [isOpen, defaultSearchName, defaultFrequency])

  if (!isOpen) return null

  const handleSave = async () => {
    const name = searchName.trim()
    if (!name) {
      setError("Enter a search name")
      return
    }
    setError(null)

    if (isEditMode) {
      setSaving(true)
      try {
        const res = await fetch(`/api/saved-searches/${searchId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, frequency }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error ?? "Failed to update search")
        }
        onSave?.({ searchName: name, frequency })
        onClose()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to update search")
      } finally {
        setSaving(false)
      }
      return
    }

    if (filters != null) {
      setSaving(true)
      try {
        const res = await fetch("/api/saved-searches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            frequency,
            minPrice: filters.minPrice ?? null,
            maxPrice: filters.maxPrice ?? null,
            minAcres: filters.minAcres ?? null,
            maxAcres: filters.maxAcres ?? null,
            state: filters.state ?? null,
            county: filters.county ?? null,
            propertyType: filters.propertyType ?? null,
            landType: filters.landType ?? null,
            activities: filters.activities ?? null,
            prompt: filters.prompt?.trim() || null,
          }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error ?? "Failed to save search")
        }
        onSave?.({ searchName: name, frequency })
        onClose()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save search")
      } finally {
        setSaving(false)
      }
    } else {
      onSave?.({ searchName: name, frequency })
      onClose()
    }
  }

  const frequencyOptions: { value: Frequency; label: string }[] = [
    { value: "instant", label: "Instant Updated" },
    { value: "daily", label: "Daily Updates" },
    { value: "none", label: "No Updates" },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="relative w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-neutral-400 transition-colors hover:text-neutral-600"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Title */}
        <h2 id="modal-title" className="pr-8 text-lg font-semibold text-neutral-900">
          {isEditMode ? "Edit Saved Search" : "Save Property Search"}
        </h2>

        {/* Search name input */}
        <div className="mt-5">
          <label
            htmlFor="search-name"
            className="block text-sm font-medium text-neutral-700"
          >
            Search name
          </label>
          <input
            id="search-name"
            type="text"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            placeholder="Enter search name"
            className="mt-1.5 w-full rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-brand-green focus:ring-1 focus:ring-brand-green"
          />
        </div>

        {/* Divider */}
        <div className="my-5 h-px bg-neutral-200" />

        {/* Frequency */}
        <fieldset>
          <legend className="text-sm font-medium text-neutral-900">
            Frequency
          </legend>
          <div className="mt-3 flex flex-col gap-3">
            {frequencyOptions.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-3"
              >
                <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
                  <input
                    type="radio"
                    name="frequency"
                    value={option.value}
                    checked={frequency === option.value}
                    onChange={() => setFrequency(option.value)}
                    className="peer sr-only"
                  />
                  <span className="h-5 w-5 rounded-full border-2 border-neutral-300 transition-colors peer-checked:border-brand-green" />
                  <span
                    className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 scale-0 rounded-full bg-brand-green transition-transform peer-checked:scale-100"
                    aria-hidden
                  />
                </span>
                <span className="text-sm text-neutral-900">{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {error && (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        {/* Divider */}
        <div className="my-5 h-px bg-neutral-200" />

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 rounded-lg border border-neutral-200 bg-white py-2.5 text-sm font-medium text-neutral-800 transition-colors hover:bg-neutral-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-lg bg-brand-green py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-green-hover active:bg-brand-green-active disabled:opacity-50"
          >
            {saving ? "Saving…" : isEditMode ? "Save Changes" : "Save Search"}
          </button>
        </div>
      </div>
    </div>
  )
}
