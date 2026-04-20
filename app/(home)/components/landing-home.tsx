"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowUpRight, Search, Sparkles } from "lucide-react";
import { useLandPropertySearchHandoff } from "@/lib/land-property-search-context";
import ParcelLogo from "@/public/images/logo.png";

const SUGGESTIONS = [
  "Flat land with electric hookup in Texas, at least 10 acres",
  "Off-grid property in Montana, 40+ acres, no flood risk",
  "Recreational land near a river in Tennessee under $50k",
] as const;

export function LandingHome() {
  const router = useRouter();
  const { setPendingPrompt } = useLandPropertySearchHandoff();
  const [query, setQuery] = useState("");

  const submitSearch = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setPendingPrompt(trimmed);
    router.push("/land-property");
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#F9F9F9] font-sans text-neutral-900">
      <section className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 pb-12 pt-10 md:pt-14">
        <div className="mb-6">
          <Image
            src={ParcelLogo}
            alt=""
            width={56}
            height={56}
            className="mx-auto h-12 w-auto"
            priority
          />
        </div>

        <h1 className="text-center text-4xl font-medium uppercase font-phudu tracking-tight text-neutral-900 md:text-4xl md:leading-tight">
          Find your perfect piece of land
        </h1>
        <p className="mt-4 max-w-xl text-center text-base text-neutral-500 md:text-lg font-ibm-plex-sans">
          Describe what you&apos;re looking for in plain English. Our AI finds the best matches, ranked
          just for you.
        </p>

        <div className="mt-10 flex w-full max-w-2xl items-center gap-2 rounded-full border border-neutral-200/80 bg-white py-1.5 pl-4 pr-1.5 shadow-sm">
          <Search className="h-5 w-5 shrink-0 text-neutral-400" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitSearch(query)}
            placeholder="20 acres with road access in Colorado under $80k..."
            className="min-w-0 flex-1 bg-transparent py-3 text-base text-neutral-800 outline-none placeholder:text-neutral-400"
            aria-label="Describe the land you want"
          />
          <button
            type="button"
            onClick={() => {
              const trimmed = query.trim();
              if (!trimmed) {
                router.push("/land-property");
                return;
              }
              submitSearch(trimmed);
            }}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#2D4A31] text-white shadow-md transition-transform hover:scale-105 active:scale-95"
            aria-label="Search"
          >
            <ArrowUpRight className="h-5 w-5" strokeWidth={2.25} />
          </button>
        </div>

        <p className="mt-4 flex items-center gap-2 text-sm text-neutral-400">
          <Sparkles className="h-4 w-4 text-amber-500/90" aria-hidden />
          AI-powered land analysis active
        </p>
      </section>

      <section className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16">
        <p className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
          Try searching for ...
        </p>
        <ul className="flex flex-col gap-3">
          {SUGGESTIONS.map((text) => (
            <li key={text}>
              <button
                type="button"
                onClick={() => {
                  setQuery(text);
                  submitSearch(text);
                }}
                className="flex w-full items-center justify-between gap-4 rounded-2xl border border-neutral-200/90 bg-white px-5 py-4 text-left text-sm text-neutral-800 shadow-sm transition-shadow hover:shadow-md md:text-base"
              >
                <span>&ldquo;{text}&rdquo;</span>
                <ArrowUpRight className="h-5 w-5 shrink-0 text-neutral-400" />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <footer className="border-t border-neutral-200/80 bg-[#EFEFEF]">
        <div className="mx-auto grid max-w-5xl grid-cols-1 divide-y divide-neutral-300/80 md:grid-cols-3 md:divide-x md:divide-y-0">
          <div className="px-6 py-10 text-center md:py-12">
            <p className="text-3xl font-bold tabular-nums text-neutral-900 md:text-4xl">48,200+</p>
            <p className="mt-1 text-sm text-neutral-500">Active listings</p>
          </div>
          <div className="px-6 py-10 text-center md:py-12">
            <p className="text-3xl font-bold text-neutral-900 md:text-4xl">38 states</p>
            <p className="mt-1 text-sm text-neutral-500">Nationwide coverage</p>
          </div>
          <div className="px-6 py-10 text-center md:py-12">
            <p className="text-3xl font-bold text-neutral-900 md:text-4xl">98% Match</p>
            <p className="mt-1 text-sm text-neutral-500">AI-ranked results</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
