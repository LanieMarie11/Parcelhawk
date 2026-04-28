"use client"

import { useState, useEffect, useRef, type ChangeEvent } from "react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import avatar from "@/public/images/buyer-pages/avatar.png"
import Image from "next/image"

export default function PersonalInfo() {
  const { data: session, update, status } = useSession()
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [avatarPreviewSrc, setAvatarPreviewSrc] = useState<string | null>(null)
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement | null>(null)

  const [phone, setPhone] = useState("")
  const [location, setLocation] = useState("")

  useEffect(() => {
    if (session?.user?.name) setFullName(session.user.name)
    if (session?.user?.email) setEmail(session.user.email ?? "")
    if (session?.user?.phone != null) setPhone(session.user.phone ?? "")
    if (session?.user?.location != null) setLocation(session.user.location ?? "")
  }, [session?.user?.name, session?.user?.email, session?.user?.phone, session?.user?.location])

  const handleSaveChanges = async () => {
    try {
      setIsSaving(true)
      const formData = new FormData()
      formData.append("fullName", fullName)
      formData.append("email", email)
      formData.append("phone", phone)
      formData.append("location", location)
      if (pendingAvatarFile) {
        formData.append("avatar", pendingAvatarFile)
      }

      const response = await fetch("/api/profile", {
        method: "POST",
        body: formData,
      })
      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean
        error?: string
        avatarUrl?: string | null
      }
      if (response.ok) {
        await update({
          name: fullName,
          phone,
          location,
          avatarUrl: data.avatarUrl ?? session?.user?.avatarUrl ?? null,
        })
        if (avatarPreviewSrc) {
          URL.revokeObjectURL(avatarPreviewSrc)
          setAvatarPreviewSrc(null)
        }
        setPendingAvatarFile(null)
        toast.success("Profile updated successfully")
      } else {
        toast.error(data.error ?? "Failed to update profile")
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Connection failed. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleAvatarFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!["image/jpeg", "image/png", "image/gif"].includes(file.type)) {
      toast.error("Only JPG, GIF or PNG files are allowed")
      event.target.value = ""
      return
    }

    if (file.size > 1024 * 1024) {
      toast.error("Image size must be 1MB or less")
      event.target.value = ""
      return
    }

    const localImageUrl = URL.createObjectURL(file)
    setAvatarPreviewSrc((currentSrc) => {
      if (currentSrc?.startsWith("blob:")) {
        URL.revokeObjectURL(currentSrc)
      }
      return localImageUrl
    })
    setPendingAvatarFile(file)
    event.target.value = ""
  }

  useEffect(() => {
    return () => {
      if (avatarPreviewSrc?.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreviewSrc)
      }
    }
  }, [avatarPreviewSrc])

  const resolvedAvatarSrc = avatarPreviewSrc ?? session?.user?.avatarUrl ?? avatar.src

  return (
    <section id="personal-information" className="rounded-lg border border-border bg-card p-6">
      <div>
        <h2 className="text-lg font-semibold text-card-foreground">Personal Information</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your public profile and private details.
        </p>
      </div>

      {/* Avatar */}
      <div className="mt-5 flex items-center gap-4">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full">
          {status === "loading" ? (
            <div className="h-full w-full animate-pulse bg-muted" />
          ) : (
            <Image
              src={resolvedAvatarSrc}
              alt="Profile photo"
              fill
              className="object-cover"
            />
          )}
        </div>
        <div className="flex flex-col gap-1">
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif"
            className="hidden"
            onChange={handleAvatarFileChange}
          />
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            className="w-fit rounded-md border border-border px-4 py-1.5 text-sm font-medium text-card-foreground transition-colors hover:bg-accent"
          >
            Change photo
          </button>
          <span className="text-xs text-muted-foreground">JPG, GIF or PNG. 1MB max.</span>
        </div>
      </div>

      {/* Form fields */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Full Name */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="fullName" className="text-sm text-muted-foreground">
            Full Name
          </label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="rounded-md border border-border bg-card px-3 py-2 text-sm text-card-foreground outline-none transition-colors focus:border-[#04C0AF] focus:ring-1 focus:ring-[#04C0AF]"
          />
        </div>

        {/* Email Address */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm text-muted-foreground">
            Email Address
          </label>
          <div className="relative">
            <input
              id="email"
              type="email"
              value={email}
              readOnly
              className="w-full rounded-md border border-border bg-card px-3 py-2 pr-24 text-sm text-card-foreground outline-none"
            />
            <span className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 text-xs font-medium text-[#04C0AF]">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Verified
            </span>
          </div>
        </div>

        {/* Phone Number */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="phone" className="text-sm text-muted-foreground">
            Phone Number
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Enter your phone number"
            className="rounded-md border border-border bg-card px-3 py-2 text-sm text-card-foreground outline-none transition-colors focus:border-[#04C0AF] focus:ring-1 focus:ring-[#04C0AF]"
          />
        </div>

        {/* Location */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="location" className="text-sm text-muted-foreground">
            Location
          </label>
          <input
            id="location"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Enter your location"
            className="rounded-md border border-border bg-card px-3 py-2 text-sm text-card-foreground outline-none transition-colors focus:border-[#04C0AF] focus:ring-1 focus:ring-[#04C0AF]"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex items-center justify-end gap-3">
        <button
          type="button"
          className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-card-foreground"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSaveChanges}
          disabled={isSaving}
          className="rounded-md bg-[#04C0AF] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#03ac9d]"
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </section>
  )
}
