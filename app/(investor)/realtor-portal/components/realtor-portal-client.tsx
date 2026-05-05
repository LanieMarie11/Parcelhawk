"use client";

import { useEffect, useState } from "react";
import { BuyersTable } from "./buyers-table";
import type { BuyerRow } from "./buyers-table";
import { EmptySelectionCard } from "./empty-selection-card";
import { HotBuyersPanel } from "./hot-buyers-panel";
import type { HotBuyerItem } from "./hot-buyers-panel";
import { InviteLinkCard } from "./invite-link-card";
import { SelectedBuyerCard } from "./selected-buyer-card";
import { StatsCards } from "./stats-cards";

type BuyersResponse = {
  buyers: BuyerRow[];
  hotBuyers: HotBuyerItem[];
  stats: StatsResponse;
};

type StatsResponse = {
  totalBuyers: number;
  hotBuyers: number;
  viewingRequests: number;
  parcelsPushed: number;
};

export function RealtorPortalClient() {
  const [selectedBuyer, setSelectedBuyer] = useState<BuyerRow | null>(null);
  const [buyerRows, setBuyerRows] = useState<BuyerRow[]>([]);
  const [hotBuyers, setHotBuyers] = useState<HotBuyerItem[]>([]);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadBuyers() {
      try {
        const buyersResponse = await fetch("/api/realtor-portal/buyers", { cache: "no-store" });
        const buyersData = (await buyersResponse.json()) as BuyersResponse & { error?: string };

        if (!buyersResponse.ok) {
          throw new Error(buyersData.error ?? "Failed to load buyers");
        }

        if (isMounted) {
          setBuyerRows(buyersData.buyers ?? []);
          setHotBuyers(buyersData.hotBuyers ?? []);
          setStats(buyersData.stats ?? null);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load buyers");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadBuyers();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-[calc(100vh-73px)] bg-zinc-50 px-4 pb-8 pt-6 font-ibm-plex-sans text-zinc-900 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1400px]">
        <StatsCards stats={stats} isLoading={isLoading} />

        <div className="mt-4 grid gap-4 xl:grid-cols-12">
          <div className="space-y-4 xl:col-span-8">
            <HotBuyersPanel hotBuyers={hotBuyers} isLoading={isLoading} />
            <BuyersTable
              buyerRows={buyerRows}
              isLoading={isLoading}
              error={error}
              selectedBuyerId={selectedBuyer?.id}
              onSelectBuyer={setSelectedBuyer}
            />
          </div>

          <aside className="space-y-4 xl:col-span-4">
            {selectedBuyer ? <SelectedBuyerCard buyer={selectedBuyer} /> : <EmptySelectionCard />}
            <InviteLinkCard />
          </aside>
        </div>
      </div>
    </div>
  );
}
