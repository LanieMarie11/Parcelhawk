import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  confirmInvestorCheckoutSession,
  isActiveInvestorSubscription,
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

  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Subscription billing is not configured" },
      { status: 503 },
    );
  }

  let body: { sessionId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const sessionId =
    typeof body.sessionId === "string" ? body.sessionId.trim() : "";
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  try {
    const result = await confirmInvestorCheckoutSession(investorId, sessionId);
    return NextResponse.json({
      subscriptionStatus: result.subscriptionStatus,
      active: isActiveInvestorSubscription(result.subscriptionStatus),
    });
  } catch (error) {
    console.error("Investor subscription confirm error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to confirm subscription";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
