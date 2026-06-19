import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { favorites, mergedListings } from "@/db/schema";
import { authOptions } from "@/lib/auth";
import { buildParcelResearchReport } from "@/lib/property-reports/build-parcel-research-report";
import { lookupCountyFips } from "@/lib/property-reports/lookup-county-fips";

function parseListingId(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    return Number.parseInt(value.trim(), 10);
  }
  return null;
}

const LOG_PREFIX = "[property-reports]";

export async function POST(request: Request) {
  console.log(`${LOG_PREFIX} POST request received`);

  const session = await getServerSession(authOptions);
  const buyerId = (session?.user as { id?: string } | undefined)?.id;

  if (!buyerId) {
    console.log(`${LOG_PREFIX} Unauthorized — no buyer session`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { listingId?: unknown };
  try {
    body = await request.json();
  } catch {
    console.log(`${LOG_PREFIX} Invalid JSON body`);
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const listingId = parseListingId(body.listingId);
  if (listingId == null) {
    console.log(`${LOG_PREFIX} Missing or invalid listingId`, body.listingId);
    return NextResponse.json({ error: "listingId is required" }, { status: 400 });
  }

  console.log(`${LOG_PREFIX} buyerId=${buyerId}, listingId=${listingId}`);

  try {
    const [favoriteRow] = await db
      .select({ id: favorites.id })
      .from(favorites)
      .where(and(eq(favorites.userId, buyerId), eq(favorites.landListingId, listingId)))
      .limit(1);

    if (!favoriteRow) {
      console.log(`${LOG_PREFIX} Listing ${listingId} is not in buyer's favorites`);
      return NextResponse.json(
        { error: "You can only order a report for a saved property" },
        { status: 403 },
      );
    }

    console.log(`${LOG_PREFIX} Favorite confirmed, favoriteId=${favoriteRow.id}`);

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
      console.log(`${LOG_PREFIX} Listing ${listingId} not found in mergedListings`);
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    const { latitude, longitude } = listingRow;
    console.log(`${LOG_PREFIX} Listing loaded`, {
      county: listingRow.county,
      state: listingRow.stateAbbreviation ?? listingRow.stateName,
      apn: listingRow.apn,
      latitude,
      longitude,
    });

    if (latitude == null || longitude == null) {
      console.log(`${LOG_PREFIX} Listing ${listingId} missing coordinates`);
      return NextResponse.json(
        { error: "Listing does not have coordinates" },
        { status: 422 },
      );
    }

    const landPortalToken = process.env.LANDPORTAL?.trim();
    if (!landPortalToken) {
      console.log(`${LOG_PREFIX} LANDPORTAL env var is not set`);
      return NextResponse.json(
        { error: "Property report service is not configured" },
        { status: 503 },
      );
    }

    console.log(`${LOG_PREFIX} Looking up county FIPS...`);
    const fips = await lookupCountyFips(
      listingRow.county,
      listingRow.stateAbbreviation,
      listingRow.stateName,
    );
    console.log(`${LOG_PREFIX} County FIPS result:`, fips);

    const propertyDataUrl = new URL(
      "https://landportal.com/wp-json/lp-rest-api/v1/property-data",
    );
    propertyDataUrl.searchParams.set("lat", String(latitude));
    propertyDataUrl.searchParams.set("lng", String(longitude));

    console.log(`${LOG_PREFIX} Fetching LandPortal property data:`, propertyDataUrl.toString());

    const propertyDataRes = await fetch(propertyDataUrl.toString(), {
      headers: { Authorization: `Bearer ${landPortalToken}` },
      cache: "no-store",
    });

    if (!propertyDataRes.ok) {
      const errorBody = await propertyDataRes.text().catch(() => "");
      console.error(
        `${LOG_PREFIX} LandPortal property-data error:`,
        propertyDataRes.status,
        errorBody,
      );
      return NextResponse.json(
        { error: "Failed to fetch property data" },
        { status: 502 },
      );
    }

    console.log(`${LOG_PREFIX} LandPortal response OK (${propertyDataRes.status})`);

    const propertyData = await propertyDataRes.json();
    console.log(`${LOG_PREFIX} Property data received, building report...`);

    const report = buildParcelResearchReport(propertyData, { fips });
    console.log(`${LOG_PREFIX} Report built successfully`, {
      listingId,
      reportKeys: Object.keys(report),
    });

    return NextResponse.json({ ok: true, listingId, report });
  } catch (err) {
    console.error("Property report POST error:", err);
    return NextResponse.json({ error: "Failed to submit report request" }, { status: 500 });
  }
}
