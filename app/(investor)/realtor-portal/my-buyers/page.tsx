"use client";

import { useEffect, useMemo, useState } from "react";

import { BuyerDetailMain } from "./components/buyer-detail-main";
import { BuyersListSidebar } from "./components/buyers-list-sidebar";
import type { BuyerDetail } from "./components/types";

type MyBuyersApiResponse = {
  buyers?: Array<{
    id: string;
    name: string;
    lastActiveAt: string;
    email: string;
    phone: string;
    location: string;
    preferenceBudget: string;
    preferenceAcreage: string;
    preferencePurpose: string;
    preferenceTimeframe: string;
    savedProperties: null;
    activity: null;
  }>;
  error?: string;
};

export default function MyBuyersPage() {
  const [buyers, setBuyers] = useState<BuyerDetail[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadBuyers() {
      try {
        const response = await fetch("/api/realtor-portal/my-buyers", { cache: "no-store" });
        const data = (await response.json()) as MyBuyersApiResponse;
        if (!response.ok) {
          throw new Error(data.error ?? "Failed to load buyers");
        }

        const mapped: BuyerDetail[] = (data.buyers ?? []).map((buyer, index) => ({
          id: buyer.id,
          name: buyer.name,
          locationSubtitle: buyer.location || "Unknown location",
          lastActiveAt: buyer.lastActiveAt || "",
          email: buyer.email,
          phone: buyer.phone || "",
          location: buyer.location || "",
          priority: Math.max(50, 100 - index * 3),
          stats: { searches: 0, scheduled: 0, unread: 0 },
          filters: [
            buyer.preferenceBudget || "No budget",
            buyer.preferenceAcreage || "No acreage",
            buyer.preferencePurpose || buyer.preferenceTimeframe || "No preference",
          ],
          savedProperties: [],
          activity: [],
        }));

        if (!isMounted) return;
        setBuyers(mapped);
        setSelectedId((current) =>
          current && mapped.some((buyer) => buyer.id === current) ? current : (mapped[0]?.id ?? ""),
        );
      } catch {
        if (!isMounted) return;
        setBuyers([]);
        setSelectedId("");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadBuyers();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredBuyers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return buyers;
    return buyers.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.email.toLowerCase().includes(q) ||
        b.location.toLowerCase().includes(q),
    );
  }, [buyers, search]);

  const selected = filteredBuyers.find((b) => b.id === selectedId) ?? filteredBuyers[0];

  return (
    <div className="min-h-[calc(100vh-73px)] bg-zinc-50 px-4 pb-10 pt-6 font-ibm-plex-sans text-zinc-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1400px] gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm lg:p-6">
        {isLoading ? (
          <div className="p-4 text-sm text-zinc-500">Loading buyers...</div>
        ) : !selected ? (
          <div className="p-4 text-sm text-zinc-500">No connected buyers found.</div>
        ) : (
          <>
            <BuyersListSidebar
              buyers={filteredBuyers}
              selectedId={selected.id}
              onSelectId={setSelectedId}
            />
            <BuyerDetailMain selected={selected} search={search} onSearchChange={setSearch} />
          </>
        )}
      </div>
    </div>
  );
}
