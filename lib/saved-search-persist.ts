import { extractFiltersFromPrompt } from "@/lib/searchQueryExtraction";
import { US_STATE_ABBR_TO_NAME } from "@/lib/us-state-abbreviation-to-name";

export type SavedSearchPersistInput = {
  minPrice?: string | null;
  maxPrice?: string | null;
  minAcres?: string | null;
  maxAcres?: string | null;
  state?: string | null;
  county?: string | null;
  prompt?: string | null;
  propertyType?: string | null;
  landType?: string | null;
  activities?: string[] | null;
};

export type SavedSearchPersistFields = {
  prompt: string | null;
  minPrice: string | null;
  maxPrice: string | null;
  minAcres: string | null;
  maxAcres: string | null;
  state: string | null;
  county: string | null;
  propertyType: string | null;
  landType: string | null;
  activities: string[] | null;
};

function trimOrNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function numericStringOrNull(value: string | number | null | undefined): string | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value));
  return Number.isFinite(n) ? String(n) : null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Best-effort state lookup from free text (used when client did not send state). */
function resolveStateFromPrompt(prompt: string): string | null {
  const names = Object.values(US_STATE_ABBR_TO_NAME).sort((a, b) => b.length - a.length);
  for (const name of names) {
    if (new RegExp(`\\b${escapeRegExp(name)}\\b`, "i").test(prompt)) {
      return name;
    }
  }

  for (const [abbr, name] of Object.entries(US_STATE_ABBR_TO_NAME)) {
    if (new RegExp(`\\b${abbr}\\b`, "i").test(prompt)) {
      return name;
    }
  }

  return null;
}

/**
 * Normalize saved-search criteria for persistence.
 * Client-provided structured fields win; missing values are filled from the prompt when possible.
 */
export function resolveSavedSearchPersistFields(
  input: SavedSearchPersistInput,
): SavedSearchPersistFields {
  const prompt = trimOrNull(input.prompt);

  let minPrice = numericStringOrNull(input.minPrice);
  let maxPrice = numericStringOrNull(input.maxPrice);
  let minAcres = numericStringOrNull(input.minAcres);
  let maxAcres = numericStringOrNull(input.maxAcres);
  let state = trimOrNull(input.state);
  let county = trimOrNull(input.county);
  let propertyType = trimOrNull(input.propertyType);
  let landType = trimOrNull(input.landType);
  let activities =
    Array.isArray(input.activities) && input.activities.length > 0
      ? input.activities.map((a) => a.trim()).filter(Boolean)
      : null;

  if (prompt) {
    const extracted = extractFiltersFromPrompt(prompt);

    if (minPrice == null && extracted.minPrice != null) {
      minPrice = String(extracted.minPrice);
    }
    if (maxPrice == null && extracted.maxPrice != null) {
      maxPrice = String(extracted.maxPrice);
    }
    if (minAcres == null && extracted.minAcres != null) {
      minAcres = String(extracted.minAcres);
    }
    if (maxAcres == null && extracted.maxAcres != null) {
      maxAcres = String(extracted.maxAcres);
    }
    if (state == null) {
      state = resolveStateFromPrompt(prompt);
    }
    if (propertyType == null && extracted.propertyTypes?.[0]) {
      propertyType = extracted.propertyTypes[0];
    }
    if (activities == null && extracted.activities?.length) {
      activities = extracted.activities;
    }
  }

  if (landType == null && propertyType != null) {
    landType = propertyType;
  }

  return {
    prompt,
    minPrice,
    maxPrice,
    minAcres,
    maxAcres,
    state,
    county,
    propertyType,
    landType,
    activities,
  };
}
