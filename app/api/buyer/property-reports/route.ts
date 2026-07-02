import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { buyerPropertyReportPayments, buyerPropertyReports, mergedListings } from "@/db/schema";
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
  toPropertyReportJson,
  type PropertyReportJson,
} from "@/lib/property-reports/property-report-access";
import {
  buildParcelResearchReport,
  type ParcelResearchReport,
} from "@/lib/property-reports/build-parcel-research-report";
import { lookupCountyFips } from "@/lib/property-reports/lookup-county-fips";
import {
  syncBuyerPaymentMethodFromIntent,
} from "@/lib/buyer-stripe-customer";
import { refundPropertyReportPayment } from "@/lib/property-reports/refund-property-report-payment";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

async function markPaymentStatus(
  buyerId: string,
  listingId: number,
  paymentIntentId: string,
  status: "pending" | "succeeded" | "refunded" | "failed",
) {
  const now = new Date();
  await db
    .update(buyerPropertyReportPayments)
    .set({ status, updatedAt: now })
    .where(
      and(
        eq(buyerPropertyReportPayments.userId, buyerId),
        eq(buyerPropertyReportPayments.listingId, listingId),
        eq(buyerPropertyReportPayments.stripePaymentIntentId, paymentIntentId),
      ),
    );
}

async function assertPaidForReport(
  buyerId: string,
  listingId: number,
  paymentIntentId: string | null,
): Promise<NextResponse | { paymentIntentId: string }> {
  const existingPayment = await getSucceededPropertyReportPayment(buyerId, listingId);
  if (existingPayment) {
    return { paymentIntentId: existingPayment.stripePaymentIntentId };
  }

  if (!paymentIntentId?.trim()) {
    return NextResponse.json(
      {
        error: "Payment required",
        needsPayment: true,
        priceCents: PROPERTY_REPORT_PRICE_CENTS,
      },
      { status: 402 },
    );
  }

  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Payments are not configured" }, { status: 503 });
  }

  const stripe = getStripe();
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (paymentIntent.status !== "succeeded") {
    return NextResponse.json({ error: "Payment has not been completed" }, { status: 402 });
  }

  if (paymentIntent.metadata.userId !== buyerId) {
    return NextResponse.json({ error: "Payment does not match your account" }, { status: 403 });
  }

  if (paymentIntent.metadata.listingId !== String(listingId)) {
    return NextResponse.json({ error: "Payment does not match this property" }, { status: 403 });
  }

  if (
    paymentIntent.amount !== PROPERTY_REPORT_PRICE_CENTS ||
    paymentIntent.currency !== PROPERTY_REPORT_CURRENCY
  ) {
    return NextResponse.json({ error: "Invalid payment amount" }, { status: 400 });
  }

  const platformAmountCents = Number.parseInt(
    paymentIntent.metadata.platformAmountCents ?? String(PROPERTY_REPORT_PRICE_CENTS),
    10,
  );
  const realtorAmountCents = Number.parseInt(paymentIntent.metadata.realtorAmountCents ?? "0", 10);
  const realtorInvestorId = paymentIntent.metadata.realtorInvestorId?.trim() || null;

  const now = new Date();
  await db
    .insert(buyerPropertyReportPayments)
    .values({
      userId: buyerId,
      listingId,
      stripePaymentIntentId: paymentIntent.id,
      amountCents: paymentIntent.amount,
      platformAmountCents,
      realtorAmountCents,
      realtorInvestorId,
      status: "succeeded",
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [buyerPropertyReportPayments.userId, buyerPropertyReportPayments.listingId],
      set: {
        stripePaymentIntentId: paymentIntent.id,
        amountCents: paymentIntent.amount,
        platformAmountCents,
        realtorAmountCents,
        realtorInvestorId,
        status: "succeeded",
        updatedAt: now,
      },
    });

  try {
    await syncBuyerPaymentMethodFromIntent(buyerId, paymentIntent.id);
  } catch (saveErr) {
    console.error("Failed to save buyer payment method:", saveErr);
  }

  return { paymentIntentId: paymentIntent.id };
}

