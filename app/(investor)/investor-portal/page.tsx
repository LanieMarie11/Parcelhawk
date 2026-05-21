import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  fetchInvestorDashboardData,
  type InvestorDashboardData,
} from "@/lib/investor-portal/fetch-dashboard-data";
import { emptyMetrics, emptySearchTrends } from "@/lib/investor-portal/dashboard-helpers";
import { InvestorPortalPageClient } from "./components/investor-portal-page-client";

type SessionUser = {
  id?: string;
  role?: string;
};

const emptyDashboard: InvestorDashboardData = {
  metrics: emptyMetrics(),
  stateDemand: [],
  searchTrends: emptySearchTrends(),
};

export default async function InvestorPortalPage() {
  const session = await getServerSession(authOptions);
  const user = (session?.user as SessionUser | undefined) ?? {};

  if (user.role !== "investor" || !user.id) {
    return <InvestorPortalPageClient initialData={emptyDashboard} />;
  }

  try {
    const data = await fetchInvestorDashboardData(user.id);
    return <InvestorPortalPageClient initialData={data} />;
  } catch (error) {
    console.error("Investor portal dashboard server fetch error:", error);
    return <InvestorPortalPageClient initialData={emptyDashboard} />;
  }
}
