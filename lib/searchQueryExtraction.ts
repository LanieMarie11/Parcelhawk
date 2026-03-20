import { GoogleAuth } from "google-auth-library";

export type SearchQueryFilters = {
  minPrice?: number;
  maxPrice?: number;
  minAcres?: number;
  maxAcres?: number;
  activities?: string[];
  propertyTypes?: string[];
  stateNames?: string[];
  stateAbbreviations?: string[];
  counties?: string[];
  cities?: string[];
};

const ACTIVITY_KEYWORDS = [
  "Aquatic Sporting",
  "Aviation",
  "Beach",
  "Boating",
  "Camping",
  "Canoeing/Kayaking",
  "Conservation",
  "Fishing",
  "Golfing",
  "Horseback Riding",
  "Hunting",
  "Off-roading",
  "RVing",
  "Skiing",
];

const PROPERTY_TYPE_KEYWORDS = [
  "Beachfront Property",
  "Commercial Property",
  "Farms",
  "Horse Property",
  "Hunting Land",
  "Lakefront Property",
  "Ranches",
  "Recreational Property",
  "Residential Property",
  "Riverfront Property",
  "Timberland",
  "Undeveloped Land",
  "Waterfront Property",
];

function normalizeCityForFilters(s: string): string {
  // Keep periods in names like "St. Louis", but remove trailing commas and extra whitespace.
  return s.replace(/,+$/, "").replace(/\s+/g, " ").trim();
}

function normalizeStateAbbreviation(s: string): string | undefined {
  const cleaned = s.toUpperCase().replace(/[^A-Z]/g, "");
  return cleaned.length === 2 ? cleaned : undefined;
}

const STATE_ABBREVIATION_TO_NAME: Record<string, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  DC: "District of Columbia",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
};

function normalizeNumber(raw: string): number {
  const trimmed = raw.replace(/[, ]/g, "").toLowerCase();
  const match = trimmed.match(/^(\d+(?:\.\d+)?)(k|m)?$/i);
  if (!match) return Number.NaN;
  const base = parseFloat(match[1]);
  const suffix = match[2];
  if (suffix === "k") return base * 1_000;
  if (suffix === "m") return base * 1_000_000;
  return base;
}

/**
 * Very lightweight heuristic extraction of price / acres / activities / property types
 * from a free-text search prompt. This is NOT LLM-based, just regex + keyword lookup.
 */
export function extractFiltersFromPrompt(prompt: string): SearchQueryFilters {
  const text = prompt.toLowerCase();
  const filters: SearchQueryFilters = {};

  // --- Acres range: "10-50 acres" / "10 to 50 acres" ---
  const acresRangeRegex = /(\d[\d,\. ]*(?:k|m)?)[ ]*(?:-|\bto\b)[ ]*(\d[\d,\. ]*(?:k|m)?)[ ]*(acres?\b)/i;
  const acresRangeMatch = prompt.match(acresRangeRegex);
  if (acresRangeMatch) {
    const min = normalizeNumber(acresRangeMatch[1]);
    const max = normalizeNumber(acresRangeMatch[2]);
    if (!Number.isNaN(min)) filters.minAcres = min;
    if (!Number.isNaN(max)) filters.maxAcres = max;
  } else {
    // Single acres: "at least 20 acres", "20+ acres"
    const acresSingleRegex = /(at least|minimum|min|over|more than|>=|>|\+)?\s*(\d[\d,\. ]*(?:k|m)?)[ ]*(acres?\b)/i;
    const acresSingleMatch = prompt.match(acresSingleRegex);
    if (acresSingleMatch) {
      const op = acresSingleMatch[1]?.toLowerCase() ?? "";
      const value = normalizeNumber(acresSingleMatch[2]);
      if (!Number.isNaN(value)) {
        if (op.includes("over") || op.includes("more") || op.includes(">") || op.includes("minimum") || op.includes("at least") || op.includes("min") || op.includes("+")) {
          filters.minAcres = value;
        } else {
          // No operator -> treat the given acres as the middle value.
          // Example: "10 acres" => minAcres = 10*0.93, maxAcres = 10*1.07
          const min = Math.max(0, Math.round(value * 0.93 * 100) / 100);
          const max = Math.max(0, Math.round(value * 1.07 * 100) / 100);
          filters.minAcres = min;
          filters.maxAcres = max;
        }
      }
    }
  }

  // --- Price range: "$200k-$500k", "between 200k and 500k", "under 300k" ---
  const priceRangeRegex = /\$?(\d[\d,\. ]*(?:k|m)?)[ ]*(?:-|\bto\b|\band\b)[ ]*\$?(\d[\d,\. ]*(?:k|m)?)[ ]*(dollars?|usd)?/i;
  const priceRangeMatch = prompt.match(priceRangeRegex);
  if (priceRangeMatch) {
    const min = normalizeNumber(priceRangeMatch[1]);
    const max = normalizeNumber(priceRangeMatch[2]);
    if (!Number.isNaN(min)) filters.minPrice = min;
    if (!Number.isNaN(max)) filters.maxPrice = max;
  } else {
    const priceSingleRegex =
      /(under|less than|below|maximum|max|over|more than|above|minimum|min|at least|>=|>|\+)?\s*\$?(\d[\d,\. ]*(?:k|m)?)[ ]*(dollars?|usd)?/i;
    const priceSingleMatch = prompt.match(priceSingleRegex);
    if (priceSingleMatch) {
      const op = priceSingleMatch[1]?.toLowerCase() ?? "";
      const value = normalizeNumber(priceSingleMatch[2]);
      if (!Number.isNaN(value)) {
        if (op.includes("under") || op.includes("less") || op.includes("below") || op.includes("maximum") || op.includes("max")) {
          filters.maxPrice = value;
        } else if (op.includes("over") || op.includes("more") || op.includes("above") || op.includes("minimum") || op.includes("min") || op.includes("at least") || op.includes(">") || op.includes("+")) {
          filters.minPrice = value;
        } else {
          // No operator -> treat the given price as the middle price.
          // Example: "500k" => minPrice = 500k*0.93, maxPrice = 500k*1.07
          const min = Math.max(0, Math.round(value * 0.93));
          const max = Math.max(0, Math.round(value * 1.07));
          filters.minPrice = min;
          filters.maxPrice = max;
        }
      }
    }
  }

  // --- Activities (match case-insensitively, keep exact casing in output) ---
  const activities: string[] = [];
  for (const keyword of ACTIVITY_KEYWORDS) {
    if (text.includes(keyword.toLowerCase())) {
      activities.push(keyword);
    }
  }
  if (activities.length) {
    filters.activities = Array.from(new Set(activities));
  }

  // --- Property types (match case-insensitively, keep exact casing in output) ---
  const propertyTypes: string[] = [];
  for (const keyword of PROPERTY_TYPE_KEYWORDS) {
    if (text.includes(keyword.toLowerCase())) {
      propertyTypes.push(keyword);
    }
  }
  if (propertyTypes.length) {
    filters.propertyTypes = Array.from(new Set(propertyTypes));
  }

  return filters;
}

