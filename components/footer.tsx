"use client"

import { Linkedin, Instagram, Facebook, Twitter } from "lucide-react"
import parcelLogo from "@/public/images/parcel.png"
import Image from "next/image"

export default function Footer({ className = "" }: { className?: string }) {
  return (
    <footer className={`bg-[#1a1a1a] text-[#e5e5e5] px-6 py-10 md:px-16 lg:px-24 ${className}`.trim()}>
      {/* Top Section: JOIN US + Email */}
      <div className="flex flex-col font-ibm-plex-sans gap-8 lg:flex-row lg:items-start lg:justify-between">
        {/* Left */}
        <div>
          <h2 className="text-[32px] font-medium font-phudu uppercase tracking-wide text-white">
            Join Us
          </h2>
          <p className="mt-2 text-lg text-[#FFFFFF]">
            {"We'll send you Daily special offers."}
          </p>
        </div>

        {/* Right: Email Form */}
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="email"
              placeholder="Enter your email"
              className="h-12 w-full rounded-lg border border-[#333] bg-[#2a2a2a] px-4 text-base text-[#B0B0B0] placeholder-[#777] outline-none focus:border-[#555] sm:w-72"
            />
            <button className="h-12 rounded-lg bg-white px-8 text-lg font-medium text-[#000000] transition-colors hover:bg-[#e5e5e5]">
              Subscribe
            </button>
          </div>
          <p className="text-base text-[#FFFFFF]">
            We care about your data in our{" "}
            <a href="#" className="underline underline-offset-2 hover:text-white">
              privacy policy
            </a>
          </p>
        </div>
      </div>

      {/* Middle Section: Logo + Social Icons */}
      <div className="mt-12 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        {/* Logo */}
        <div className="flex items-baseline gap-0">
          <Image src={parcelLogo} alt="Parcel" width={100} height={36} className="h-8 w-auto" />
        </div>

        {/* Social Icons */}
        <div className="flex items-center gap-5">
          <a
            href="#"
            aria-label="LinkedIn"
            className="text-[#e5e5e5] transition-colors hover:text-white"
          >
            <Linkedin className="h-5 w-5" />
          </a>
          <a
            href="#"
            aria-label="Instagram"
            className="text-[#e5e5e5] transition-colors hover:text-white"
          >
            <Instagram className="h-5 w-5" />
          </a>
          <a
            href="#"
            aria-label="Facebook"
            className="text-[#e5e5e5] transition-colors hover:text-white"
          >
            <Facebook className="h-5 w-5" />
          </a>
          <a
            href="#"
            aria-label="Twitter"
            className="text-[#e5e5e5] transition-colors hover:text-white"
          >
            <Twitter className="h-5 w-5" />
          </a>
        </div>
      </div>

      {/* Divider */}
      <hr className="mt-8 border-[#333]" />

      {/* Copyright */}
      <p className="mt-6 text-center text-lg text-[#FFFFFF] font-ibm-plex-sans">
        {"Copyright \u00A9_2026 ParcelHawk.io"}
      </p>
    </footer>
  )
}
