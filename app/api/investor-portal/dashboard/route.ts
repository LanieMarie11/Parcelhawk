import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchInvestorDashboardData } from "@/lib/investor-portal/fetch-dashboard-data";

type SessionUser = {
  id?: string;
  role?: string;
};

export async function GET() {
  const session = await getServerSession(authOptions);
  const sessionUser = (session?.user as SessionUser | undefined) ?? {};
  const investorId = sessionUser.id;

  if (!investorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (sessionUser.role !== "investor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const data = await fetchInvestorDashboardData(investorId);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Investor portal dashboard fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard metrics" }, { status: 500 });
  }
}
