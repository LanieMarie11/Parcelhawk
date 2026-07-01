import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getLatestSucceededPropertyReportPayment } from "@/lib/property-reports/property-report-access";
import { getStripe } from "@/lib/stripe";

export type SavedPaymentMethod = {
  id: string;
  brand: string;
  last4: string;
};

export function formatSavedPaymentMethodLabel(method: SavedPaymentMethod): string {
  const brand = method.brand.charAt(0).toUpperCase() + method.brand.slice(1);
  return `${brand} •••• ${method.last4}`;
}

async function getBuyerRow(buyerId: string) {
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      stripeCustomerId: users.stripeCustomerId,
    })
    .from(users)
    .where(eq(users.id, buyerId))
    .limit(1);

  return row ?? null;
}

export async function getBuyerStripeCustomerId(buyerId: string): Promise<string | null> {
  const row = await getBuyerRow(buyerId);
  return row?.stripeCustomerId?.trim() || null;
}

export async function getOrCreateBuyerStripeCustomer(buyerId: string): Promise<string> {
  const row = await getBuyerRow(buyerId);
  if (!row) {
    throw new Error("Buyer not found");
  }

  if (row.stripeCustomerId?.trim()) {
    return row.stripeCustomerId.trim();
  }

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: row.email,
    name: `${row.firstName} ${row.lastName}`.trim(),
    metadata: {
      userId: buyerId,
      product: "buyer",
    },
  });

  await db
    .update(users)
    .set({ stripeCustomerId: customer.id, updatedAt: new Date() })
    .where(eq(users.id, buyerId));

  return customer.id;
}

function toSavedPaymentMethod(
  paymentMethod: {
    id: string;
    card?: { brand?: string | null; last4?: string | null } | null;
  } | null,
): SavedPaymentMethod | null {
  if (!paymentMethod?.card?.last4) return null;

  return {
    id: paymentMethod.id,
    brand: paymentMethod.card.brand ?? "card",
    last4: paymentMethod.card.last4,
  };
}

export async function getBuyerSavedPaymentMethod(
  customerId: string,
): Promise<SavedPaymentMethod | null> {
  const stripe = getStripe();
  const customer = await stripe.customers.retrieve(customerId);

  if (customer.deleted) return null;

  const defaultPaymentMethod = customer.invoice_settings?.default_payment_method;
  if (typeof defaultPaymentMethod === "string") {
    const paymentMethod = await stripe.paymentMethods.retrieve(defaultPaymentMethod);
    return toSavedPaymentMethod(paymentMethod);
  }

  if (defaultPaymentMethod && typeof defaultPaymentMethod === "object") {
    return toSavedPaymentMethod(defaultPaymentMethod);
  }

  const paymentMethods = await stripe.paymentMethods.list({
    customer: customerId,
    type: "card",
    limit: 1,
  });

  return toSavedPaymentMethod(paymentMethods.data[0] ?? null);
}

export async function attachPaymentMethodToCustomer(
  customerId: string,
  paymentMethodId: string,
): Promise<void> {
  const stripe = getStripe();
  const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

  if (paymentMethod.customer === customerId) {
    return;
  }

  if (paymentMethod.customer) {
    throw new Error("Payment method is attached to a different customer");
  }

  await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
}

export async function setBuyerDefaultPaymentMethod(
  customerId: string,
  paymentMethodId: string,
): Promise<void> {
  const stripe = getStripe();
  await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });
}

export function getPaymentMethodIdFromIntent(paymentIntent: {
  payment_method?: string | { id: string } | null;
}): string | null {
  const paymentMethod = paymentIntent.payment_method;
  if (!paymentMethod) return null;
  return typeof paymentMethod === "string" ? paymentMethod : paymentMethod.id;
}

export async function syncBuyerPaymentMethodFromIntent(
  buyerId: string,
  paymentIntentId: string,
): Promise<SavedPaymentMethod | null> {
  const stripe = getStripe();
  let customerId = await getBuyerStripeCustomerId(buyerId);

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
    expand: ["payment_method"],
  });

  if (paymentIntent.status !== "succeeded") {
    return null;
  }

  const paymentMethodId = getPaymentMethodIdFromIntent(paymentIntent);
  if (!paymentMethodId) {
    return null;
  }

  const intentCustomerId =
    typeof paymentIntent.customer === "string"
      ? paymentIntent.customer
      : paymentIntent.customer?.id;

  if (intentCustomerId) {
    if (!customerId) {
      await db
        .update(users)
        .set({ stripeCustomerId: intentCustomerId, updatedAt: new Date() })
        .where(eq(users.id, buyerId));
      customerId = intentCustomerId;
    }
  } else if (!customerId) {
    customerId = await getOrCreateBuyerStripeCustomer(buyerId);
  }

  if (!customerId) {
    return null;
  }

  try {
    await attachPaymentMethodToCustomer(customerId, paymentMethodId);
    await setBuyerDefaultPaymentMethod(customerId, paymentMethodId);
  } catch (err) {
    console.error("Failed to sync buyer payment method from intent:", err);
    return null;
  }

  const paymentMethod =
    typeof paymentIntent.payment_method === "object" && paymentIntent.payment_method
      ? paymentIntent.payment_method
      : await stripe.paymentMethods.retrieve(paymentMethodId);

  return toSavedPaymentMethod(paymentMethod);
}

export async function getBuyerSavedPaymentMethodForBuyer(
  buyerId: string,
): Promise<SavedPaymentMethod | null> {
  const customerId = await getBuyerStripeCustomerId(buyerId);

  if (customerId) {
    const saved = await getBuyerSavedPaymentMethod(customerId);
    if (saved) return saved;
  }

  const latestPayment = await getLatestSucceededPropertyReportPayment(buyerId);
  if (!latestPayment) return null;

  return syncBuyerPaymentMethodFromIntent(buyerId, latestPayment.stripePaymentIntentId);
}
