import { eq } from "drizzle-orm";
import { db } from "@/db";
import { investors } from "@/db/schema";
import { getStripe } from "@/lib/stripe";

export const INVESTOR_SUBSCRIPTION_ACTIVE_STATUSES = new Set([
  "active",
  "trialing",
]);

export function getInvestorSubscriptionPriceId(): string | null {
  return process.env.STRIPE_INVESTOR_SUBSCRIPTION_PRICE_ID?.trim() || null;
}

export function isInvestorSubscriptionConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY?.trim() &&
      getInvestorSubscriptionPriceId(),
  );
}

export function isActiveInvestorSubscription(status: string | null | undefined): boolean {
  if (!status) return false;
  return INVESTOR_SUBSCRIPTION_ACTIVE_STATUSES.has(status);
}

export function getAppBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export async function syncInvestorSubscriptionFromStripe(
  investorId: string,
  subscription: {
    id: string;
    customer: string | { id: string };
    status: string;
  },
) {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  await db
    .update(investors)
    .set({
      subscriptionStatus: subscription.status,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
    })
    .where(eq(investors.id, investorId));
}

export async function getInvestorSubscriptionRow(investorId: string) {
  const [row] = await db
    .select({
      subscriptionStatus: investors.subscriptionStatus,
      stripeCustomerId: investors.stripeCustomerId,
      stripeSubscriptionId: investors.stripeSubscriptionId,
      email: investors.email,
      firstName: investors.firstName,
      lastName: investors.lastName,
    })
    .from(investors)
    .where(eq(investors.id, investorId))
    .limit(1);

  return row ?? null;
}

export type InvestorCheckoutReturnTo = "signup" | "portal";

function getCheckoutReturnPath(returnTo: InvestorCheckoutReturnTo): string {
  return returnTo === "portal" ? "/realtor-portal/subscribe" : "/sign-up";
}

export async function createInvestorCheckoutSession(
  investorId: string,
  returnTo: InvestorCheckoutReturnTo = "signup",
) {
  const investor = await getInvestorSubscriptionRow(investorId);
  if (!investor) {
    throw new Error("Investor not found");
  }

  const priceId = getInvestorSubscriptionPriceId();
  if (!priceId) {
    throw new Error("STRIPE_INVESTOR_SUBSCRIPTION_PRICE_ID is not configured");
  }

  const stripe = getStripe();
  const baseUrl = getAppBaseUrl();
  const returnPath = getCheckoutReturnPath(returnTo);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: investor.stripeCustomerId ?? undefined,
    customer_email: investor.stripeCustomerId ? undefined : investor.email,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}${returnPath}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}${returnPath}?checkout=cancel`,
    metadata: {
      investorId,
      product: "investor_subscription",
    },
    subscription_data: {
      metadata: {
        investorId,
        product: "investor_subscription",
      },
    },
  });

  if (!session.url) {
    throw new Error("Failed to create checkout session");
  }

  return session;
}

export async function confirmInvestorCheckoutSession(
  investorId: string,
  sessionId: string,
) {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription"],
  });

  if (session.metadata?.investorId !== investorId) {
    throw new Error("Checkout session does not belong to this investor");
  }

  if (session.mode !== "subscription") {
    throw new Error("Invalid checkout session mode");
  }

  if (session.status !== "complete") {
    throw new Error("Checkout session is not complete");
  }

  const subscription = session.subscription;
  if (!subscription || typeof subscription === "string") {
    throw new Error("Subscription not found on checkout session");
  }

  await syncInvestorSubscriptionFromStripe(investorId, subscription);

  return {
    subscriptionStatus: subscription.status,
    stripeSubscriptionId: subscription.id,
  };
}
