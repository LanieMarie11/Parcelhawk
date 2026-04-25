import { BuyersTable } from "./components/buyers-table";
import { HotBuyersPanel } from "./components/hot-buyers-panel";
import { InviteLinkCard } from "./components/invite-link-card";
import { SelectedBuyerCard } from "./components/selected-buyer-card";
import { StatsCards } from "./components/stats-cards";

export default function RealtorPortalPage() {
  return (
    <div className="min-h-[calc(100vh-73px)] bg-zinc-50 px-4 pb-8 pt-6 font-ibm-plex-sans text-zinc-900 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1400px]">
        <StatsCards />

        <div className="mt-4 grid gap-4 xl:grid-cols-12">
          <div className="space-y-4 xl:col-span-8">
            <HotBuyersPanel />
            <BuyersTable />
          </div>

          <aside className="space-y-4 xl:col-span-4">
            <SelectedBuyerCard />
            <InviteLinkCard />
          </aside>
        </div>
      </div>
    </div>
  );
}
