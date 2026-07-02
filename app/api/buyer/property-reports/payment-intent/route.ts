import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { buyerPropertyReportPayments } from "@/db/schema";
import {
  getBuyerSavedPaymentMethodForBuyer,
  getOrCreateBuyerStripeCustomer,
  syncBuyerPaymentMethodFromIntent,
} from "@/lib/buyer-stripe-customer";
import {
  PROPERTY_REPORT_CURRENCY,
  PROPERTY_REPORT_PRICE_CENTS,
} from "@/lib/property-reports/constants";
import {
  assertFavoriteAccess,
  getBuyerId,
  getSavedPropertyReport,
  getSucceededPropertyReportPayment,
  parseListingId,
} from "@/lib/property-reports/property-report-access";
import {
  buildConnectPaymentIntentParams,
  buildPaymentSplitMetadata,
  resolvePropertyReportPaymentSplit,
  type PropertyReportPaymentSplit,
} from "@/lib/property-reports/resolve-payment-split";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

const paymentIntentMetadata = (buyerId: string, listingId: number) => ({
  userId: buyerId,
  listingId: String(listingId),
  product: "property_report",
});

async function upsertPendingPayment(
  buyerId: string,
  listingId: number,
  paymentIntentId: string,
  split: PropertyReportPaymentSplit,
) {
  const now = new Date();
  await db
    .insert(buyerPropertyReportPayments)
    .values({
      userId: buyerId,
      listingId,
      stripePaymentIntentId: paymentIntentId,
      amountCents: PROPERTY_REPORT_PRICE_CENTS,
      platformAmountCents: split.platformAmountCents,
      realtorAmountCents: split.realtorAmountCents,
      realtorInvestorId: split.realtorInvestorId,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [buyerPropertyReportPayments.userId, buyerPropertyReportPayments.listingId],
      set: {
        stripePaymentIntentId: paymentIntentId,
        amountCents: PROPERTY_REPORT_PRICE_CENTS,
        platformAmountCents: split.platformAmountCents,
        realtorAmountCents: split.realtorAmountCents,
        realtorInvestorId: split.realtorInvestorId,
        status: "pending",
        updatedAt: now,
      },
    });
}

export async function POST(request: Request) {
  const buyerId = await getBuyerId();
  if (!buyerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Payments are not configured" }, { status: 503 });
  }

  let body: { listingId?: unknown; useSavedCard?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const listingId = parseListingId(body.listingId);
  if (listingId == null) {
    return NextResponse.json({ error: "listingId is required" }, { status: 400 });
  }

  const useSavedCard = body.useSavedCard === true;

  try {
    const favoriteError = await assertFavoriteAccess(buyerId, listingId);
    if (favoriteError) return favoriteError;

    const savedReport = await getSavedPropertyReport(buyerId, listingId);
    if (savedReport) {
      return NextResponse.json({ error: "Report already purchased for this property" }, { status: 409 });
    }

    const existingPayment = await getSucceededPropertyReportPayment(buyerId, listingId);
    if (existingPayment) {
      return NextResponse.json(
        {
          clientSecret: null,
          paymentIntentId: existingPayment.stripePaymentIntentId,
          alreadyPaid: true,
        },
        { status: 200 },
      );
    }

    const stripe = getStripe();
    const customerId = await getOrCreateBuyerStripeCustomer(buyerId);
    const savedPaymentMethod = await getBuyerSavedPaymentMethodForBuyer(buyerId);
    const split = await resolvePropertyReportPaymentSplit(buyerId);
    const connectParams = buildConnectPaymentIntentParams(split);
    const splitMetadata = buildPaymentSplitMetadata(split);

    if (useSavedCard) {
      if (!savedPaymentMethod) {
        return NextResponse.json({ error: "No saved payment method found" }, { status: 400 });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: PROPERTY_REPORT_PRICE_CENTS,
        currency: PROPERTY_REPORT_CURRENCY,
        customer: customerId,
        payment_method: savedPaymentMethod.id,
        payment_method_types: ["card"],
        confirm: true,
        off_session: false,
        metadata: {
          ...paymentIntentMetadata(buyerId, listingId),
          ...splitMetadata,
        },
        ...connectParams,
      });

      await upsertPendingPayment(buyerId, listingId, paymentIntent.id, split);

      if (paymentIntent.status === "succeeded") {
        await syncBuyerPaymentMethodFromIntent(buyerId, paymentIntent.id);
        return NextResponse.json({
          clientSecret: null,
          paymentIntentId: paymentIntent.id,
          amountCents: PROPERTY_REPORT_PRICE_CENTS,
          alreadyPaid: false,
          chargedWithSavedCard: true,
          requiresAction: false,
          savedPaymentMethod,
        });
      }

      if (paymentIntent.status === "requires_action" && paymentIntent.client_secret) {
        return NextResponse.json({
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
          amountCents: PROPERTY_REPORT_PRICE_CENTS,
          alreadyPaid: false,
          chargedWithSavedCard: true,
          requiresAction: true,
          savedPaymentMethod,
        });
      }

      return NextResponse.json({ error: "Payment could not be completed" }, { status: 402 });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: PROPERTY_REPORT_PRICE_CENTS,
      currency: PROPERTY_REPORT_CURRENCY,
      customer: customerId,
      automatic_payment_methods: { enabled: true, allow_redirects: "never" },
      setup_future_usage: "off_session",
      metadata: {
        ...paymentIntentMetadata(buyerId, listingId),
        ...splitMetadata,
      },
      ...connectParams,
    });

    if (!paymentIntent.client_secret) {
      return NextResponse.json({ error: "Failed to initialize payment" }, { status: 500 });
    }

    await upsertPendingPayment(buyerId, listingId, paymentIntent.id, split);

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amountCents: PROPERTY_REPORT_PRICE_CENTS,
      alreadyPaid: false,
      chargedWithSavedCard: false,
      requiresAction: false,
      savedPaymentMethod,
    });
  } catch (err) {
    console.error("Property report payment-intent error:", err);
    return NextResponse.json({ error: "Failed to create payment" }, { status: 500 });
  }
}
