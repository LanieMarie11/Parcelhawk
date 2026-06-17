/** Land Portal property-data API response shape. */
export type LandPortalPropertyDataResponse = {
  success?: boolean;
  meta?: { requests_left?: number };
  data?: {
    property?: unknown;
  };
  property?: unknown;
};

export type ParcelComparable = {
  municipality: string;
  acres: number | null;
  salePrice: number;
  pricePerAcre: number;
  saleDate: string;
  distanceMiles: number;
};

export type ParcelRedFlag = {
  title: string;
  detail: string;
  severity: "low" | "medium" | "high";
};

export type ParcelResearchReport = {
  generatedAt: string;
  landPortalUrl: string | null;
  snapshot: {
    apn: string;
    propertyId: string | number | null;
    fips: string | null;
    owner: string;
    owner2: string;
    mailingAddress: string;
    situsAddress: string;
    county: string;
    state: string;
    municipality: string;
    acres: number;
    sqft: number;
    landUse: string;
    vacant: boolean;
    buildingCount: number;
    schoolDistrict: string;
    legalDescription: string;
    otherPropertiesOwned: number;
    latitude: number | null;
    longitude: number | null;
  };
  valuation: {
    assessedValue: number;
    assessedLand: number;
    marketValue: number;
    tlpEstimate: number;
    tlpPricePerAcre: number;
    taxAmount: number;
    taxYear: string;
    recentSalePrice: number | null;
    recentSaleDate: string | null;
  };
  comparables: {
    rows: ParcelComparable[];
    summary: {
      count: number;
      avgPricePerAcre: number;
      avgSalePrice: number;
      tlpEstimate: number;
      tlpPricePerAcre: number;
    } | null;
  };
  flood: {
    coveragePercent: number;
    zone: string;
    mapDate: string;
    summary: string;
  };
  wetlands: {
    coveragePercent: number;
    summary: string;
  };
  slope: {
    average: number;
    flat: number;
    minimal: number;
    moderate: number;
    heavy: number;
    extreme: number;
  };
  elevation: {
    averageMeters: number;
    minMeters: number;
    maxMeters: number;
    averageFeet: number;
    minFeet: number;
    maxFeet: number;
  };
  buildability: {
    percent: number;
    areaAcres: number;
    summary: string;
  };
  access: {
    landLocked: boolean;
    roadFrontageFeet: number;
    nearWater: boolean;
    landLockedGuidance: string[] | null;
  };
  redFlags: ParcelRedFlag[];
  positives: string[];
  followUp: string[];
};

type RawComparable = {
  municipality?: string;
  area_acres?: number;
  mls_price?: number;
  price_acres?: number;
  sold_month?: number;
  sold_year?: number;
  distance?: number;
};

