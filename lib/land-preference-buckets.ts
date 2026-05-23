/**
 * Labels stored in `users.preference_budget` / sign-up and profile UIs. Dollar amounts.
 */
export const PREFERENCE_BUDGET_TO_RANGE: Record<string, { min: number; max: number | null }> = {
  "$10K-$30K": { min: 10000, max: 30000 },
  "$30K-$50K": { min: 30000, max: 50000 },
  "$50K-$75K": { min: 50000, max: 75000 },
  "$75K-$100K": { min: 75000, max: 100000 },
  "$100K-$150K": { min: 100000, max: 150000 },
  "$150K-$200K": { min: 150000, max: 200000 },
  "$200K-$300K": { min: 200000, max: 300000 },
  "Above $300K": { min: 300000, max: null },
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
