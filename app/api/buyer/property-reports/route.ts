import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { buyerPropertyReports, favorites, mergedListings } from "@/db/schema";
import { authOptions } from "@/lib/auth";
import {
  buildParcelResearchReport,
  type ParcelResearchReport,
} from "@/lib/property-reports/build-parcel-research-report";
import { lookupCountyFips } from "@/lib/property-reports/lookup-county-fips";

type PropertyReportJson = {
  ok: true;
  listingId: number;
  report: ParcelResearchReport;
  generatedAt: string;
  cached: boolean;
};

function parseListingId(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    return Number.parseInt(value.trim(), 10);
  }
  return null;
}

function toPropertyReportJson(
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

async function getBuyerId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return (session?.user as { id?: string } | undefined)?.id ?? null;
}

async function assertFavoriteAccess(buyerId: string, listingId: number) {
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

async function getSavedPropertyReport(buyerId: string, listingId: number) {
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

async function generateAndSavePropertyReport(
  buyerId: string,
  listingId: number,
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
    return {
      error: NextResponse.json({ error: "Failed to fetch property data" }, { status: 502 }),
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
      return NextResponse.json({ error: "Property report not found" }, { status: 404 });
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

  let body: { listingId?: unknown; regenerate?: unknown };
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

    const result = await generateAndSavePropertyReport(buyerId, listingId);
    if ("error" in result) return result.error;

    return NextResponse.json(
      toPropertyReportJson(listingId, result.report, result.generatedAt, false),
    );
  } catch (err) {
    console.error("Property report POST error:", err);
    return NextResponse.json({ error: "Failed to submit report request" }, { status: 500 });
  }
}
