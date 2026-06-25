import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  buyerPropertyReportPayments,
  buyerPropertyReports,
  favorites,
} from "@/db/schema";
import { authOptions } from "@/lib/auth";
import type { ParcelResearchReport } from "@/lib/property-reports/build-parcel-research-report";

export type PropertyReportJson = {
  ok: true;
  listingId: number;
  report: ParcelResearchReport;
  generatedAt: string;
  cached: boolean;
};

export function parseListingId(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    return Number.parseInt(value.trim(), 10);
  }
  return null;
}

export function toPropertyReportJson(
  listingId: number,
  report: ParcelResearchReport,
  generatedAt: Date,
  cached: boolean,
): PropertyReportJson {
  return {
    ok: true,
    listingId,
    report,
    generatedAt: generatedAt.toISOString(),
    cached,
  };
}

export async function getBuyerId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return (session?.user as { id?: string } | undefined)?.id ?? null;
}

export async function assertFavoriteAccess(buyerId: string, listingId: number) {
  const [favoriteRow] = await db
    .select({ id: favorites.id })
    .from(favorites)
    .where(and(eq(favorites.userId, buyerId), eq(favorites.landListingId, listingId)))
    .limit(1);

  if (!favoriteRow) {
    return NextResponse.json(
      { error: "You can only order a report for a saved property" },
      { status: 403 },
    );
  }

  return null;
}

export async function getSavedPropertyReport(buyerId: string, listingId: number) {
  const [savedRow] = await db
    .select({
      report: buyerPropertyReports.report,
      createdAt: buyerPropertyReports.createdAt,
    })
    .from(buyerPropertyReports)
    .where(
      and(eq(buyerPropertyReports.userId, buyerId), eq(buyerPropertyReports.listingId, listingId)),
    )
    .limit(1);

  if (!savedRow) return null;

  return {
    report: savedRow.report as ParcelResearchReport,
    createdAt: savedRow.createdAt,
  };
}

export async function getSucceededPropertyReportPayment(buyerId: string, listingId: number) {
  const [paymentRow] = await db
    .select({
      stripePaymentIntentId: buyerPropertyReportPayments.stripePaymentIntentId,
    })
    .from(buyerPropertyReportPayments)
    .where(
      and(
        eq(buyerPropertyReportPayments.userId, buyerId),
        eq(buyerPropertyReportPayments.listingId, listingId),
        eq(buyerPropertyReportPayments.status, "succeeded"),
      ),
    )
    .limit(1);

  return paymentRow ?? null;
}
