import { NextResponse } from "next/server";
import {
  getBuyerSavedPaymentMethodForBuyer,
} from "@/lib/buyer-stripe-customer";
import { getBuyerId } from "@/lib/property-reports/property-report-access";
import { isStripeConfigured } from "@/lib/stripe";

export async function GET() {
  const buyerId = await getBuyerId();
  if (!buyerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Payments are not configured" }, { status: 503 });
  }

  try {
    const savedPaymentMethod = await getBuyerSavedPaymentMethodForBuyer(buyerId);
    return NextResponse.json({ savedPaymentMethod });
  } catch (err) {
    console.error("Property report payment-methods error:", err);
    return NextResponse.json({ error: "Failed to load payment methods" }, { status: 500 });
  }
}
