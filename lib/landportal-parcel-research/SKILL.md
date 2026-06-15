---
name: landportal-parcel-research
description: "Generate professional vacant land due diligence reports using the Land Portal API. Use this skill whenever the user wants to research a parcel of land, generate a parcel research report, look up property data, evaluate a land deal, or do due diligence on vacant land. Triggers on phrases like 'research this parcel', 'pull up the property data', 'generate a report for APN...', 'look into this land', 'run due diligence', 'what can you find on this property', or any request involving a state + county + APN that implies land research. Also triggers when the user mentions Land Portal, parcel research, or land due diligence. ALWAYS use this skill for land/parcel research tasks — even if the user doesn't explicitly mention Land Portal — because it produces a far superior report to what you could do from scratch."
---

# Land Portal Parcel Research

This skill pulls property data from the Land Portal API, generates a satellite map image with the parcel boundary overlaid, and produces a professional Word document report — all without opening a browser.

## First-Time Setup

Before the skill can run, the user needs to provide their Land Portal API key. The key is a long JWT token string that looks like `eyJ0eXAiOiJKV1Q...`.

Check for the API key in this order:
1. A file called `lp-token.txt` in the user's working directory or mounted folder
2. The `LP_TOKEN` environment variable
3. If neither exists, ask the user: "I need your Land Portal API key to pull property data. You can get this from your Land Portal account under the API settings. Please either paste it here or save it to a file called `lp-token.txt` in your folder."

Once you have the key, save it to `lp-token.txt` in the working directory for future use.

## What the User Provides

The user will typically give you some combination of:
- **State** and **County** (e.g., "Warren County, Iowa")
- **APN** (Assessor's Parcel Number, e.g., "21000330255")
- Or a **Land Portal URL** (e.g., `https://landportal.com/?property=Zmlwcz0...`)

Your job is to extract the identifiers needed for the API call.

### Getting the FIPS Code

The API needs a FIPS county code (a 5-digit number). To find it:
1. If the user gave a Land Portal URL, decode the base64 `property` parameter — it contains `fips=XXXXX&ll_uuid=XXXXX&apn=XXXXX`
2. Otherwise, look up the FIPS code for the state+county. You can use the Census Bureau's FIPS lookup or a known reference. Common examples: Warren County, IA = 19181; Maricopa County, AZ = 04013; etc.
3. If unsure, search the web for "[County Name] [State] FIPS code"

### Getting the Property ID

The Land Portal API's most reliable endpoint needs a `property_id` (their internal ID, also called `ll_uuid`). Try these approaches in order:

1. **From a Land Portal URL**: Decode the base64 — the `ll_uuid` value IS the property_id
2. **From the search API**: Call `GET /wp-json/lp-rest-api/v1/search?apn={APN}&fips={FIPS}` — if it returns data, extract the property ID
3. **From the property-data API**: Call `GET /wp-json/lp-rest-api/v1/property-data?apn={APN}&fips={FIPS}` — if it returns data, extract the property ID
4. **Ask the user**: If the search endpoints return limit errors, ask the user to open the parcel in Land Portal and share the URL. The URL contains the property_id encoded in base64.

## Running the Research

Once you have `property_id` and `fips`, run the bundled script:

```bash
node <skill-directory>/scripts/parcel-research-api.js <property_id> <fips> <output_directory>
```

The script does everything automatically:
1. Calls the Land Portal API to pull all property data (owner, acreage, valuation, flood zone, wetlands, slope, comps, buildability, etc.)
2. Generates a satellite map image via Mapbox with the parcel boundary overlaid in red
3. Produces a professional Word document report with 11 sections

The script needs `docx` npm package. If it's not installed, run `npm install docx` first.

The API token must be saved to `lp-token.txt` in the same directory as the script, OR set as the `LP_TOKEN` environment variable. Map generation also requires `MAPBOX_ACCESS_TOKEN` in `.env` or the environment.

## Output

The script produces two files in the output directory:
- `parcel-map-{APN}.jpg` — Satellite image with parcel boundary
- `Parcel-Research-{APN}-{County}-County-{State}.docx` — The full report

Save both to the user's workspace folder and provide a link to the Word document.

## Report Sections

The generated report includes:

1. **Property Snapshot** — Owner, APN, acreage, land use, municipality, school district, legal description, and how many other properties the owner holds
2. **Parcel Map** — Satellite imagery with parcel boundary overlay (generated via Mapbox)
3. **Valuation & Tax Data** — County assessed value, Land Portal AI estimate, price per acre, annual taxes
4. **Comparable Sales** — Recent similar sales with price, acreage, distance, and date, plus a comp analysis summary
5. **FEMA Flood Zone** — Coverage percentage, zone designation, and map date
6. **Wetlands** — Coverage percentage and implications
7. **Slope & Terrain Analysis** — Slope distribution breakdown and elevation data
8. **Buildability Assessment** — Buildability score and usable acreage
9. **Access & Road Frontage** — Landlocked flag, road frontage, and guidance on ownership-chain analysis
10. **Red Flags** — Automatically identified concerns (landlocked, flood, slope, buildability)
11. **Positives & Follow-Up** — Strengths and recommended next steps

## Landlocked Analysis Pattern

When a property is flagged as landlocked, the report includes guidance to check whether adjoining parcels share the same owner. This is important context because if the same owner also owns an adjacent parcel with road access, the property isn't practically landlocked — it has access through the shared ownership chain. The report notes how many other properties the owner holds, which helps the user assess this.

## API Limits

The Land Portal API has usage limits that vary by subscription tier. If the script returns a "limit reached" error, the user has exhausted their API credits for the current period. Let them know and suggest they check their Land Portal account for usage details, or wait for the limit to reset.

## Troubleshooting

- **"Single property limit reached"** or **"Search limit reached"**: API quota exhausted. The user needs to wait for reset or upgrade their plan.
- **Empty map image (0 KB)**: Usually a network issue. Try running the script again.
- **"missing_parameters" error**: Make sure both `property_id` and `fips` are provided and are valid numbers.
