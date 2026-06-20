/**
 * Combines structured preference fit (price/acreage) with AI bio–listing match.
 * Each available signal is weighted equally toward 0–100.
 */
export function combineCompareMatchScore(
  preferenceScore: number | null,
  bioMatchScore: number | null,
): number | null {
  const scores = [preferenceScore, bioMatchScore].filter(
    (score): score is number => score != null,
  )

  if (scores.length === 0) return null

  const total = scores.reduce((sum, score) => sum + score, 0)
  return Math.round(total / scores.length)
}
