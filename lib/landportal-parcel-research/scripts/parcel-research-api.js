#!/usr/bin/env node
/**
 * Land Portal API-Based Parcel Research & Report Generator
 *
 * Usage: node parcel-research-api.js <property_id> <fips> [output_dir]
 *
 * Example: node parcel-research-api.js 54779266 19181 ./output
 *
 * This script:
 *   1. Pulls all property data from the Land Portal API
 *   2. Generates a satellite map image via Mapbox with parcel boundary overlay
 *   3. Builds a professional Word document report with all findings
 *   4. No browser required!
 */

const fs = require("fs");
const path = require("path");
const https = require("https");
const dotenv = require("dotenv");

for (const envPath of [
  path.join(process.cwd(), ".env"),
  path.join(__dirname, "..", "..", "..", ".env"),
]) {
  dotenv.config({ path: envPath });
}
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun,
  Header, Footer, AlignmentType, LevelFormat, ExternalHyperlink,
  HeadingLevel, BorderStyle, WidthType, ShadingType,
  PageNumber, PageBreak
} = require("docx");

// ════════════════════════════════════════════════════
//  CONFIGURATION
// ════════════════════════════════════════════════════

// Search for API token in multiple locations
function findToken() {
  if (process.env.LP_TOKEN) return process.env.LP_TOKEN.trim();
  const searchPaths = [
    path.join(process.cwd(), "lp-token.txt"),
    path.join(__dirname, "lp-token.txt"),
    path.join(__dirname, "..", "lp-token.txt"),
  ];
  for (const p of searchPaths) {
    try { return fs.readFileSync(p, "utf8").trim(); } catch {}
  }
  console.error("❌ No Land Portal API token found.");
  console.error("   Save your token to lp-token.txt or set the LP_TOKEN environment variable.");
  process.exit(1);
}
const LP_TOKEN = findToken();

function findMapboxKey() {
  if (process.env.MAPBOX_ACCESS_TOKEN) return process.env.MAPBOX_ACCESS_TOKEN.trim();
  console.error("❌ No Mapbox access token found.");
  console.error("   Set MAPBOX_ACCESS_TOKEN in your .env file or environment.");
  process.exit(1);
}
const MAPBOX_KEY = findMapboxKey();

const LP_API = "https://landportal.com/wp-json";

// ════════════════════════════════════════════════════
//  COLORS & FORMATTING
// ════════════════════════════════════════════════════

const DARK_BLUE = "1B3A5C";
const MEDIUM_BLUE = "2E75B6";
const LIGHT_BLUE_BG = "E8F0F8";
const RED_FLAG = "C0392B";
const GREEN = "27763D";
const GRAY_TEXT = "555555";
const LIGHT_GRAY = "F2F2F2";
const WHITE = "FFFFFF";
const AMBER = "D4A017";

const thinBorder = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
const noBorders = {
  top: { style: BorderStyle.NONE, size: 0, color: WHITE },
  bottom: { style: BorderStyle.NONE, size: 0, color: WHITE },
  left: { style: BorderStyle.NONE, size: 0, color: WHITE },
  right: { style: BorderStyle.NONE, size: 0, color: WHITE },
};
const cellMargins = { top: 60, bottom: 60, left: 120, right: 120 };

// ════════════════════════════════════════════════════
//  HTTP HELPERS
// ════════════════════════════════════════════════════

function httpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const method = options.method || "GET";
    const urlObj = new URL(url);
    const reqOpts = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method,
      headers: {
        "Authorization": `Bearer ${LP_TOKEN}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    };

    const req = https.request(reqOpts, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const body = Buffer.concat(chunks);
        if (options.binary) {
          resolve(body);
        } else {
          try {
            resolve(JSON.parse(body.toString()));
          } catch {
            resolve(body.toString());
          }
        }
      });
    });
    req.on("error", reject);
    if (options.body) req.write(JSON.stringify(options.body));
    req.end();
  });
}

function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const handler = (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        const loc = res.headers.location;
        const mod = loc.startsWith("https") ? https : require("http");
        mod.get(loc, handler).on("error", reject);
        return;
      }
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const buf = Buffer.concat(chunks);
        fs.writeFileSync(filepath, buf);
        resolve(filepath);
      });
    };
    https.get(url, handler).on("error", reject);
  });
}

// ════════════════════════════════════════════════════
//  LANDPORTAL API CALLS
// ════════════════════════════════════════════════════

async function fetchPropertyData(propertyId, fips) {
  console.log(`📡 Fetching property data for ID ${propertyId}, FIPS ${fips}...`);
  const data = await httpRequest(`${LP_API}/mobile_app/v1/property`, {
    method: "POST",
    body: { property_id: String(propertyId), fips: String(fips) },
  });

  if (!data.property) {
    throw new Error(`API returned no property data: ${JSON.stringify(data)}`);
  }

  return data.property;
}

// ════════════════════════════════════════════════════
//  MAPBOX MAP GENERATION
// ════════════════════════════════════════════════════

function generateMapUrl(geometry, opts = {}) {
  const coords = geometry.coordinates[0][0]; // First ring of MultiPolygon

  // Simplify coordinates for URL length limits (~8000 char max)
  const maxPoints = opts.maxPoints || 40;
  const step = Math.max(1, Math.floor(coords.length / maxPoints));
  const simplified = [];
  for (let i = 0; i < coords.length; i += step) simplified.push(coords[i]);
  if (simplified[simplified.length - 1] !== coords[0]) simplified.push(coords[0]);

  const geojson = {
    type: "Feature",
    properties: {
      stroke: opts.strokeColor || "#ff4444",
      "stroke-width": opts.strokeWidth || 3,
      "stroke-opacity": 0.9,
      fill: opts.fillColor || "#ff4444",
      "fill-opacity": opts.fillOpacity || 0.15,
    },
    geometry: { type: "Polygon", coordinates: [simplified] },
  };

  const encoded = encodeURIComponent(JSON.stringify(geojson));
  const style = opts.style || "satellite-streets-v12";
  const width = opts.width || 800;
  const height = opts.height || 600;

  return `https://api.mapbox.com/styles/v1/mapbox/${style}/static/geojson(${encoded})/auto/${width}x${height}@2x?padding=40&access_token=${MAPBOX_KEY}`;
}

async function generateParcelMap(geometry, outputPath) {
  console.log("🗺️  Generating satellite map with parcel boundary...");
  const url = generateMapUrl(geometry);
  await downloadImage(url, outputPath);
  const stats = fs.statSync(outputPath);
  console.log(`   ✅ Map saved: ${outputPath} (${Math.round(stats.size / 1024)} KB)`);
  return outputPath;
}

// ════════════════════════════════════════════════════
//  DATA EXTRACTION HELPERS
// ════════════════════════════════════════════════════

