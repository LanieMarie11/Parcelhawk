import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createInvestorCheckoutSession,
  isInvestorSubscriptionConfigured,
  type InvestorCheckoutReturnTo,
} from "@/lib/investor-subscription";
import { isStripeConfigured } from "@/lib/stripe";

type SessionUser = {
  id?: string;
  role?: string;
};

function getInvestorId(sessionUser: SessionUser): string | null {
  if (!sessionUser.id || sessionUser.role !== "investor") return null;
  return sessionUser.id;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const sessionUser = (session?.user as SessionUser | undefined) ?? {};
  const investorId = getInvestorId(sessionUser);

  if (!investorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isStripeConfigured() || !isInvestorSubscriptionConfigured()) {
    return NextResponse.json(
      { error: "Subscription billing is not configured" },
      { status: 503 },
    );
  }

  let body: { returnTo?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const returnTo: InvestorCheckoutReturnTo =
    body.returnTo === "portal" ? "portal" : "signup";

  try {
    const checkoutSession = await createInvestorCheckoutSession(
      investorId,
      returnTo,
    );
    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Investor subscription checkout error:", error);
    return NextResponse.json(
      { error: "Failed to start checkout" },
      { status: 500 },
    );
  }
}
