"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import Image from "next/image"

export default function PersonalInfo() {
  const { data: session } = useSession()
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")

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
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, phone, location }),
      })
      const data = await response.json().catch(() => ({}))
      if (response.ok) {
        toast.success("Profile updated successfully")
      } else {
        toast.error((data as { error?: string }).error ?? "Failed to update profile")
      }
    } catch {
      toast.error("Connection failed. Please try again.")
    }
  }

  return (
    <section id="personal-information" className="rounded-lg border border-border bg-card p-6">
      <h2 className="text-lg font-semibold text-card-foreground">Personal Information</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage your public profile and private details.
      </p>

      {/* Avatar */}
      {/* <div className="mt-5 flex items-center gap-4">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full">
          <Image
            src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face"
            alt="Profile photo"
            fill
            className="object-cover"
          />
        </div>
        <div className="flex flex-col gap-1">
          <button
            type="button"
            className="w-fit rounded-md border border-border px-4 py-1.5 text-sm font-medium text-card-foreground transition-colors hover:bg-accent"
          >
            Change photo
          </button>
          <span className="text-xs text-muted-foreground">
            JPG, GIF or PNG. 1MB max.
          </span>
        </div>
      </div> */}

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
          className="rounded-md bg-[#04C0AF] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#03ac9d]"
        >
          Save Changes
        </button>
      </div>
    </section>
  )
}