/**
 * Builds a prompt you can send to an LLM (e.g. Vertex / OpenAI) to get
 * a more accurate JSON extraction of the same fields.
 *
 * The expected JSON response shape:
 * {
 *   "minPrice": number | null,
 *   "maxPrice": number | null,
 *   "minAcres": number | null,
 *   "maxAcres": number | null,
 *   "activities": string[] | null,
 *   "propertyTypes": string[] | null,
 *   "cities": string[] | null,
 *   "stateNames": string[] | null,
 *   "stateAbbreviations": string[] | null,
 *   "counties": string[] | null
 * }
 */
export function buildSearchExtractionPrompt(userPrompt: string): string {
  const activitiesList = JSON.stringify(ACTIVITY_KEYWORDS);
  const propertyTypesList = JSON.stringify(PROPERTY_TYPE_KEYWORDS);
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
    "- cities (array of strings). ONLY city name(s) as written in the query (e.g. \"Dallas\", \"St. Louis\"). Do not include state/county suffixes.",
    "- stateNames (array of strings). US state names (full names only, e.g. \"Texas\", \"North Carolina\").",
    "- stateAbbreviations (array of strings). US state abbreviations (2-letter uppercase only, e.g. \"TX\", \"NC\").",
    "- counties (array of strings). ONLY the county/parish name (no state suffix). Examples: \"Orange County\", \"Baldwin Parish\". Do not guess counties.",
    "",
    "IMPORTANT RULES:",
    "- If a field is not clearly stated, set it to null instead of guessing.",
    "- For activities and propertyTypes, only include values that match the user's intent and that appear in the lists above; use the exact string from the list.",
    "- For stateNames/stateAbbreviations: allow minor misspellings/typos (e.g. \"Floridaa\", \"Califronia\") or minor formatting issues (e.g. \"N Carolina\"). If the intended state is clear, output the correct canonical full state name and/or 2-letter abbreviation.",
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
    "Return ONLY a single JSON object, with these exact keys, no comments and no extra text.",
    "",
    `User query: "${userPrompt.trim()}"`,
  ].join("\n");
}

type LlmExtractionJson = {
  minPrice: number | null;
  maxPrice: number | null;
  minAcres: number | null;
  maxAcres: number | null;
  activities: string[] | null;
  propertyTypes: string[] | null;
  cities: string[] | null;
  stateNames: string[] | null;
  stateAbbreviations: string[] | null;
  counties: string[] | null;
};

type ServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
  [key: string]: unknown;
};

const rawServiceAccount = process.env.GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY;
if (!rawServiceAccount) {
  throw new Error("GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY is not set");
}

const serviceAccount = JSON.parse(rawServiceAccount) as ServiceAccount;
const projectId = serviceAccount.project_id;