function extractPropertyInfo(property) {
  const p = property.properties;
  const geomData = typeof p.geometry === "string" ? JSON.parse(p.geometry) : p.geometry;

  return {
    // Identity
    apn: p.apn || p.apn_cleaned || "N/A",
    propertyId: p.property_id || p.propertyid,
    fips: p.fips,
    owner1: p.ownername1full || `${p.owner1firstname || ""} ${p.owner1lastname || ""}`.trim(),
    owner2: p.ownername2full || "",
    mailingAddress: [
      p.mailingfullstreetaddress,
      `${p.mailingcity || ""}, ${p.mailingstate || ""} ${p.mailingzip5 || ""}`,
    ].filter(Boolean).join(", "),

    // Location
    state: p.situsstate || property.situsstate,
    county: p.situscounty || property.situscounty || p.mailingcountyname,
    municipality: p.municipality || "N/A",
    latitude: p.latitude || p.situslatitude,
    longitude: p.longitude || p.situslongitude,
    legalDescription: p.legaldescription || "N/A",
    schoolDistrict: p.schooldistrictname || "N/A",

    // Size
    acres: parseFloat(p.lotsizeacres) || parseFloat(p.calc_acres) || 0,
    sqft: parseInt(p.lotsizesqft) || 0,

    // Land Use
    landUse: p.landusecodedescription || p.landusecode || "N/A",
    landUseCode: p.landusecode || "N/A",
    vacant: p.vacant === true || p.vacant === "true",
    buildingCount: parseInt(p.bldg_count) || 0,

    // Valuation
    assessedValue: parseFloat(p.assdtotalvalue) || 0,
    assessedLand: parseFloat(p.assdlandvalue) || 0,
    marketValue: parseFloat(p.markettotalvalue) || 0,
    tlpEstimate: parseFloat(p.tlp_estimate) || 0,
    tlpPPA: parseFloat(p.tlp_ppa) || 0,
    taxAmount: parseFloat(p.taxamt) || 0,
    taxYear: p.taxyear || "N/A",

    // Due Diligence
    landLocked: p.land_locked === true || p.land_locked === "true",
    roadFrontage: parseFloat(p.road_frontage) || 0,
    wetlandsPercent: parseFloat(p.wetlands_cover_percentage) || 0,
    femaFloodPercent: parseFloat(p.fema_cover_percentage) || 0,
    femaFloodZone: p.flfemafloodzone || "N/A",
    femaMapDate: p.flfemamapdate || "N/A",
    buildabilityPercent: parseFloat(p.buildability_total_perc) || 0,
    buildabilityArea: parseFloat(p.buildability_area) || 0,

    // Slope & Elevation
    slopeAverage: parseFloat(p.slope_average) || 0,
    slopeFlat: parseFloat(p.percentage_of_land_with_flat_slope_0_05) || 0,
    slopeMinimal: parseFloat(p.percentage_of_land_with_minimal_slope_05_5) || 0,
    slopeModerate: parseFloat(p.percentage_of_land_with_moderate_slope_5_10) || 0,
    slopeHeavy: parseFloat(p.percentage_of_land_with_heavy_slope_10_15) || 0,
    slopeExtreme: parseFloat(p["percentage_of_land_with_extreme_slope_15"]) || 0,
    elevationAvg: parseFloat(p.elevation_average) || 0,
    elevationMin: parseFloat(p.elevation_min) || 0,
    elevationMax: parseFloat(p.elevation_max) || 0,

    // Comps (may be JSON string or array)
    comps: (() => {
      if (!p.similars) return [];
      if (typeof p.similars === "string") { try { return JSON.parse(p.similars); } catch { return []; } }
      return p.similars;
    })(),

    // Other
    otherPropertiesOwned: parseInt(p.otherpropertiesowned) || 0,
    geometry: geomData,
    bbox: p.bbox,
  };
}

// ════════════════════════════════════════════════════
//  DOCX HELPERS
// ════════════════════════════════════════════════════

function headerCell(text, width) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: DARK_BLUE, type: ShadingType.CLEAR },
    margins: cellMargins,
    verticalAlign: "center",
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, font: "Arial", size: 20, color: WHITE })] })],
  });
}

function dataCell(text, width, opts = {}) {
  const shade = opts.shade || null;
  const bold = opts.bold || false;
  const color = opts.color || "000000";
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: shade ? { fill: shade, type: ShadingType.CLEAR } : undefined,
    margins: cellMargins,
    children: [new Paragraph({ children: [new TextRun({ text: String(text), font: "Arial", size: 20, bold, color })] })],
  });
}

function kvRow(label, value, shade) {
  return new TableRow({
    children: [
      dataCell(label, 3200, { bold: true, shade }),
      dataCell(String(value), 6160, { shade }),
    ],
  });
}

function sectionHeading(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 200 },
    children: [new TextRun({ text, font: "Arial", size: 28, bold: true, color: DARK_BLUE })],
  });
}

function subHeading(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 140 },
    children: [new TextRun({ text, font: "Arial", size: 24, bold: true, color: MEDIUM_BLUE })],
  });
}

function bodyText(text) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text, font: "Arial", size: 20 })],
  });
}

