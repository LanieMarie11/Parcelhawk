import type { ParcelResearchReport } from "@/lib/property-reports/build-parcel-research-report"

function formatCurrency(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "N/A"
  return `$${Math.round(value).toLocaleString()}`
}

function formatNumber(value: number | null | undefined, digits = 1): string {
  if (value == null || Number.isNaN(value)) return "N/A"
  return value.toFixed(digits)
}

function bulletLine(label: string, value: string): string {
  return `* **${label}:** ${value}`
}

export function parcelResearchReportToMarkdown(report: ParcelResearchReport): string {
  const { snapshot, valuation, comparables, flood, wetlands, slope, elevation, buildability, access } =
    report

  const lines: string[] = [
    "### Property Snapshot",
    "",
    bulletLine("APN", snapshot.apn),
    bulletLine("Owner", snapshot.owner),
    bulletLine("Co-owner", snapshot.owner2 || "N/A"),
    bulletLine("Situs address", snapshot.situsAddress),
    bulletLine("Mailing address", snapshot.mailingAddress),
    bulletLine("County", `${snapshot.county}, ${snapshot.state}`),
    bulletLine("Municipality", snapshot.municipality),
    bulletLine("Acres", formatNumber(snapshot.acres, 2)),
    bulletLine("Square feet", snapshot.sqft.toLocaleString()),
    bulletLine("Land use", snapshot.landUse),
    bulletLine("Vacant", snapshot.vacant ? "Yes" : "No"),
    bulletLine("Buildings", String(snapshot.buildingCount)),
    bulletLine("School district", snapshot.schoolDistrict),
    bulletLine("Other properties owned", String(snapshot.otherPropertiesOwned)),
    bulletLine(
      "Coordinates",
      snapshot.latitude != null && snapshot.longitude != null
        ? `${snapshot.latitude}, ${snapshot.longitude}`
        : "N/A",
    ),
    "",
    "### Valuation & Tax",
    "",
    bulletLine("Assessed value", formatCurrency(valuation.assessedValue)),
    bulletLine("Assessed land", formatCurrency(valuation.assessedLand)),
    bulletLine("Market value", formatCurrency(valuation.marketValue)),
    bulletLine("TLP estimate", formatCurrency(valuation.tlpEstimate)),
    bulletLine("TLP price per acre", formatCurrency(valuation.tlpPricePerAcre)),
    bulletLine("Annual tax", formatCurrency(valuation.taxAmount)),
    bulletLine("Tax year", valuation.taxYear || "N/A"),
    bulletLine("Recent sale price", formatCurrency(valuation.recentSalePrice)),
    bulletLine("Recent sale date", valuation.recentSaleDate || "N/A"),
    "",
    "### Flood",
    "",
    bulletLine("Coverage", `${formatNumber(flood.coveragePercent, 1)}%`),
    bulletLine("Zone", flood.zone || "N/A"),
    bulletLine("Map date", flood.mapDate || "N/A"),
    "",
    flood.summary,
    "",
    "### Wetlands",
    "",
    bulletLine("Coverage", `${formatNumber(wetlands.coveragePercent, 2)}%`),
    "",
    wetlands.summary,
    "",
    "### Slope",
    "",
    bulletLine("Average", formatNumber(slope.average, 1)),
    bulletLine("Flat", `${formatNumber(slope.flat, 1)}%`),
    bulletLine("Minimal", `${formatNumber(slope.minimal, 1)}%`),
    bulletLine("Moderate", `${formatNumber(slope.moderate, 1)}%`),
    bulletLine("Heavy", `${formatNumber(slope.heavy, 1)}%`),
    bulletLine("Extreme", `${formatNumber(slope.extreme, 1)}%`),
    "",
    "### Elevation",
    "",
    bulletLine("Average", `${formatNumber(elevation.averageFeet, 0)} ft`),
    bulletLine("Minimum", `${formatNumber(elevation.minFeet, 0)} ft`),
    bulletLine("Maximum", `${formatNumber(elevation.maxFeet, 0)} ft`),
    "",
    "### Buildability",
    "",
    bulletLine("Score", `${formatNumber(buildability.percent, 1)}%`),
    bulletLine("Buildable area", `${formatNumber(buildability.areaAcres, 2)} acres`),
    "",
    buildability.summary,
    "",
    "### Access",
    "",
    bulletLine("Landlocked", access.landLocked ? "Yes" : "No"),
    bulletLine("Road frontage", `${formatNumber(access.roadFrontageFeet, 0)} ft`),
    bulletLine("Near water", access.nearWater ? "Yes" : "No"),
  ]

  if (access.landLockedGuidance?.length) {
    lines.push("", "**Landlocked guidance:**", "")
    for (const item of access.landLockedGuidance) {
      lines.push(`* ${item}`)
    }
  }

  lines.push("", "### Comparable Sales", "")

  if (comparables.rows.length === 0) {
    lines.push("No comparable sales were found for this parcel.")
  } else {
    for (const row of comparables.rows) {
      lines.push(
        `* ${row.municipality} — ${formatNumber(row.acres, 2)} acres, ${formatCurrency(row.salePrice)} (${formatCurrency(row.pricePerAcre)}/acre), sold ${row.saleDate}, ${formatNumber(row.distanceMiles, 1)} mi away`,
      )
    }

    if (comparables.summary) {
      lines.push(
        "",
        `**Summary:** ${comparables.summary.count} comps · avg ${formatCurrency(comparables.summary.avgSalePrice)} · avg ${formatCurrency(comparables.summary.avgPricePerAcre)}/acre · TLP ${formatCurrency(comparables.summary.tlpEstimate)} (${formatCurrency(comparables.summary.tlpPricePerAcre)}/acre)`,
      )
    }
  }

  lines.push("", "### Red Flags", "")

  if (report.redFlags.length === 0) {
    lines.push("No major red flags were identified.")
  } else {
    for (const flag of report.redFlags) {
      lines.push(`### ${flag.title} (${flag.severity})`, "", flag.detail, "")
    }
  }

  lines.push("### Positives", "")

  if (report.positives.length === 0) {
    lines.push("No notable positives were identified.")
  } else {
    for (const positive of report.positives) {
      lines.push(`* ${positive}`)
    }
  }

  lines.push("", "### Recommended Follow-Up", "")

  for (const item of report.followUp) {
    lines.push(`* ${item}`)
  }

  if (report.landPortalUrl) {
    lines.push("", `**Land Portal:** ${report.landPortalUrl}`)
  }

  if (snapshot.legalDescription) {
    lines.push("", "### Legal Description", "", snapshot.legalDescription)
  }

  return lines.join("\n")
}
