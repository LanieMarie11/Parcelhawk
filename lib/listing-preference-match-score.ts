import {
  PREFERENCE_ACREAGE_TO_RANGE,
  PREFERENCE_BUDGET_TO_RANGE,
} from "@/lib/land-preference-buckets";

export type UserPreferenceLabels = {
  preferenceBudget: string | null | undefined;
  preferenceAcreage: string | null | undefined;
};

export type ListingPreferenceMatchInputs = {
  price: number | null;
  acres: number | null;
};

const PRICE_SCORE_TOTAL = 50;
const ACREAGE_SCORE_TOTAL = 50;

type NumericRange = { min: number; max: number | null };

function decayPoints(maxPoints: number, overshootRatio: number): number {
  if (overshootRatio <= 0.1) return Math.round(maxPoints * 0.75);
  if (overshootRatio <= 0.25) return Math.round(maxPoints * 0.5);
  if (overshootRatio <= 0.5) return Math.round(maxPoints * 0.25);
  return 0;
}

/** Points for how well a listing value fits the user's saved preference range. */
export function scoreValueInPreferenceRange(
  value: number,
  range: NumericRange,
  maxPoints: number,
): number {
  const { min, max } = range;

  if (value >= min && (max == null || value <= max)) {
    return maxPoints;
  }

  if (value < min) {
    if (min <= 0) return 0;
    return decayPoints(maxPoints, (min - value) / min);
  }

  if (max == null) return maxPoints;
  return decayPoints(maxPoints, (value - max) / max);
}

function resolveBudgetRange(label: string | null | undefined): NumericRange | null {
  if (!label?.trim()) return null;
  return PREFERENCE_BUDGET_TO_RANGE[label.trim()] ?? null;
}

function resolveAcreageRange(label: string | null | undefined): NumericRange | null {
  if (!label?.trim()) return null;
  return PREFERENCE_ACREAGE_TO_RANGE[label.trim()] ?? null;
}

/**
 * 0–100 match score from the signed-in user's budget/acreage preferences vs a listing.
 * Returns null when the user has not set either preference.
 */
export function computeListingPreferenceMatchScore(
  preferences: UserPreferenceLabels,
  listing: ListingPreferenceMatchInputs,
): number | null {
  const budgetRange = resolveBudgetRange(preferences.preferenceBudget);
  const acreageRange = resolveAcreageRange(preferences.preferenceAcreage);

  const hasBudgetPref = budgetRange != null;
  const hasAcreagePref = acreageRange != null;

  if (!hasBudgetPref && !hasAcreagePref) return null;

  const pricePoints = hasBudgetPref
    ? listing.price != null
      ? scoreValueInPreferenceRange(listing.price, budgetRange!, PRICE_SCORE_TOTAL)
      : 0
    : null;

  const acreagePoints = hasAcreagePref
    ? listing.acres != null
      ? scoreValueInPreferenceRange(listing.acres, acreageRange!, ACREAGE_SCORE_TOTAL)
      : 0
    : null;

  if (pricePoints != null && acreagePoints != null) {
    return pricePoints + acreagePoints;
  }

  if (pricePoints != null) {
    return Math.round((pricePoints / PRICE_SCORE_TOTAL) * 100);
  }

  return Math.round((acreagePoints! / ACREAGE_SCORE_TOTAL) * 100);
}