function calloutBox(title, lines, color, bgColor) {
  const noBordersExceptLeft = {
    top: { style: BorderStyle.NONE, size: 0, color: WHITE },
    bottom: { style: BorderStyle.NONE, size: 0, color: WHITE },
    left: { style: BorderStyle.SINGLE, size: 6, color },
    right: { style: BorderStyle.NONE, size: 0, color: WHITE },
  };
  return new Table({
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: noBordersExceptLeft,
            width: { size: 9360, type: WidthType.DXA },
            shading: { fill: bgColor, type: ShadingType.CLEAR },
            margins: { top: 100, bottom: 100, left: 200, right: 200 },
            children: [
              new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: title, font: "Arial", size: 22, bold: true, color })] }),
              ...lines.map(l => new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: l, font: "Arial", size: 20 })] })),
            ],
          }),
        ],
      }),
    ],
    width: { size: 9360, type: WidthType.DXA },
  });
}

function numberedItem(num, text) {
  return new Paragraph({
    spacing: { after: 100 },
    indent: { left: 360 },
    children: [
      new TextRun({ text: `${num}. `, font: "Arial", size: 20, bold: true, color: DARK_BLUE }),
      new TextRun({ text, font: "Arial", size: 20 }),
    ],
  });
}

function bulletItem(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 80 },
    indent: { left: 720 },
    children: [
      new TextRun({ text: "• ", font: "Arial", size: 20, color: opts.color || DARK_BLUE }),
      new TextRun({ text, font: "Arial", size: 20, color: opts.color || "000000", bold: opts.bold || false }),
    ],
  });
}

// ════════════════════════════════════════════════════
//  ANALYSIS FUNCTIONS
// ════════════════════════════════════════════════════

function analyzeRedFlags(info) {
  const flags = [];

  if (info.landLocked) {
    flags.push({
      title: "Landlocked Flag Detected",
      detail: `Land Portal flags this parcel as landlocked with ${info.roadFrontage} ft of road frontage. This is a data flag — confirm with county GIS and check if adjacent parcels share the same owner, which could provide practical access.`,
      severity: "medium",
    });
  }

  if (info.femaFloodPercent > 20) {
    flags.push({
      title: `Significant FEMA Flood Coverage (${info.femaFloodPercent.toFixed(1)}%)`,
      detail: "More than 20% of the parcel falls within FEMA flood zones. This could affect buildability, insurance costs, and resale value.",
      severity: "high",
    });
  } else if (info.femaFloodPercent > 5) {
    flags.push({
      title: `Partial FEMA Flood Coverage (${info.femaFloodPercent.toFixed(1)}%)`,
      detail: "A portion of the parcel has FEMA flood zone coverage. Review the flood map to determine if buildable areas are affected.",
      severity: "low",
    });
  }

  if (info.wetlandsPercent > 15) {
    flags.push({
      title: `Wetlands Coverage (${info.wetlandsPercent.toFixed(1)}%)`,
      detail: "Significant wetlands coverage may restrict development options and require permits for any modifications.",
      severity: "medium",
    });
  }

  if (info.slopeExtreme > 25) {
    flags.push({
      title: `Extreme Slope (${info.slopeExtreme.toFixed(1)}% of land >15%)`,
      detail: "A significant portion of the land has extreme slopes, limiting buildable area and potentially complicating access.",
      severity: "medium",
    });
  }

  if (info.buildabilityPercent < 50) {
    flags.push({
      title: `Low Buildability (${info.buildabilityPercent.toFixed(1)}%)`,
      detail: "Less than half the parcel is considered buildable, which affects development potential and may impact value.",
      severity: "high",
    });
  }

  return flags;
}

function analyzePositives(info) {
  const positives = [];

  if (info.acres >= 10) {
    positives.push(`Sizable acreage (${info.acres.toFixed(1)} acres) — suitable for agricultural, recreational, or development use.`);
  }

  if (info.buildabilityPercent > 75) {
    positives.push(`Strong buildability at ${info.buildabilityPercent.toFixed(1)}% — most of the parcel is usable.`);
  }

  if (info.wetlandsPercent < 5) {
    positives.push(`Minimal wetlands coverage (${info.wetlandsPercent.toFixed(1)}%) — limited regulatory constraints.`);
  }

  if (info.vacant && info.buildingCount === 0) {
    positives.push("Vacant land with no structures — clean slate for buyer's intended use.");
  }

  if (info.slopeFlat + info.slopeMinimal > 30) {
    positives.push(`${(info.slopeFlat + info.slopeMinimal).toFixed(1)}% of land has flat to minimal slope — good for building or agriculture.`);
  }

  if (info.comps.length > 0) {
    const avgPPA = info.comps.reduce((sum, c) => sum + (c.price_acres || 0), 0) / info.comps.length;
    if (avgPPA > 0) {
      positives.push(`Comparable sales suggest market activity in the area at ~$${Math.round(avgPPA).toLocaleString()}/acre.`);
    }
  }

  return positives;
}

