/**
 * Labels stored in `users.preference_budget` / sign-up and profile UIs. Dollar amounts.
 */
export const PREFERENCE_BUDGET_TO_RANGE: Record<string, { min: number; max: number | null }> = {
  "$10K-$30K": { min: 10_000, max: 30_000 },
  "$30K-$50K": { min: 30_000, max: 50_000 },
  "$50K-$75K": { min: 50_000, max: 75_000 },
  "$75K-$100K": { min: 75_000, max: 100_000 },
  "$100K-$150K": { min: 100_000, max: 150_000 },
  "$150K-$200K": { min: 150_000, max: 200_000 },
  "$200K-$300K": { min: 200_000, max: 300_000 },
  "Above $300K": { min: 300_000, max: null },
}

/**
 * Labels in `users.preference_acreage` / sign-up and profile UIs. Acres.
 */
export const PREFERENCE_ACREAGE_TO_RANGE: Record<string, { min: number; max: number | null }> = {
  "Under 1 acre": { min: 0, max: 1 },
  "1-5 acres": { min: 1, max: 5 },
  "5-10 acres": { min: 5, max: 10 },
  "10-20 acres": { min: 10, max: 20 },
  "20-50 acres": { min: 20, max: 50 },
  "50-100 acres": { min: 50, max: 100 },
  "100+ acres": { min: 100, max: null },
}
