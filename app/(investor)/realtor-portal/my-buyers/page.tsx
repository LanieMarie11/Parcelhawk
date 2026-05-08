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
    avatarUrl: string;
    preferenceBudget: string;
    preferenceAcreage: string;
    preferencePurpose: string;
    preferenceTimeframe: string;
    savedProperties: null;
    activity: null;
  }>;
  error?: string;
};

type BuyerDetailApiResponse = {
  buyer?: {
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
    unreadMessages: number;
    savedPropertiesCount: number;
    savedSearches: number;
    viewingRequests: BuyerDetail["viewingRequests"];
    savedProperties: BuyerDetail["savedProperties"];
    activity: BuyerDetail["activity"];
  };
  error?: string;
};

export default function MyBuyersPage() {
  const [buyers, setBuyers] = useState<BuyerDetail[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [selectedDetail, setSelectedDetail] = useState<BuyerDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
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
          avatarUrl: buyer.avatarUrl,
          phone: buyer.phone || "",
          location: buyer.location || "",
          preferenceBudget: buyer.preferenceBudget || "",
          preferenceAcreage: buyer.preferenceAcreage || "",
          preferencePurpose: buyer.preferencePurpose || "",
          preferenceTimeframe: buyer.preferenceTimeframe || "",
          priority: Math.max(50, 100 - index * 3),
          unreadMessages: 0,
          savedPropertiesCount: 0,
          savedSearches: 0,
          viewingRequests: { pending: 0, scheduled: 0, completed: 0 },
          stats: { searches: 0, scheduled: 0, unread: 0 },
          filters: [
            buyer.preferenceBudget || "No budget",
            buyer.preferenceAcreage || "No acreage",
            buyer.preferencePurpose || buyer.preferenceTimeframe || "No preference",
            buyer.preferenceTimeframe || "No timeframe",
          ],
          savedProperties: [],
          activity: [],
        }));

        if (!isMounted) return;
        setBuyers(mapped);
        setSelectedId((current) => (current && mapped.some((buyer) => buyer.id === current) ? current : ""));
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

  const selected = filteredBuyers.find((b) => b.id === selectedId);

  useEffect(() => {
    let isMounted = true;

    async function loadSelectedBuyerDetail() {
      if (!selectedId) {
        if (isMounted) {
          setSelectedDetail(null);
          setIsLoadingDetail(false);
        }
        return;
      }

      const selectedSummary = buyers.find((buyer) => buyer.id === selectedId);
      if (!selectedSummary) {
        if (isMounted) setSelectedDetail(null);
        return;
      }

      setIsLoadingDetail(true);
      try {
        const response = await fetch(`/api/realtor-portal/my-buyers/${encodeURIComponent(selectedId)}`, {
          cache: "no-store",
        });
        const data = (await response.json()) as BuyerDetailApiResponse;
        if (!response.ok || !data.buyer) {
          throw new Error(data.error ?? "Failed to load buyer details");
        }

        const detail: BuyerDetail = {
          ...selectedSummary,
          preferenceBudget: data.buyer.preferenceBudget ?? selectedSummary.preferenceBudget,
          preferenceAcreage: data.buyer.preferenceAcreage ?? selectedSummary.preferenceAcreage,
          preferencePurpose: data.buyer.preferencePurpose ?? selectedSummary.preferencePurpose,
          preferenceTimeframe: data.buyer.preferenceTimeframe ?? selectedSummary.preferenceTimeframe,
          unreadMessages: data.buyer.unreadMessages ?? 0,
          savedPropertiesCount: data.buyer.savedPropertiesCount ?? 0,
          savedSearches: data.buyer.savedSearches ?? 0,
          viewingRequests: data.buyer.viewingRequests ?? { pending: 0, scheduled: 0, completed: 0 },
          savedProperties: data.buyer.savedProperties ?? [],
          activity: data.buyer.activity ?? [],
        };
        if (isMounted) setSelectedDetail(detail);
      } catch {
        if (!isMounted) return;
        setSelectedDetail({
          ...selectedSummary,
          savedPropertiesCount: 0,
          savedSearches: 0,
          savedProperties: [],
          activity: [],
        });
      } finally {
        if (isMounted) setIsLoadingDetail(false);
      }
    }

    void loadSelectedBuyerDetail();
    return () => {
      isMounted = false;
    };
  }, [buyers, selectedId]);

  return (
    <div className="min-h-[calc(100vh-73px)] bg-zinc-50 px-4 pb-6 pt-4 font-ibm-plex-sans text-zinc-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-h-[calc(100vh-120px)] min-h-[calc(100vh-150px)] w-full max-w-[1400px] gap-4 overflow-hidden rounded-xl border border-zinc-200 bg-white p-4 shadow-sm lg:p-6">
        {isLoading ? (
          <div className="p-4 text-sm text-zinc-500">Loading buyers...</div>
        ) : filteredBuyers.length === 0 ? (
          <div className="p-4 text-sm text-zinc-500">No connected buyers found.</div>
        ) : (
          <>
            <BuyersListSidebar
              buyers={filteredBuyers}
              selectedId={selectedId}
              onSelectId={setSelectedId}
            />
            {selected ? (
              isLoadingDetail || !selectedDetail ? (
                <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-6 text-center text-sm text-zinc-500">
                  Loading buyer details...
                </div>
              ) : (
                <BuyerDetailMain selected={selectedDetail} search={search} onSearchChange={setSearch} />
              )
            ) : (
              <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-6 text-center text-sm text-zinc-500">
                Select a buyer to view details.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
