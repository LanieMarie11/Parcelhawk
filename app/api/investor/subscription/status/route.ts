import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getInvestorSubscriptionRow,
  isActiveInvestorSubscription,
} from "@/lib/investor-subscription";

type SessionUser = {
  id?: string;
  role?: string;
};

function getInvestorId(sessionUser: SessionUser): string | null {
  if (!sessionUser.id || sessionUser.role !== "investor") return null;
  return sessionUser.id;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const sessionUser = (session?.user as SessionUser | undefined) ?? {};
  const investorId = getInvestorId(sessionUser);

  if (!investorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const row = await getInvestorSubscriptionRow(investorId);
    if (!row) {
      return NextResponse.json({ error: "Investor not found" }, { status: 404 });
    }

    return NextResponse.json({
      subscriptionStatus: row.subscriptionStatus,
      active: isActiveInvestorSubscription(row.subscriptionStatus),
    });
  } catch (error) {
    console.error("Investor subscription status error:", error);
    return NextResponse.json(
      { error: "Failed to load subscription status" },
      { status: 500 },
    );
  }
}
