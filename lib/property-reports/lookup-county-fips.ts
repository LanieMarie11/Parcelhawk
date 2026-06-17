import { US_STATE_ABBR_TO_NAME } from "@/lib/us-state-abbreviation-to-name";

/** Two-digit Census state FIPS codes keyed by postal abbreviation. */
const US_STATE_ABBR_TO_FIPS: Record<string, string> = {
  AL: "01",
  AK: "02",
  AZ: "04",
  AR: "05",
  CA: "06",
  CO: "08",
  CT: "09",
  DE: "10",
  DC: "11",
  FL: "12",
  GA: "13",
  HI: "15",
  ID: "16",
  IL: "17",
  IN: "18",
  IA: "19",
  KS: "20",
  KY: "21",
  LA: "22",
  ME: "23",
  MD: "24",
  MA: "25",
  MI: "26",
  MN: "27",
  MS: "28",
  MO: "29",
  MT: "30",
  NE: "31",
  NV: "32",
  NH: "33",
  NJ: "34",
  NM: "35",
  NY: "36",
  NC: "37",
  ND: "38",
  OH: "39",
  OK: "40",
  OR: "41",
  PA: "42",
  RI: "44",
  SC: "45",
  SD: "46",
  TN: "47",
  TX: "48",
  UT: "49",
  VT: "50",
  VA: "51",
  WA: "53",
  WV: "54",
  WI: "55",
  WY: "56",
};

function normalizeCountyName(value: string): string {
  return value
    .trim()
    .replace(/\s+county\s*$/i, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function resolveStateAbbreviation(stateAbbreviation: string | null, stateName: string | null): string | null {
  const abbr = stateAbbreviation?.trim().toUpperCase();
  if (abbr && abbr.length === 2 && US_STATE_ABBR_TO_NAME[abbr]) {
    return abbr;
  }

  const normalizedName = stateName?.trim().toLowerCase();
  if (!normalizedName) return null;

  for (const [candidateAbbr, candidateName] of Object.entries(US_STATE_ABBR_TO_NAME)) {
    if (candidateName.toLowerCase() === normalizedName) {
      return candidateAbbr;
    }
  }

  return null;
}

export async function lookupCountyFips(
  county: string | null,
  stateAbbreviation: string | null,
  stateName: string | null,
): Promise<string | null> {
  if (!county?.trim()) return null;

  const stateAbbr = resolveStateAbbreviation(stateAbbreviation, stateName);
  const stateFips = stateAbbr ? US_STATE_ABBR_TO_FIPS[stateAbbr] : null;
  if (!stateFips) return null;

  const params = new URLSearchParams({
    get: "NAME",
    for: "county:*",
    in: `state:${stateFips}`,
  });
  const apiKey = process.env.CENSUS_API_KEY?.trim();
  if (apiKey) params.set("key", apiKey);

  const url = `https://api.census.gov/data/2020/dec/pl?${params.toString()}`;
  let res: Response;
  try {
    res = await fetch(url, { cache: "force-cache" });
  } catch {
    return null;
  }
  if (!res.ok) return null;

  const rows = (await res.json()) as string[][];
  if (!Array.isArray(rows) || rows.length < 2) return null;

  const targetCounty = normalizeCountyName(county);
  for (let i = 1; i < rows.length; i++) {
    const [name, rowStateFips, countyCode] = rows[i];
    const censusCounty = normalizeCountyName(name.split(",")[0] ?? name);
    if (censusCounty === targetCounty) {
      return `${rowStateFips}${countyCode}`;
    }
  }

  return null;
}