type ExtractedPropertyInfo = {
  apn: string;
  propertyId: string | number | null;
  fips: string | null;
  owner1: string;
  owner2: string;
  mailingAddress: string;
  situsAddress: string;
  state: string;
  county: string;
  municipality: string;
  latitude: number | null;
  longitude: number | null;
  legalDescription: string;
  schoolDistrict: string;
  acres: number;
  sqft: number;
  landUse: string;
  vacant: boolean;
  buildingCount: number;
  assessedValue: number;
  assessedLand: number;
  marketValue: number;
  tlpEstimate: number;
  tlpPPA: number;
  taxAmount: number;
  taxYear: string;
  recentSalePrice: number | null;
  recentSaleDate: string | null;
  landLocked: boolean;
  roadFrontage: number;
  nearWater: boolean;
  wetlandsPercent: number;
  femaFloodPercent: number;
  femaFloodZone: string;
  femaMapDate: string;
  buildabilityPercent: number;
  buildabilityArea: number;
  slopeAverage: number;
  slopeFlat: number;
  slopeMinimal: number;
  slopeModerate: number;
  slopeHeavy: number;
  slopeExtreme: number;
  elevationAvg: number;
  elevationMin: number;
  elevationMax: number;
  comps: RawComparable[];
  otherPropertiesOwned: number;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function parseNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function parseBool(value: unknown): boolean {
  return value === true || value === "true";
}

function parseString(value: unknown, fallback = "N/A"): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

function parseComps(value: unknown): RawComparable[] {
  if (!value) return [];
  if (Array.isArray(value)) return value as RawComparable[];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? (parsed as RawComparable[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function formatRecordingDate(value: unknown): string | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    const raw = String(value);
    if (raw.length === 8) {
      return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
    }
  }
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

function metersToFeet(meters: number): number {
  return Math.round(meters * 3.281);
}

function resolvePropertyRoot(response: LandPortalPropertyDataResponse): Record<string, unknown> | null {
  const dataProperty = asRecord(response.data?.property);
  if (dataProperty) {
    const nested = asRecord(dataProperty.properties);
    return nested ?? dataProperty;
  }

  const propertyRecord = asRecord(response.property);
  if (!propertyRecord) return null;

  const nestedProperties = asRecord(propertyRecord.properties);
  return nestedProperties ?? propertyRecord;
}

function resolveField(
  root: Record<string, unknown>,
  outer: Record<string, unknown> | null,
  ...keys: string[]
): unknown {
  for (const key of keys) {
    if (root[key] != null) return root[key];
    if (outer?.[key] != null) return outer[key];
  }
  return undefined;
}

function extractPropertyInfo(response: LandPortalPropertyDataResponse): ExtractedPropertyInfo {
  const root = resolvePropertyRoot(response);
  if (!root) {
    throw new Error("Property data response did not include a property record");
  }

  const outer =
    asRecord(response.data?.property) ?? asRecord(response.property);

  const owner1 = parseString(
    resolveField(root, outer, "ownername1full", "owner1firstname"),
    "",
  );
  const owner1Fallback = [
    parseString(resolveField(root, outer, "owner1firstname"), ""),
    parseString(resolveField(root, outer, "owner1lastname"), ""),
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  const mailingStreet = parseString(resolveField(root, outer, "mailingfullstreetaddress"), "");
  const mailingCity = parseString(resolveField(root, outer, "mailingcity"), "");
  const mailingState = parseString(resolveField(root, outer, "mailingstate"), "");
  const mailingZip = parseString(resolveField(root, outer, "mailingzip5"), "");

  const situsStreet = parseString(resolveField(root, outer, "situsfullstreetaddress"), "");
  const situsCity = parseString(resolveField(root, outer, "situscity"), "");
  const situsState = parseString(resolveField(root, outer, "situsstate"), "");
  const situsZip = parseString(resolveField(root, outer, "situszip5"), "");

  const buildingArea = parseNumber(resolveField(root, outer, "buildingarea", "sumbuildingsqft"));
  const buildingCount = parseNumber(resolveField(root, outer, "bldg_count"));
  const vacantFlag = resolveField(root, outer, "vacant");

  return {
    apn: parseString(resolveField(root, outer, "apn", "apn_cleaned")),
    propertyId:
      (resolveField(root, outer, "propertyid", "property_id", "ll_uuid") as string | number | null) ??
      null,
    fips: parseString(resolveField(root, outer, "fips"), "") || null,
    owner1: owner1 !== "N/A" ? owner1 : owner1Fallback || "N/A",
    owner2: parseString(resolveField(root, outer, "ownername2full"), ""),
    mailingAddress: [mailingStreet, [mailingCity, mailingState, mailingZip].filter(Boolean).join(", ")]
      .filter(Boolean)
      .join(", "),
    situsAddress: [situsStreet, [situsCity, situsState, situsZip].filter(Boolean).join(", ")]
      .filter(Boolean)
      .join(", "),
    state: parseString(resolveField(root, outer, "situsstate", "situsstate")),
    county: parseString(resolveField(root, outer, "situscounty", "mailingcountyname")),
    municipality: parseString(resolveField(root, outer, "municipality")),
    latitude: parseNumber(resolveField(root, outer, "situslatitude", "latitude")) || null,
    longitude: parseNumber(resolveField(root, outer, "situslongitude", "longitude")) || null,
    legalDescription: parseString(resolveField(root, outer, "legaldescription")),
    schoolDistrict: parseString(resolveField(root, outer, "schooldistrictname")),
    acres:
      parseNumber(resolveField(root, outer, "lotsizeacres")) ||
      parseNumber(resolveField(root, outer, "calc_acres")),
    sqft: parseNumber(resolveField(root, outer, "lotsizesqft")),
    landUse: parseString(
      resolveField(root, outer, "landusecodedescription", "landusecode"),
    ),
    vacant:
      vacantFlag != null ? parseBool(vacantFlag) : buildingArea <= 0 && buildingCount <= 0,
    buildingCount: buildingCount || (buildingArea > 0 ? 1 : 0),
    assessedValue: parseNumber(resolveField(root, outer, "assdtotalvalue")),
    assessedLand: parseNumber(resolveField(root, outer, "assdlandvalue")),
    marketValue: parseNumber(resolveField(root, outer, "markettotalvalue")),
    tlpEstimate: parseNumber(resolveField(root, outer, "tlp_estimate")),
    tlpPPA: parseNumber(resolveField(root, outer, "tlp_ppa")),
    taxAmount: parseNumber(resolveField(root, outer, "taxamt")),
    taxYear: parseString(resolveField(root, outer, "taxyear")),
    recentSalePrice: parseNumber(resolveField(root, outer, "currentsalesprice")) || null,
    recentSaleDate: formatRecordingDate(resolveField(root, outer, "currentsalerecordingdate")),
    landLocked: parseBool(resolveField(root, outer, "land_locked")),
    roadFrontage: parseNumber(resolveField(root, outer, "road_frontage")),
    nearWater: parseBool(resolveField(root, outer, "wf_is_near_water")),
    wetlandsPercent: parseNumber(resolveField(root, outer, "wetlands_cover_percentage")),
    femaFloodPercent: parseNumber(resolveField(root, outer, "fema_cover_percentage")),
    femaFloodZone: parseString(resolveField(root, outer, "flfemafloodzone")),
    femaMapDate: parseString(resolveField(root, outer, "flfemamapdate")),
    buildabilityPercent: parseNumber(resolveField(root, outer, "buildability_total_perc")),
    buildabilityArea: parseNumber(resolveField(root, outer, "buildability_area")),
    slopeAverage: parseNumber(resolveField(root, outer, "slope_average")),
    slopeFlat: parseNumber(resolveField(root, outer, "percentage_of_land_with_flat_slope_0_05")),
    slopeMinimal: parseNumber(resolveField(root, outer, "percentage_of_land_with_minimal_slope_05_5")),
    slopeModerate: parseNumber(resolveField(root, outer, "percentage_of_land_with_moderate_slope_5_10")),
    slopeHeavy: parseNumber(resolveField(root, outer, "percentage_of_land_with_heavy_slope_10_15")),
    slopeExtreme: parseNumber(
      resolveField(root, outer, "percentage_of_land_with_extreme_slope_15"),
    ),
    elevationAvg: parseNumber(resolveField(root, outer, "elevation_average")),
    elevationMin: parseNumber(resolveField(root, outer, "elevation_min")),
    elevationMax: parseNumber(resolveField(root, outer, "elevation_max")),
    comps: parseComps(resolveField(root, outer, "similars")),
    otherPropertiesOwned: parseNumber(resolveField(root, outer, "otherpropertiesowned")),
  };
}

function analyzeRedFlags(info: ExtractedPropertyInfo): ParcelRedFlag[] {
  const flags: ParcelRedFlag[] = [];

  if (info.landLocked) {
    flags.push({
      title: "Landlocked Flag Detected",
      detail: `Land Portal flags this parcel as landlocked with ${info.roadFrontage} ft of road frontage. Confirm with county GIS and check if adjacent parcels share the same owner.`,
      severity: "medium",
    });
  }

  if (info.femaFloodPercent > 20) {
    flags.push({
      title: `Significant FEMA Flood Coverage (${info.femaFloodPercent.toFixed(1)}%)`,
      detail:
        "More than 20% of the parcel falls within FEMA flood zones. This could affect buildability, insurance costs, and resale value.",
      severity: "high",
    });
  } else if (info.femaFloodPercent > 5) {
    flags.push({
      title: `Partial FEMA Flood Coverage (${info.femaFloodPercent.toFixed(1)}%)`,
      detail:
        "A portion of the parcel has FEMA flood zone coverage. Review the flood map to determine if buildable areas are affected.",
      severity: "low",
    });
  }

  if (info.wetlandsPercent > 15) {
    flags.push({
      title: `Wetlands Coverage (${info.wetlandsPercent.toFixed(1)}%)`,
      detail:
        "Significant wetlands coverage may restrict development options and require permits for any modifications.",
      severity: "medium",
    });
  }

  if (info.slopeExtreme > 25) {
    flags.push({
      title: `Extreme Slope (${info.slopeExtreme.toFixed(1)}% of land >15%)`,
      detail:
        "A significant portion of the land has extreme slopes, limiting buildable area and potentially complicating access.",
      severity: "medium",
    });
  }

  if (info.buildabilityPercent < 50) {
    flags.push({
      title: `Low Buildability (${info.buildabilityPercent.toFixed(1)}%)`,
      detail:
        "Less than half the parcel is considered buildable, which affects development potential and may impact value.",
      severity: "high",
    });
  }

  return flags;
}

function analyzePositives(info: ExtractedPropertyInfo): string[] {
  const positives: string[] = [];

  if (info.acres >= 10) {
    positives.push(
      `Sizable acreage (${info.acres.toFixed(1)} acres) — suitable for agricultural, recreational, or development use.`,
    );
  }

  if (info.buildabilityPercent > 75) {
    positives.push(
      `Strong buildability at ${info.buildabilityPercent.toFixed(1)}% — most of the parcel is usable.`,
    );
  }

  if (info.wetlandsPercent < 5) {
    positives.push(
      `Minimal wetlands coverage (${info.wetlandsPercent.toFixed(1)}%) — limited regulatory constraints.`,
    );
  }

  if (info.vacant && info.buildingCount === 0) {
    positives.push("Vacant land with no structures — clean slate for buyer's intended use.");
  }

  if (info.slopeFlat + info.slopeMinimal > 30) {
    positives.push(
      `${(info.slopeFlat + info.slopeMinimal).toFixed(1)}% of land has flat to minimal slope — good for building or agriculture.`,
    );
  }

  if (info.comps.length > 0) {
    const avgPPA =
      info.comps.reduce((sum, comp) => sum + parseNumber(comp.price_acres), 0) / info.comps.length;
    if (avgPPA > 0) {
      positives.push(
        `Comparable sales suggest market activity in the area at ~$${Math.round(avgPPA).toLocaleString()}/acre.`,
      );
    }
  }

  return positives;
}

function buildLandPortalUrl(info: ExtractedPropertyInfo): string | null {
  if (!info.propertyId || !info.apn || info.apn === "N/A") return null;

  const params = Buffer.from(
    `fips=${info.fips ?? ""}&ll_uuid=${info.propertyId}&apn=${info.apn}`,
  ).toString("base64");

  return `https://landportal.com/?property=${encodeURIComponent(params)}`;
}

function formatComparableRows(comps: RawComparable[]): ParcelComparable[] {
  return comps.map((comp) => {
    const saleDate =
      comp.sold_month && comp.sold_year ? `${comp.sold_month}/${comp.sold_year}` : "N/A";

    return {
      municipality: comp.municipality ?? "N/A",
      acres: comp.area_acres ?? null,
      salePrice: parseNumber(comp.mls_price),
      pricePerAcre: parseNumber(comp.price_acres),
      saleDate,
      distanceMiles: parseNumber(comp.distance),
    };
  });
}

const FOLLOW_UP = [
  "Verify landlocked status via county GIS — check adjoining parcels for same-owner access chains.",
  "Review FEMA flood map to determine if flood zones overlap with buildable areas.",
  "Confirm soil types via USDA Web Soil Survey for agricultural suitability.",
  "Check county zoning to verify allowed uses (residential, agricultural, recreational).",
  "Verify road access and confirm any recorded easements with the county recorder.",
  "Research utility availability (electric, water, sewer/septic) for the area.",
];

export type BuildParcelResearchReportOptions = {
  fips?: string | null;
};

export function buildParcelResearchReport(
  propertyData: LandPortalPropertyDataResponse,
  options?: BuildParcelResearchReportOptions,
): ParcelResearchReport {
  const info = extractPropertyInfo(propertyData);
  if (options?.fips) {
    info.fips = options.fips;
  }
  const redFlags = analyzeRedFlags(info);
  const positives = analyzePositives(info);
  const comparableRows = formatComparableRows(info.comps);

  const comparableSummary =
    comparableRows.length > 0
      ? {
          count: comparableRows.length,
          avgPricePerAcre: Math.round(
            comparableRows.reduce((sum, row) => sum + row.pricePerAcre, 0) / comparableRows.length,
          ),
          avgSalePrice: Math.round(
            comparableRows.reduce((sum, row) => sum + row.salePrice, 0) / comparableRows.length,
          ),
          tlpEstimate: Math.round(info.tlpEstimate),
          tlpPricePerAcre: Math.round(info.tlpPPA),
        }
      : null;

  const wetlandsSummary =
    info.wetlandsPercent < 2
      ? `Minimal wetlands presence at ${info.wetlandsPercent.toFixed(2)}% coverage. This is unlikely to present significant regulatory or development constraints.`
      : `${info.wetlandsPercent.toFixed(2)}% of the parcel has wetlands coverage. Buyers should verify the extent and type of wetlands via the National Wetlands Inventory to understand development restrictions.`;

  const buildabilitySummary =
    info.buildabilityPercent > 75
      ? `This parcel has a strong buildability score. The majority of the land (${info.buildabilityArea.toFixed(1)} acres) is considered suitable for development.`
      : `This parcel has a buildability score of ${info.buildabilityPercent.toFixed(1)}%. Approximately ${info.buildabilityArea.toFixed(1)} acres are considered suitable for development. The remainder may be constrained by slope, wetlands, or flood zones.`;

  const floodSummary =
    info.femaFloodPercent > 0
      ? `${info.femaFloodPercent.toFixed(1)}% of this parcel is within FEMA-designated flood zones. Buyers should review the official FEMA flood map and consider whether the affected area overlaps with planned building sites.`
      : "No FEMA flood zone coverage was reported for this parcel.";

  return {
    generatedAt: new Date().toISOString(),
    landPortalUrl: buildLandPortalUrl(info),
    snapshot: {
      apn: info.apn,
      propertyId: info.propertyId,
      fips: info.fips,
      owner: info.owner1,
      owner2: info.owner2,
      mailingAddress: info.mailingAddress,
      situsAddress: info.situsAddress,
      county: info.county,
      state: info.state,
      municipality: info.municipality,
      acres: info.acres,
      sqft: info.sqft,
      landUse: info.landUse,
      vacant: info.vacant,
      buildingCount: info.buildingCount,
      schoolDistrict: info.schoolDistrict,
      legalDescription: info.legalDescription,
      otherPropertiesOwned: info.otherPropertiesOwned,
      latitude: info.latitude,
      longitude: info.longitude,
    },
    valuation: {
      assessedValue: info.assessedValue,
      assessedLand: info.assessedLand,
      marketValue: info.marketValue,
      tlpEstimate: info.tlpEstimate,
      tlpPricePerAcre: info.tlpPPA,
      taxAmount: info.taxAmount,
      taxYear: info.taxYear,
      recentSalePrice: info.recentSalePrice,
      recentSaleDate: info.recentSaleDate,
    },
    comparables: {
      rows: comparableRows,
      summary: comparableSummary,
    },
    flood: {
      coveragePercent: info.femaFloodPercent,
      zone: info.femaFloodZone,
      mapDate: info.femaMapDate,
      summary: floodSummary,
    },
    wetlands: {
      coveragePercent: info.wetlandsPercent,
      summary: wetlandsSummary,
    },
    slope: {
      average: info.slopeAverage,
      flat: info.slopeFlat,
      minimal: info.slopeMinimal,
      moderate: info.slopeModerate,
      heavy: info.slopeHeavy,
      extreme: info.slopeExtreme,
    },
    elevation: {
      averageMeters: info.elevationAvg,
      minMeters: info.elevationMin,
      maxMeters: info.elevationMax,
      averageFeet: metersToFeet(info.elevationAvg),
      minFeet: metersToFeet(info.elevationMin),
      maxFeet: metersToFeet(info.elevationMax),
    },
    buildability: {
      percent: info.buildabilityPercent,
      areaAcres: info.buildabilityArea,
      summary: buildabilitySummary,
    },
    access: {
      landLocked: info.landLocked,
      roadFrontageFeet: info.roadFrontage,
      nearWater: info.nearWater,
      landLockedGuidance: info.landLocked
        ? [
            "This parcel is flagged as landlocked. Before treating this as a dealbreaker, verify:",
            "Do any directly adjoining parcels share the same owner?",
            "If so, does that neighboring parcel connect to a public road?",
            "Are there any easements recorded with the county?",
            `The owner (${info.owner1}) owns ${info.otherPropertiesOwned} other properties — check if adjacent parcels are among them.`,
          ]
        : null,
    },
    redFlags,
    positives,
    followUp: FOLLOW_UP,
  };
}