const DEFAULT_LOCATION = process.env.GOOGLE_CLOUD_LOCATION ?? "us-central1";
// Use a current Vertex AI model; gemini-1.5-pro is legacy and returns 404 for many projects.
// Options: gemini-2.0-flash-001 (default), gemini-2.0-flash-lite-001 (lighter/cheaper), gemini-2.5-flash, gemini-2.5-pro
const LLM_MODEL_ID = process.env.VERTEX_LLM_MODEL_ID ?? "gemini-2.0-flash-001";

async function callVertexLlm(prompt: string): Promise<string> {
  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    projectId,
    credentials: {
      client_email: serviceAccount.client_email,
      private_key: serviceAccount.private_key,
    },
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  if (!token.token) throw new Error("Failed to get Vertex AI access token for LLM");

  const url = `https://${DEFAULT_LOCATION}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${DEFAULT_LOCATION}/publishers/google/models/${LLM_MODEL_ID}:generateContent`;

  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 256,
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Vertex AI LLM extraction failed: ${res.status} ${errText}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string;
        }>;
      };
    }>;
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Vertex AI LLM returned empty content for extraction");
  }

  return text;
}

/** Strip markdown code fences (e.g. ```json ... ```) so we can parse JSON from LLM output. */
function stripJsonFromMarkdown(text: string): string {
  let s = text.trim();
  const open = s.match(/^```(?:json)?\s*\n?/i);
  if (open) s = s.slice(open[0].length);
  const close = s.match(/\n?```\s*$/);
  if (close) s = s.slice(0, -close[0].length);
  return s.trim();
}

export async function extractFiltersWithLlm(userPrompt: string): Promise<SearchQueryFilters> {
  const extractionPrompt = buildSearchExtractionPrompt(userPrompt);
  const raw = await callVertexLlm(extractionPrompt);
  const jsonStr = stripJsonFromMarkdown(raw);

  let parsed: LlmExtractionJson;
  try {
    parsed = JSON.parse(jsonStr) as LlmExtractionJson;
  } catch (err) {
    throw new Error(`Failed to parse LLM extraction JSON: ${(err as Error).message}`);
  }

  const filters: SearchQueryFilters = {};

  const toNumber = (value: unknown): number | undefined => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
      const n = Number(value);
      if (Number.isFinite(n)) return n;
    }
    return undefined;
  };

  const minPrice = toNumber(parsed.minPrice);
  const maxPrice = toNumber(parsed.maxPrice);
  const minAcres = toNumber(parsed.minAcres);
  const maxAcres = toNumber(parsed.maxAcres);

  if (minPrice !== undefined) filters.minPrice = minPrice;
  if (maxPrice !== undefined) filters.maxPrice = maxPrice;
  if (minAcres !== undefined) filters.minAcres = minAcres;
  if (maxAcres !== undefined) filters.maxAcres = maxAcres;

  if (Array.isArray(parsed.activities) && parsed.activities.length > 0) {
    filters.activities = Array.from(
      new Set(parsed.activities.map((a) => a.trim()).filter((a) => a.length > 0))
    );
  }

  if (Array.isArray(parsed.propertyTypes) && parsed.propertyTypes.length > 0) {
    filters.propertyTypes = Array.from(
      new Set(parsed.propertyTypes.map((p) => p.trim()).filter((p) => p.length > 0))
    );
  }

  if (Array.isArray(parsed.cities) && parsed.cities.length > 0) {
    filters.cities = Array.from(
      new Set(parsed.cities.map((c) => normalizeCityForFilters(c)).filter((c) => c.length > 0))
    );
  }

  if (Array.isArray(parsed.stateNames) && parsed.stateNames.length > 0) {
    filters.stateNames = Array.from(
      new Set(
        parsed.stateNames
      .map((s) => s.trim())
          .filter((s) => s.length > 0)
      )
    );
  }

  if (Array.isArray(parsed.stateAbbreviations) && parsed.stateAbbreviations.length > 0) {
    const canonicalAbbr = parsed.stateAbbreviations
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((s) => normalizeStateAbbreviation(s))
      .filter((s): s is string => typeof s === "string")
      .filter((abbr) => abbr in STATE_ABBREVIATION_TO_NAME);

    if (canonicalAbbr.length > 0) {
      filters.stateAbbreviations = Array.from(new Set(canonicalAbbr));

      // If we have valid abbreviations, also populate the corresponding full names.
      const namesFromAbbr = canonicalAbbr
        .map((abbr) => STATE_ABBREVIATION_TO_NAME[abbr]);

      if (namesFromAbbr.length > 0) {
        const existing = new Set(filters.stateNames ?? []);
        for (const n of namesFromAbbr) existing.add(n);
        filters.stateNames = Array.from(existing);
      }
    }
  }

  if (Array.isArray(parsed.counties) && parsed.counties.length > 0) {
    filters.counties = Array.from(
      new Set(parsed.counties.map((c) => c.trim()).filter((c) => c.length > 0))
    );
  }

  return filters;
}

