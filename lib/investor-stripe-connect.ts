import { eq } from "drizzle-orm";
import { db } from "@/db";
import { investors } from "@/db/schema";
import { getAppBaseUrl } from "@/lib/investor-subscription";
import { getStripe } from "@/lib/stripe";

export type InvestorConnectStatus = {
  connected: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
};

export async function getInvestorConnectStatus(
  investorId: string,
): Promise<InvestorConnectStatus> {
  const [investor] = await db
    .select({
      stripeConnectAccountId: investors.stripeConnectAccountId,
    })
    .from(investors)
    .where(eq(investors.id, investorId))
    .limit(1);

  const accountId = investor?.stripeConnectAccountId?.trim();
  if (!accountId) {
    return {
      connected: false,
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
    };
  }

  try {
    const stripe = getStripe();
    const account = await stripe.accounts.retrieve(accountId);
    return {
      connected: true,
      chargesEnabled: account.charges_enabled ?? false,
      payoutsEnabled: account.payouts_enabled ?? false,
      detailsSubmitted: account.details_submitted ?? false,
    };
  } catch (error) {
    console.error("Failed to load investor Connect status:", error);
    return {
      connected: true,
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
    };
  }
}

async function getOrCreateInvestorConnectAccount(investorId: string): Promise<string> {
  const [investor] = await db
    .select({
      email: investors.email,
      stripeConnectAccountId: investors.stripeConnectAccountId,
    })
    .from(investors)
    .where(eq(investors.id, investorId))
    .limit(1);

  if (!investor) {
    throw new Error("Investor not found");
  }

  const existingAccountId = investor.stripeConnectAccountId?.trim();
  if (existingAccountId) {
    return existingAccountId;
  }

  const stripe = getStripe();
  const account = await stripe.accounts.create({
    type: "express",
    country: "US",
    email: investor.email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    metadata: {
      investorId,
    },
  });

  await db
    .update(investors)
    .set({
      stripeConnectAccountId: account.id,
    })
    .where(eq(investors.id, investorId));

  return account.id;
}

export async function createInvestorConnectOnboardingLink(
  investorId: string,
): Promise<string> {
  const accountId = await getOrCreateInvestorConnectAccount(investorId);
  const stripe = getStripe();
  const returnUrl = `${getAppBaseUrl()}/realtor-portal/settings#payout-settings`;

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: returnUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  });

  if (!accountLink.url) {
    throw new Error("Failed to create Stripe onboarding link");
  }

  return accountLink.url;
}