// ════════════════════════════════════════════════════
//  REPORT GENERATION
// ════════════════════════════════════════════════════

async function generateReport(info, mapImagePath, outputPath) {
  console.log("📝 Generating Word document report...");

  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const mapImage = fs.readFileSync(mapImagePath);

  // Build Land Portal URL
  const lpParams = Buffer.from(`fips=${info.fips}&ll_uuid=${info.propertyId}&apn=${info.apn}`).toString("base64");
  const lpUrl = `https://landportal.com/?property=${encodeURIComponent(lpParams)}`;

  // Analysis
  const redFlags = analyzeRedFlags(info);
  const positives = analyzePositives(info);

  const sections = [];

  // ── Title ──
  sections.push(
    new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: "PARCEL RESEARCH REPORT", font: "Arial", size: 36, bold: true, color: DARK_BLUE })] }),
    new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: `${info.county} County, ${info.state}  •  APN ${info.apn}`, font: "Arial", size: 22, color: GRAY_TEXT })] }),
    new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: `Report Date: ${today}`, font: "Arial", size: 20, color: GRAY_TEXT })] }),
  );

  // ── Land Portal Link Button ──
  sections.push(
    new Table({
      rows: [new TableRow({
        children: [new TableCell({
          borders: noBorders,
          width: { size: 9360, type: WidthType.DXA },
          shading: { fill: MEDIUM_BLUE, type: ShadingType.CLEAR },
          margins: { top: 100, bottom: 100, left: 200, right: 200 },
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new ExternalHyperlink({
              link: lpUrl,
              children: [new TextRun({ text: "▶  OPEN THIS PARCEL IN LANDPORTAL", font: "Arial", size: 22, bold: true, color: WHITE, underline: {} })],
            })],
          })],
        })],
      })],
      width: { size: 9360, type: WidthType.DXA },
    }),
    new Paragraph({ spacing: { after: 300 }, children: [] }),
  );

  // ── Property Snapshot ──
  sections.push(sectionHeading("1. Property Snapshot"));
  const snapshotRows = [
    kvRow("Owner", info.owner1 + (info.owner2 ? ` & ${info.owner2}` : "")),
    kvRow("Mailing Address", info.mailingAddress, LIGHT_GRAY),
    kvRow("APN", info.apn),
    kvRow("County / State", `${info.county} County, ${info.state}`, LIGHT_GRAY),
    kvRow("Municipality", info.municipality),
    kvRow("Acreage", `${info.acres.toFixed(1)} acres (${info.sqft.toLocaleString()} sq ft)`, LIGHT_GRAY),
    kvRow("Land Use", info.landUse),
    kvRow("Vacant", info.vacant ? "Yes" : "No", LIGHT_GRAY),
    kvRow("Buildings", String(info.buildingCount)),
    kvRow("School District", info.schoolDistrict, LIGHT_GRAY),
    kvRow("Legal Description", info.legalDescription),
    kvRow("Other Properties Owned", String(info.otherPropertiesOwned), LIGHT_GRAY),
  ];
  sections.push(new Table({ rows: snapshotRows, width: { size: 9360, type: WidthType.DXA } }));

  // ── Parcel Map ──
  sections.push(
    new Paragraph({ spacing: { before: 300 }, children: [] }),
    sectionHeading("2. Parcel Map"),
    new Paragraph({
      spacing: { after: 200 },
      alignment: AlignmentType.CENTER,
      children: [new ImageRun({ data: mapImage, transformation: { width: 540, height: 405 }, type: "jpg" })],
    }),
    new Paragraph({
      spacing: { after: 200 },
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "Satellite view with parcel boundary overlay (red). Source: Mapbox / Maxar.", font: "Arial", size: 18, italics: true, color: GRAY_TEXT })],
    }),
  );

  // ── Valuation ──
  sections.push(sectionHeading("3. Valuation & Tax Data"));
  sections.push(new Table({
    rows: [
      kvRow("County Assessed Value", `$${info.assessedValue.toLocaleString()}`),
      kvRow("County Assessed (Land Only)", `$${info.assessedLand.toLocaleString()}`, LIGHT_GRAY),
      kvRow("Market Value (County)", `$${info.marketValue.toLocaleString()}`),
      kvRow("Land Portal AI Estimate", `$${Math.round(info.tlpEstimate).toLocaleString()}`, LIGHT_GRAY),
      kvRow("Land Portal Est. $/Acre", `$${Math.round(info.tlpPPA).toLocaleString()}`),
      kvRow("Annual Tax", `$${info.taxAmount.toLocaleString()} (${info.taxYear})`, LIGHT_GRAY),
    ],
    width: { size: 9360, type: WidthType.DXA },
  }));

  // ── Comparable Sales ──
  if (info.comps.length > 0) {
    sections.push(
      new Paragraph({ spacing: { before: 200 }, children: [] }),
      subHeading("Comparable Sales"),
    );

    const compHeaderRow = new TableRow({
      children: [
        headerCell("Location", 2400),
        headerCell("Acres", 1100),
        headerCell("Sale Price", 1600),
        headerCell("$/Acre", 1400),
        headerCell("Date", 1200),
        headerCell("Dist.", 1060),
      ],
    });

    const compRows = info.comps.map((c, i) => {
      const shade = i % 2 === 1 ? LIGHT_GRAY : null;
      const saleDate = c.sold_month && c.sold_year ? `${c.sold_month}/${c.sold_year}` : "N/A";
      return new TableRow({
        children: [
          dataCell(c.municipality || "N/A", 2400, { shade }),
          dataCell(String(c.area_acres || "N/A"), 1100, { shade }),
          dataCell(`$${(c.mls_price || 0).toLocaleString()}`, 1600, { shade }),
          dataCell(`$${Math.round(c.price_acres || 0).toLocaleString()}`, 1400, { shade }),
          dataCell(saleDate, 1200, { shade }),
          dataCell(`${(c.distance || 0).toFixed(1)} mi`, 1060, { shade }),
        ],
      });
    });

    sections.push(new Table({ rows: [compHeaderRow, ...compRows], width: { size: 9360, type: WidthType.DXA } }));

    // Comp analysis
    const avgPPA = info.comps.reduce((s, c) => s + (c.price_acres || 0), 0) / info.comps.length;
    const avgPrice = info.comps.reduce((s, c) => s + (c.mls_price || 0), 0) / info.comps.length;
    sections.push(
      new Paragraph({ spacing: { before: 120 }, children: [] }),
      calloutBox(
        "Comp Analysis Summary",
        [
          `Average price per acre across ${info.comps.length} comps: $${Math.round(avgPPA).toLocaleString()}/acre`,
          `Average total sale price: $${Math.round(avgPrice).toLocaleString()}`,
          `Land Portal AI estimate for subject: $${Math.round(info.tlpEstimate).toLocaleString()} ($${Math.round(info.tlpPPA).toLocaleString()}/acre)`,
        ],
        GREEN, "E8F5E9"
      ),
    );
  }

  // ── Flood Zone ──
  sections.push(
    new Paragraph({ spacing: { before: 200 }, children: [] }),
    sectionHeading("4. FEMA Flood Zone"),
  );
  sections.push(new Table({
    rows: [
      kvRow("Flood Zone Coverage", `${info.femaFloodPercent.toFixed(1)}% of parcel`),
      kvRow("Flood Zone Designation", info.femaFloodZone.substring(0, 100), LIGHT_GRAY),
      kvRow("FEMA Map Date", info.femaMapDate),
    ],
    width: { size: 9360, type: WidthType.DXA },
  }));

  if (info.femaFloodPercent > 0) {
    sections.push(
      new Paragraph({ spacing: { before: 120 }, children: [] }),
      bodyText(`${info.femaFloodPercent.toFixed(1)}% of this parcel is within FEMA-designated flood zones. Buyers should review the official FEMA flood map and consider whether the affected area overlaps with planned building sites.`),
    );
  }

  // ── Wetlands ──
  sections.push(sectionHeading("5. Wetlands"));
  sections.push(bodyText(
    info.wetlandsPercent < 2
      ? `Minimal wetlands presence at ${info.wetlandsPercent.toFixed(2)}% coverage. This is unlikely to present significant regulatory or development constraints.`
      : `${info.wetlandsPercent.toFixed(2)}% of the parcel has wetlands coverage. Buyers should verify the extent and type of wetlands via the National Wetlands Inventory to understand development restrictions.`
  ));

  // ── Slope & Terrain ──
  sections.push(sectionHeading("6. Slope & Terrain Analysis"));
  sections.push(new Table({
    rows: [
      kvRow("Average Slope", `${info.slopeAverage.toFixed(1)}%`),
      kvRow("Flat (0–5%)", `${info.slopeFlat.toFixed(1)}% of parcel`, LIGHT_GRAY),
      kvRow("Minimal (5–5%)", `${info.slopeMinimal.toFixed(1)}% of parcel`),
      kvRow("Moderate (5–10%)", `${info.slopeModerate.toFixed(1)}% of parcel`, LIGHT_GRAY),
      kvRow("Heavy (10–15%)", `${info.slopeHeavy.toFixed(1)}% of parcel`),
      kvRow("Extreme (>15%)", `${info.slopeExtreme.toFixed(1)}% of parcel`, LIGHT_GRAY),
    ],
    width: { size: 9360, type: WidthType.DXA },
  }));

  sections.push(
    new Paragraph({ spacing: { before: 100 }, children: [] }),
    subHeading("Elevation"),
    new Table({
      rows: [
        kvRow("Average Elevation", `${Math.round(info.elevationAvg)} m (${Math.round(info.elevationAvg * 3.281)} ft)`),
        kvRow("Elevation Range", `${Math.round(info.elevationMin)} m – ${Math.round(info.elevationMax)} m (${Math.round(info.elevationMin * 3.281)} – ${Math.round(info.elevationMax * 3.281)} ft)`, LIGHT_GRAY),
      ],
      width: { size: 9360, type: WidthType.DXA },
    }),
  );

  // ── Buildability ──
  sections.push(sectionHeading("7. Buildability Assessment"));
  sections.push(new Table({
    rows: [
      kvRow("Buildability Score", `${info.buildabilityPercent.toFixed(1)}%`),
      kvRow("Buildable Area", `${info.buildabilityArea.toFixed(1)} acres of ${info.acres.toFixed(1)} total`, LIGHT_GRAY),
    ],
    width: { size: 9360, type: WidthType.DXA },
  }));
  sections.push(bodyText(
    info.buildabilityPercent > 75
      ? `This parcel has a strong buildability score. The majority of the land (${info.buildabilityArea.toFixed(1)} acres) is considered suitable for development.`
      : `This parcel has a buildability score of ${info.buildabilityPercent.toFixed(1)}%. Approximately ${info.buildabilityArea.toFixed(1)} acres are considered suitable for development. The remainder may be constrained by slope, wetlands, or flood zones.`
  ));

  // ── Access & Landlocked ──
  sections.push(sectionHeading("8. Access & Road Frontage"));
  sections.push(new Table({
    rows: [
      kvRow("Landlocked Flag", info.landLocked ? "Yes — flagged by Land Portal" : "No"),
      kvRow("Road Frontage", `${info.roadFrontage} ft`, LIGHT_GRAY),
    ],
    width: { size: 9360, type: WidthType.DXA },
  }));

  if (info.landLocked) {
    sections.push(
      new Paragraph({ spacing: { before: 120 }, children: [] }),
      calloutBox(
        "Landlocked Analysis Required",
        [
          "This parcel is flagged as landlocked. Before treating this as a dealbreaker, verify:",
          "1. Do any directly adjoining parcels share the same owner?",
          "2. If so, does that neighboring parcel connect to a public road?",
          "3. Are there any easements recorded with the county?",
          `Note: The owner (${info.owner1}) owns ${info.otherPropertiesOwned} other properties — check if adjacent parcels are among them.`,
        ],
        AMBER, "FFF8E1"
      ),
    );
  }

  // ── Red Flags ──
  sections.push(
    new Paragraph({ spacing: { before: 200 }, children: [] }),
    sectionHeading("9. Red Flags"),
  );
  if (redFlags.length === 0) {
    sections.push(bodyText("No significant red flags identified for this parcel."));
  } else {
    redFlags.forEach((flag, i) => {
      sections.push(numberedItem(i + 1, `${flag.title}`));
      sections.push(bulletItem(flag.detail));
    });
  }

  // ── Positives ──
  sections.push(sectionHeading("10. Positives"));
  if (positives.length === 0) {
    sections.push(bodyText("Standard property — no standout positives identified."));
  } else {
    positives.forEach((p, i) => {
      sections.push(numberedItem(i + 1, p));
    });
  }

  // ── Follow-Up ──
  sections.push(sectionHeading("11. Recommended Follow-Up"));
  const followUps = [
    "Verify landlocked status via county GIS — check adjoining parcels for same-owner access chains.",
    "Review FEMA flood map to determine if flood zones overlap with buildable areas.",
    "Confirm soil types via USDA Web Soil Survey for agricultural suitability.",
    "Check county zoning to verify allowed uses (residential, agricultural, recreational).",
    "Verify road access and confirm any recorded easements with the county recorder.",
    "Research utility availability (electric, water, sewer/septic) for the area.",
  ];
  followUps.forEach((f, i) => sections.push(numberedItem(i + 1, f)));

  // ── Build Document ──
  const doc = new Document({
    styles: {
      paragraphStyles: [{
        id: "Normal",
        name: "Normal",
        run: { font: "Arial", size: 20 },
        paragraph: { spacing: { line: 276 } },
      }],
    },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1080, bottom: 1080, left: 1440, right: 1440 },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: `Parcel Research: APN ${info.apn}  |  ${info.county} Co., ${info.state}`, font: "Arial", size: 16, color: GRAY_TEXT, italics: true })],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "Page ", font: "Arial", size: 16, color: GRAY_TEXT }),
              new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16, color: GRAY_TEXT }),
              new TextRun({ text: "  |  Generated by Land Portal API + Claude", font: "Arial", size: 16, color: GRAY_TEXT }),
            ],
          })],
        }),
      },
      children: sections,
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);
  console.log(`   ✅ Report saved: ${outputPath} (${Math.round(buffer.length / 1024)} KB)`);
}

