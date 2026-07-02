import { eq } from "drizzle-orm";
import { db } from "@/db";
import { investors } from "@/db/schema";
import { getActiveRealtorInvestorId } from "@/lib/buyer-investor-connection";
import {
  PROPERTY_REPORT_PLATFORM_SHARE_CENTS,
  PROPERTY_REPORT_PRICE_CENTS,
  PROPERTY_REPORT_REALTOR_SHARE_CENTS,
} from "@/lib/property-reports/constants";
import { getStripe } from "@/lib/stripe";

export type PropertyReportPaymentSplit = {
  realtorInvestorId: string | null;
  platformAmountCents: number;
  realtorAmountCents: number;
  destinationAccountId: string | null;
};

const FULL_PLATFORM_SPLIT: PropertyReportPaymentSplit = {
  realtorInvestorId: null,
  platformAmountCents: PROPERTY_REPORT_PRICE_CENTS,
  realtorAmountCents: 0,
  destinationAccountId: null,
};

export async function resolvePropertyReportPaymentSplit(
  buyerId: string,
): Promise<PropertyReportPaymentSplit> {
  const realtorInvestorId = await getActiveRealtorInvestorId(buyerId);
  if (!realtorInvestorId) {
    return FULL_PLATFORM_SPLIT;
  }

  const [investor] = await db
    .select({ stripeConnectAccountId: investors.stripeConnectAccountId })
    .from(investors)
    .where(eq(investors.id, realtorInvestorId))
    .limit(1);

  const accountId = investor?.stripeConnectAccountId?.trim();
  if (!accountId) {
    return FULL_PLATFORM_SPLIT;
  }

  try {
    const stripe = getStripe();
    const account = await stripe.accounts.retrieve(accountId);
    if (!account.charges_enabled) {
      return FULL_PLATFORM_SPLIT;
    }
  } catch (error) {
    console.error("Failed to verify realtor Connect account:", error);
    return FULL_PLATFORM_SPLIT;
  }

  return {
    realtorInvestorId,
    platformAmountCents: PROPERTY_REPORT_PLATFORM_SHARE_CENTS,
    realtorAmountCents: PROPERTY_REPORT_REALTOR_SHARE_CENTS,
    destinationAccountId: accountId,
  };
}

export function buildConnectPaymentIntentParams(split: PropertyReportPaymentSplit) {
  if (!split.destinationAccountId || split.realtorAmountCents <= 0) {
    return {};
  }

  return {
    application_fee_amount: split.platformAmountCents,
    transfer_data: {
      destination: split.destinationAccountId,
    },
  };
}

export function buildPaymentSplitMetadata(split: PropertyReportPaymentSplit) {
  return {
    realtorInvestorId: split.realtorInvestorId ?? "",
    platformAmountCents: String(split.platformAmountCents),
    realtorAmountCents: String(split.realtorAmountCents),
  };
}
