import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createInvestorConnectOnboardingLink,
  getInvestorConnectStatus,
} from "@/lib/investor-stripe-connect";
import { isStripeConfigured } from "@/lib/stripe";

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

  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Payments are not configured" }, { status: 503 });
  }

  try {
    const status = await getInvestorConnectStatus(investorId);
    return NextResponse.json({ status });
  } catch (error) {
    console.error("Investor payout status error:", error);
    return NextResponse.json({ error: "Failed to load payout status" }, { status: 500 });
  }
}

export async function POST() {
  const session = await getServerSession(authOptions);
  const sessionUser = (session?.user as SessionUser | undefined) ?? {};
  const investorId = getInvestorId(sessionUser);

  if (!investorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Payments are not configured" }, { status: 503 });
  }

  try {
    const url = await createInvestorConnectOnboardingLink(investorId);
    return NextResponse.json({ url });
  } catch (error) {
    console.error("Investor payout onboarding error:", error);
    return NextResponse.json({ error: "Failed to start payout setup" }, { status: 500 });
  }
}