// ════════════════════════════════════════════════════
//  MAIN
// ════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error("Usage: node parcel-research-api.js <property_id> <fips> [output_dir]");
    console.error("Example: node parcel-research-api.js 54779266 19181 ./output");
    process.exit(1);
  }

  const propertyId = args[0];
  const fips = args[1];
  const outputDir = args[2] || ".";

  console.log("═══════════════════════════════════════════");
  console.log("  Land Portal API Parcel Research Tool");
  console.log("═══════════════════════════════════════════\n");

  // 1. Fetch property data
  const property = await fetchPropertyData(propertyId, fips);
  const info = extractPropertyInfo(property);

  console.log(`   Owner: ${info.owner1}`);
  console.log(`   Location: ${info.county} County, ${info.state}`);
  console.log(`   Acres: ${info.acres.toFixed(1)}`);
  console.log(`   APN: ${info.apn}\n`);

  // 2. Generate map
  const mapPath = path.join(outputDir, `parcel-map-${info.apn}.jpg`);
  await generateParcelMap(property.geometry, mapPath);

  // 3. Generate report
  const reportFilename = `Parcel-Research-${info.apn}-${info.county.replace(/\s/g, "-")}-County-${info.state}.docx`;
  const reportPath = path.join(outputDir, reportFilename);
  await generateReport(info, mapPath, reportPath);

  console.log("\n═══════════════════════════════════════════");
  console.log("  ✅ Research complete!");
  console.log(`  Report: ${reportPath}`);
  console.log(`  Map:    ${mapPath}`);
  console.log("═══════════════════════════════════════════\n");
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
