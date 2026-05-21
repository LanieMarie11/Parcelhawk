"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowUpRight, Search, Sparkles } from "lucide-react";
import { useLandPropertySearchHandoff } from "@/lib/land-property-search-context";
import ParcelLogo from "@/public/images/logo.png";

const SUGGESTIONS = [
  "10-15 acres in Bastrop County, TX with a pond and seller financing",
  "5-10 acres in Polk County, FL — no flood, no wetlands, seller financing",
  "20-50 unrestricted acres in Tennessee with a water source",
] as const;

const SEARCH_PLACEHOLDER =
  "5-10 acres in Cochise County, AZ with seller financing, under $30k";

const SELLER_FINANCING_RE = /(seller financing)/gi;

function QueryTextWithSellerFinancingHighlight({
  text,
  placeholder = false,
}: {
  text: string;
  placeholder?: boolean;
}) {
  const parts = text.split(SELLER_FINANCING_RE);
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === "seller financing" ? (
          <span
            key={i}
            className={
              placeholder
                ? "font-regular text-brand-green opacity-60"
                : "font-regular text-brand-green"
            }
          >
            {part}
          </span>
        ) : (
          <span key={i} className={placeholder ? "text-neutral-400" : undefined}>
            {part}
          </span>
        ),
      )}
    </>
  );
}

export function LandingHome() {
  const router = useRouter();
  const { setPendingPrompt } = useLandPropertySearchHandoff();
  const [query, setQuery] = useState("");
  const highlightedPlaceholder = (
    <QueryTextWithSellerFinancingHighlight text={SEARCH_PLACEHOLDER} placeholder />
  );
  const highlightedQueryText = query ? (
    <QueryTextWithSellerFinancingHighlight text={query} />
  ) : (
    highlightedPlaceholder
  );

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
          <div className="relative min-w-0 flex-1">
            <div
              className="pointer-events-none absolute inset-0 flex items-center overflow-hidden text-base"
              aria-hidden
            >
              <span className="truncate">{highlightedQueryText}</span>
            </div>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitSearch(query)}
              className="relative w-full bg-transparent py-3 text-base text-transparent caret-neutral-800 outline-none"
              aria-label="Describe the land you want"
            />
          </div>
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
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-green text-white shadow-md transition-transform hover:scale-105 active:scale-95"
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
                }}
                className="flex w-full items-center justify-between gap-4 rounded-2xl border border-neutral-200/90 bg-white px-5 py-4 text-left text-sm text-neutral-800 shadow-sm transition-shadow hover:shadow-md md:text-base"
              >
                <span>
                  &ldquo;
                  <QueryTextWithSellerFinancingHighlight text={text} />
                  &rdquo;
                </span>
                <ArrowUpRight className="h-5 w-5 shrink-0 text-brand-green" />
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
