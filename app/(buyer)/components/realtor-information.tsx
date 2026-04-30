"use client";

import { UserRound } from "lucide-react";

type RealtorInformationProps = {
  name: string;
  avatarUrl?: string;
  lastActive: string;
  email: string;
  phone: string;
  location: string;
};

export function RealtorInformation({
  name,
  avatarUrl,
  lastActive,
  email,
  phone,
  location,
}: RealtorInformationProps) {
  return (
    <aside className="w-full">
      <div className="mb-4 flex items-center gap-2">
        <UserRound className="size-4 text-zinc-700" aria-hidden />
        <p className="text-sm font-semibold uppercase tracking-tight text-[#1d2630]">
          Realtor Information
        </p>
      </div>

      <div className="rounded-3xl border border-zinc-300 bg-[#f8f9fb]">
        <div className="flex items-start gap-3 px-5 py-5">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={name} className="size-[68px] rounded-full object-cover" />
          ) : (
            <div className="flex size-[68px] items-center justify-center rounded-full bg-zinc-200 text-xl font-semibold text-zinc-600">
              {name.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold uppercase leading-tight text-[#1d2630]">{name}</p>
            <p className="mt-2 text-xs leading-snug text-[#5f7190]">
              "Helping families find the perfect home with a smooth and stress-free experience."
            </p>
          </div>

          <span className="rounded-full border border-[#ef4444] px-3 py-1 text-[11px] font-medium text-[#ef4444]">
            Expert
          </span>
        </div>

        <div className="border-t border-zinc-300 px-5 py-5">
          <p className="mb-4 text-xs font-semibold uppercase leading-none text-[#111827]">Contact Info</p>
          <div className="space-y-2">
            <div className="grid grid-cols-[120px_1fr] gap-4">
              <span className="text-xs text-[#607394]">Email</span>
              <span className="text-xs font-semibold text-[#1f2937]">{email || "-"}</span>
            </div>
            <div className="grid grid-cols-[120px_1fr] gap-4">
              <span className="text-xs text-[#607394]">Phone No</span>
              <span className="text-xs font-semibold text-[#1f2937]">{phone || "-"}</span>
            </div>
            <div className="grid grid-cols-[120px_1fr] gap-4">
              <span className="text-xs text-[#607394]">Location</span>
              <span className="text-xs font-semibold text-[#1f2937]">{location || "-"}</span>
            </div>
          </div>
        </div>

        <div className="border-t border-zinc-300 px-5 py-5">
          <p className="mb-4 text-xs font-semibold uppercase leading-none text-[#111827]">
            Professional Details
          </p>
          <div className="space-y-2">
            <div className="grid grid-cols-[150px_1fr] gap-4">
              <span className="text-xs text-[#607394]">Specialization</span>
              <span className="text-xs font-semibold text-[#1f2937]">Residential | Luxury | Agriculture</span>
            </div>
            <div className="grid grid-cols-[150px_1fr] gap-4">
              <span className="text-xs text-[#607394]">Experience</span>
              <span className="text-xs font-semibold text-[#1f2937]">8+ Years Experience</span>
            </div>
            <div className="grid grid-cols-[150px_1fr] gap-4">
              <span className="text-xs text-[#607394]">Service Area</span>
              <span className="text-xs font-semibold text-[#1f2937]">Austin, TX / Nearby regions</span>
            </div>
          </div>
        </div>
      </div>
      <p className="sr-only">Last active {lastActive}</p>
    </aside>
  );
}