async function generateAndSavePropertyReport(
  buyerId: string,
  listingId: number,
  paymentIntentId: string | null,
): Promise<{ report: ParcelResearchReport; generatedAt: Date } | { error: NextResponse }> {
  const [listingRow] = await db
    .select({
      id: mergedListings.id,
      latitude: mergedListings.latitude,
      longitude: mergedListings.longitude,
      county: mergedListings.county,
      stateAbbreviation: mergedListings.stateAbbreviation,
      stateName: mergedListings.stateName,
      apn: mergedListings.apn,
    })
    .from(mergedListings)
    .where(eq(mergedListings.id, listingId))
    .limit(1);

  if (!listingRow) {
    return { error: NextResponse.json({ error: "Listing not found" }, { status: 404 }) };
  }

  const { latitude, longitude } = listingRow;
  if (latitude == null || longitude == null) {
    return {
      error: NextResponse.json(
        { error: "Listing does not have coordinates" },
        { status: 422 },
      ),
    };
  }

  const landPortalToken = process.env.LANDPORTAL?.trim();
  if (!landPortalToken) {
    if (paymentIntentId) {
      try {
        await refundPropertyReportPayment(paymentIntentId);
        await markPaymentStatus(buyerId, listingId, paymentIntentId, "refunded");
      } catch (refundErr) {
        console.error("Property report refund error:", refundErr);
      }
    }

    return {
      error: NextResponse.json(
        { error: "Property report service is not configured" },
        { status: 503 },
      ),
    };
  }

  const fips = await lookupCountyFips(
    listingRow.county,
    listingRow.stateAbbreviation,
    listingRow.stateName,
  );

  const propertyDataUrl = new URL(
    "https://landportal.com/wp-json/lp-rest-api/v1/property-data",
  );
  propertyDataUrl.searchParams.set("lat", String(latitude));
  propertyDataUrl.searchParams.set("lng", String(longitude));

  const propertyDataRes = await fetch(propertyDataUrl.toString(), {
    headers: { Authorization: `Bearer ${landPortalToken}` },
    cache: "no-store",
  });

  if (!propertyDataRes.ok) {
    const errorBody = await propertyDataRes.text().catch(() => "");
    console.error("LandPortal property-data error:", propertyDataRes.status, errorBody);

    if (paymentIntentId) {
      try {
        await refundPropertyReportPayment(paymentIntentId);
        await markPaymentStatus(buyerId, listingId, paymentIntentId, "refunded");
      } catch (refundErr) {
        console.error("Property report refund error:", refundErr);
      }
    }

    return {
      error: NextResponse.json(
        {
          error: "Failed to fetch property data. Your payment has been refunded.",
          refunded: Boolean(paymentIntentId),
        },
        { status: 502 },
      ),
    };
  }

  const propertyData = await propertyDataRes.json();
  const report = buildParcelResearchReport(propertyData, { fips });
  const now = new Date();

  await db
    .insert(buyerPropertyReports)
    .values({
      userId: buyerId,
      listingId,
      report,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [buyerPropertyReports.userId, buyerPropertyReports.listingId],
      set: {
        report,
        updatedAt: now,
      },
    });

  return { report, generatedAt: now };
}

export async function GET(request: Request) {
  const buyerId = await getBuyerId();
  if (!buyerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const listingId = parseListingId(new URL(request.url).searchParams.get("listingId"));
  if (listingId == null) {
    return NextResponse.json({ error: "listingId is required" }, { status: 400 });
  }

  try {
    const favoriteError = await assertFavoriteAccess(buyerId, listingId);
    if (favoriteError) return favoriteError;

    const savedRow = await getSavedPropertyReport(buyerId, listingId);
    if (!savedRow) {
      return NextResponse.json(
        {
          error: "Property report not found",
          needsPayment: true,
          priceCents: PROPERTY_REPORT_PRICE_CENTS,
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      toPropertyReportJson(listingId, savedRow.report, savedRow.createdAt, true),
    );
  } catch (err) {
    console.error("Property report GET error:", err);
    return NextResponse.json({ error: "Failed to fetch property report" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const buyerId = await getBuyerId();
  if (!buyerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { listingId?: unknown; regenerate?: unknown; paymentIntentId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const listingId = parseListingId(body.listingId);
  if (listingId == null) {
    return NextResponse.json({ error: "listingId is required" }, { status: 400 });
  }

  const regenerate = body.regenerate === true;
  const paymentIntentId =
    typeof body.paymentIntentId === "string" && body.paymentIntentId.trim()
      ? body.paymentIntentId.trim()
      : null;

  try {
    const favoriteError = await assertFavoriteAccess(buyerId, listingId);
    if (favoriteError) return favoriteError;

    if (!regenerate) {
      const savedRow = await getSavedPropertyReport(buyerId, listingId);
      if (savedRow) {
        return NextResponse.json(
          toPropertyReportJson(listingId, savedRow.report, savedRow.createdAt, true),
        );
      }
    }

    const paymentResult = await assertPaidForReport(buyerId, listingId, paymentIntentId);
    if (paymentResult instanceof NextResponse) return paymentResult;

    const result = await generateAndSavePropertyReport(
      buyerId,
      listingId,
      paymentResult.paymentIntentId,
    );
    if ("error" in result) return result.error;

    return NextResponse.json(
      toPropertyReportJson(listingId, result.report, result.generatedAt, false),
    );
  } catch (err) {
    console.error("Property report POST error:", err);
    return NextResponse.json({ error: "Failed to submit report request" }, { status: 500 });
  }
}

export type { PropertyReportJson };
