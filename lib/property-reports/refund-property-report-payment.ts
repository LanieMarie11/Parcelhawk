import { eq } from "drizzle-orm";
import { db } from "@/db";
import { buyerPropertyReportPayments } from "@/db/schema";
import { getStripe } from "@/lib/stripe";

export async function refundPropertyReportPayment(paymentIntentId: string) {
  const stripe = getStripe();

  const [paymentRow] = await db
    .select({
      realtorAmountCents: buyerPropertyReportPayments.realtorAmountCents,
    })
    .from(buyerPropertyReportPayments)
    .where(eq(buyerPropertyReportPayments.stripePaymentIntentId, paymentIntentId))
    .limit(1);

  let hadRealtorSplit = (paymentRow?.realtorAmountCents ?? 0) > 0;

  if (!hadRealtorSplit) {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    const realtorAmount = Number.parseInt(paymentIntent.metadata.realtorAmountCents ?? "0", 10);
    hadRealtorSplit = realtorAmount > 0;
  }

  await stripe.refunds.create({
    payment_intent: paymentIntentId,
    ...(hadRealtorSplit
      ? {
          reverse_transfer: true,
          refund_application_fee: true,
        }
      : {}),
  });
}
