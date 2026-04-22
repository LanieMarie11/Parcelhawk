/**
 * Vertex / Gemini user prompt: extract road access, flood zone, and utilities
 * from free-text land listing descriptions (compare flow).
 */
export function buildCompareListingFeaturesPrompt(descriptionText: string): string {
  return [
    "You extract listing feature details from land listing description text.",
    "Return ONLY JSON with this exact shape:",
    '{"roadAccess":"string","floodZone":"string","utilities":"string"}',
    "",
    "Rules:",
    '- Keep values concise (2-8 words) like "Paved road access" or "Zone X (minimal risk)".',
    '- If not mentioned, return "Not provided".',
    "- Do not hallucinate or add extra keys.",
    "",
    "Listing description:",
    descriptionText,
  ].join("\n")
}

/** One block per favorite listing; used only for the compare “single AI summary” call. */
export type CompareAllListingsSummaryItem = {
  index: number
  title: string
  location: string
  description: string
}

/**
 * Vertex / Gemini user prompt: one consolidated summary for all listings in a compare.
 * Adjust the instructions here to change how the cross-listing summary reads.
 */
export function buildCompareAllListingsSummaryPrompt(
  items: CompareAllListingsSummaryItem[]
): string {
  const blocks = items.map((item) => {
    const desc =
      item.description.trim().length > 0 ? item.description : "(No description text.)"
    return [
      `### Listing ${item.index}: ${item.title}`,
      `Location: ${item.location || "N/A"}`,
      "",
      "Description:",
      desc,
    ].join("\n")
  })

  return [
    "You are helping a land buyer who is comparing several saved listings at once.",
    "Write exactly ONE short summary (2–4 sentences) that synthesizes across all listings below.",
    "Focus on how they differ in terrain, access, utilities, water/flood, zoning, or stated use,",
    "using only the provided text. Do not invent details. Avoid marketing language.",
    "If the descriptions are thin or similar, say that briefly instead of padding.",
    "",
    "Listings:",
    "",
    ...blocks,
  ].join("\n\n")
}

export type SearchQueryExtractionPromptParams = {
  userPrompt: string
  /** JSON string of allowed activity labels (exact spelling for the model). */
  activitiesList: string
  /** JSON string of allowed property type labels. */
  propertyTypesList: string
}

/**
 * Vertex / Gemini user prompt: structured land search filters + embeddingQueryText
 * from a natural-language query (`lib/searchQueryExtraction.ts`).
 */
export function buildSearchQueryExtractionPrompt(
  params: SearchQueryExtractionPromptParams
): string {
  const { userPrompt, activitiesList, propertyTypesList } = params
  return [
    "You are an assistant that extracts structured land search filters from natural language queries.",
    "",
    "The user is searching for land listings in the United States.",
    "From the user query, extract these fields when they are clearly mentioned:",
    "- minPrice (USD, as a number, e.g. 250000, not '250k')",
    "- maxPrice (USD, as a number)",
    "- minAcres (as a number of acres)",
    "- maxAcres (as a number of acres)",
    "- activities (array of strings). ONLY use values from this exact list, with exact spelling and casing:",
    `  ${activitiesList}`,
    "- propertyTypes (array of strings). ONLY use values from this exact list, with exact spelling and casing:",
    `  ${propertyTypesList}`,
    '- cities (array of strings). ONLY city name(s) as written in the query (e.g. "Dallas", "St. Louis"). Do not include state/county suffixes.',
    '- stateNames (array of strings). US state names (full names only, e.g. "Texas", "North Carolina").',
    '- stateAbbreviations (array of strings). US state abbreviations (2-letter uppercase only, e.g. "TX", "NC").',
    '- counties (array of strings). ONLY the county/parish name (no state suffix). Examples: "Orange County", "Baldwin Parish". Do not guess counties.',
    "",
    "IMPORTANT RULES:",
    "- If a field is not clearly stated, set it to null instead of guessing.",
    "- For activities and propertyTypes, only include values that match the user's intent and that appear in the lists above; use the exact string from the list.",
    '- For stateNames/stateAbbreviations: allow minor misspellings/typos (e.g. "Floridaa", "Califronia") or minor formatting issues (e.g. "N Carolina"). If the intended state is clear, output the correct canonical full state name and/or 2-letter abbreviation.',
    "- Do NOT fuzzy-match cities or counties; only extract them when explicitly and correctly mentioned in the query.",
    "- For states/counties: only extract what is explicitly mentioned in the query. Do not infer or guess (e.g. do not assume a state from a city name).",
    "- For cities: only extract what is explicitly mentioned in the query. Do not infer or guess.",
    "- Convert shorthand like '250k' to full numbers (250000).",
    "- Ranges: '10-40 acres' or 'between 10 and 40 acres' → set both minAcres and maxAcres. '200k-500k' → set both minPrice and maxPrice.",
    "- Single value defaults (price): When only ONE price is given (no range) AND no lower/upper constraint words are used (e.g. '500k'), treat the given price as the middle price: set minPrice = price*0.93 and maxPrice = price*1.07. When the user explicitly constrains the budget (e.g. 'at least X', 'minimum X', 'X+' or '>= X'), set minPrice only. When the user explicitly constrains the budget downward (e.g. 'under X', 'max X', 'below X'), set maxPrice only.",
    "- Single value defaults (acres): When only ONE acres value is given (no range) AND no lower/upper constraint words are used (e.g. '11.5 acres'), treat the given acres as the middle value and set minAcres = acres*0.93 and maxAcres = acres*1.07. When the user explicitly constrains the acreage (e.g. 'at least X', 'minimum X', 'X+' or '>= X'), set minAcres only. When the user explicitly constrains the acreage downward (e.g. 'under X acres', 'max X acres', 'below X acres'), set maxAcres only.",
    "- Phrases like 'under 500k' mean maxPrice = 500000 only.",
    "- Phrases like 'at least 20 acres' mean minAcres = 20 only.",
    "- Only use information in the query; do not infer budget or size.",
    "",
    "Also set embeddingQueryText (string or null):",
    "- This is the part of the user query used for semantic vector search against listing descriptions.",
    "- Remove phrases that are fully captured by the structured fields above (budget/price, acreage, explicit city/state/county names, and wording that only expresses activities or propertyTypes you already listed in JSON).",
    "- Keep other descriptive intent (terrain, views, access, privacy, trees, water, buildings, use cases beyond the list fields, etc.).",
    "- Use natural language only; do not repeat the JSON. If nothing remains after removing structured parts, set embeddingQueryText to null.",
    "",
    "Return ONLY a single JSON object with these exact keys (use null where not applicable): minPrice, maxPrice, minAcres, maxAcres, activities, propertyTypes, cities, stateNames, stateAbbreviations, counties, embeddingQueryText. No comments and no extra text.",
    "",
    `User query: "${userPrompt.trim()}"`,
  ].join("\n")
}
