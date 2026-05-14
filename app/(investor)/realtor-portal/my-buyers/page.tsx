"use client";

import { useEffect, useMemo, useState } from "react";

import { PageLoadingIndicator } from "@/components/page-loading-indicator";
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
  const [isLoadingHeavyDetail, setIsLoadingHeavyDetail] = useState(false);
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
          setIsLoadingHeavyDetail(false);
        }
        return;
      }

      const selectedSummary = buyers.find((buyer) => buyer.id === selectedId);
      if (!selectedSummary) {
        if (isMounted) {
          setSelectedDetail(null);
          setIsLoadingDetail(false);
          setIsLoadingHeavyDetail(false);
        }
        return;
      }

      setIsLoadingDetail(true);
      setIsLoadingHeavyDetail(true);
      try {
        const coreResponse = await fetch(
          `/api/realtor-portal/my-buyers/${encodeURIComponent(selectedId)}?detailLevel=core`,
          {
            cache: "no-store",
          },
        );
        const coreData = (await coreResponse.json()) as BuyerDetailApiResponse;
        if (!coreResponse.ok || !coreData.buyer) {
          throw new Error(coreData.error ?? "Failed to load buyer details");
        }

        const coreDetail: BuyerDetail = {
          ...selectedSummary,
          preferenceBudget: coreData.buyer.preferenceBudget ?? selectedSummary.preferenceBudget,
          preferenceAcreage: coreData.buyer.preferenceAcreage ?? selectedSummary.preferenceAcreage,
          preferencePurpose: coreData.buyer.preferencePurpose ?? selectedSummary.preferencePurpose,
          preferenceTimeframe: coreData.buyer.preferenceTimeframe ?? selectedSummary.preferenceTimeframe,
          unreadMessages: coreData.buyer.unreadMessages ?? 0,
          savedPropertiesCount: coreData.buyer.savedPropertiesCount ?? 0,
          savedSearches: coreData.buyer.savedSearches ?? 0,
          viewingRequests: coreData.buyer.viewingRequests ?? { pending: 0, scheduled: 0, completed: 0 },
          savedProperties: coreData.buyer.savedProperties ?? [],
          activity: coreData.buyer.activity ?? [],
        };
        if (!isMounted) return;
        setSelectedDetail(coreDetail);
        setIsLoadingDetail(false);

        try {
          const fullResponse = await fetch(`/api/realtor-portal/my-buyers/${encodeURIComponent(selectedId)}`, {
            cache: "no-store",
          });
          const fullData = (await fullResponse.json()) as BuyerDetailApiResponse;
          if (!fullResponse.ok || !fullData.buyer) {
            throw new Error(fullData.error ?? "Failed to load buyer details");
          }

          const fullDetail: BuyerDetail = {
            ...selectedSummary,
            preferenceBudget: fullData.buyer.preferenceBudget ?? selectedSummary.preferenceBudget,
            preferenceAcreage: fullData.buyer.preferenceAcreage ?? selectedSummary.preferenceAcreage,
            preferencePurpose: fullData.buyer.preferencePurpose ?? selectedSummary.preferencePurpose,
            preferenceTimeframe: fullData.buyer.preferenceTimeframe ?? selectedSummary.preferenceTimeframe,
            unreadMessages: fullData.buyer.unreadMessages ?? 0,
            savedPropertiesCount: fullData.buyer.savedPropertiesCount ?? 0,
            savedSearches: fullData.buyer.savedSearches ?? 0,
            viewingRequests: fullData.buyer.viewingRequests ?? { pending: 0, scheduled: 0, completed: 0 },
            savedProperties: fullData.buyer.savedProperties ?? [],
            activity: fullData.buyer.activity ?? [],
          };
          if (isMounted) setSelectedDetail(fullDetail);
        } catch {
          // Keep core details rendered even if heavy detail hydration fails.
        }
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
        if (isMounted) setIsLoadingHeavyDetail(false);
      }

      if (!isMounted) return;
      setIsLoadingDetail(false);
    }

    void loadSelectedBuyerDetail();
    return () => {
      isMounted = false;
    };
  }, [buyers, selectedId]);

  return (
    <div className="min-h-[calc(100vh-73px)] bg-zinc-50 px-4 pb-6 pt-6 font-ibm-plex-sans text-zinc-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex h-full min-h-[calc(100vh-150px)] w-full max-w-[1400px] gap-4 overflow-hidden rounded-xl border border-zinc-200 bg-white p-4 shadow-sm lg:p-6">
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
                <div className="relative flex min-h-0 flex-1 items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-6">
                  <PageLoadingIndicator label="Loading buyer details..." fixed={false} />
                </div>
              ) : (
                <BuyerDetailMain
                  selected={selectedDetail}
                  search={search}
                  onSearchChange={setSearch}
                  isLoadingHeavy={isLoadingHeavyDetail}
                />
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
