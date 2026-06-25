import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { buyerPropertyReportPayments } from "@/db/schema";
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
import { getStripe, isStripeConfigured } from "@/lib/stripe";

export async function POST(request: Request) {
  const buyerId = await getBuyerId();
  if (!buyerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Payments are not configured" }, { status: 503 });
  }

  let body: { listingId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const listingId = parseListingId(body.listingId);
  if (listingId == null) {
    return NextResponse.json({ error: "listingId is required" }, { status: 400 });
  }

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
    const paymentIntent = await stripe.paymentIntents.create({
      amount: PROPERTY_REPORT_PRICE_CENTS,
      currency: PROPERTY_REPORT_CURRENCY,
      automatic_payment_methods: { enabled: true },
      metadata: {
        userId: buyerId,
        listingId: String(listingId),
        product: "property_report",
      },
    });

    if (!paymentIntent.client_secret) {
      return NextResponse.json({ error: "Failed to initialize payment" }, { status: 500 });
    }

    const now = new Date();
    await db
      .insert(buyerPropertyReportPayments)
      .values({
        userId: buyerId,
        listingId,
        stripePaymentIntentId: paymentIntent.id,
        amountCents: PROPERTY_REPORT_PRICE_CENTS,
        status: "pending",
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [buyerPropertyReportPayments.userId, buyerPropertyReportPayments.listingId],
        set: {
          stripePaymentIntentId: paymentIntent.id,
          amountCents: PROPERTY_REPORT_PRICE_CENTS,
          status: "pending",
          updatedAt: now,
        },
      });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amountCents: PROPERTY_REPORT_PRICE_CENTS,
      alreadyPaid: false,
    });
  } catch (err) {
    console.error("Property report payment-intent error:", err);
    return NextResponse.json({ error: "Failed to create payment" }, { status: 500 });
  }
}
