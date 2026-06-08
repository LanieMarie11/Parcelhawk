
Target Property: [Insert Address, County, State, APN#]

 

Perform a raw, object-level infrastructure and utility due diligence check for this exact parcel coordinate/APN. Follow a strict Triple-Check Verification process before outputting your final answer.

 

---

 

### [PHASE 1: THE CRITICAL TRIPLE-CHECK AUDIT]

Before compiling the report, you must run an internal adversarial audit on the source data. Print your verification findings for the following three checks explicitly:

 

1. ACREAGE DISCREPANCY CHECK: Cross-reference the county tax assessor's legal roll against the active GIS parcel layer shape size. Verify if the provided APN matches a specific modern subdivision suffix (e.g., a recent cut-out/split) or if it pulls data from an un-subdivided parent tract. Explicitly state the verified acreage.

2. WATER INFRASTRUCTURE CATEGORIZATION: Map the closest public water pipe line. Determine if this line is classified by the municipality as a standard residential distribution/service main, or if it is strictly a high-pressure transmission line / fire-protection-only main. 

3. CLASSIFICATION SCRUB & HOA FINDER: Search the county recorder indexes, plat maps, corporate filings, and spatial layers for any legal Master Association overlays, private road maintenance agreements, or HOA encumbrances tied to this parcel map. If found, locate the active management contact details.

 

Show your raw verification notes for Checks 1, 2, and 3 first.

 

---

 

### [PHASE 2: THE FINAL INFRASTRUCTURE REPORT]

After completing the audit, output ONLY factual data under these exact headings:

 

### 1. Frontage Utility Availability

* Electric: [Available at road / Line extension needed / Unknown]

* Public Water: [Available at road / Well required / Unknown]

* Municipal Sewer: [Available at road / Septic required / Unknown]

* Road Surface: [Paved / Dirt / Gravel]

 

### 2. Deep Water Diagnostics

* Water System Type: [Confirm if public line is a Service Main for residential hookup, or strictly a Transmission/Fire line]

* Regional Well Depth: [Search State Geological Survey / Department of Natural Resources well log databases for this specific zip code/township. State the statistical average depth range in feet and static water levels from nearby completed drilling logs.]

 

### 3. Telecom & Infrastructure 

* High-Speed Internet: [Confirm if Fiber Optic is available at the road frontage and identify the provider]

* Mobile/Phone Service: [Confirm standard carrier coverage or landline availability]

 

### 4. Natural Mapping Features

* Water Features: [Identify any ponds, named/unnamed creeks, wetlands, or riverine areas clipping or intersecting the property boundaries using USGS and National Wetlands Inventory data]

 

### 5. HOA Status & Details

* HOA Presence: [Yes / No]

* HOA Name: [Legal name of association or management company if applicable]

* HOA Fees: [State the mandatory rate and frequency, e.g., $350/Annually]

 

### 6. Local Authority & Management Directory

Provide the exact direct phone numbers and emails for the local departments and entities associated with this parcel's address:

* Power Utility Co: [Name, Phone, Email/Web Contact]

* Municipal Water District: [Name, Phone, Email/Web Contact]

* Sanitation/Sewer Department: [Name, Phone, Email/Web Contact]

* County Environmental Health Dept (Septic/Well permits): [Name, Phone, Email/Web Contact]

* Verified Local Internet & Phone Providers: [Names and Customer Service lines]

* HOA / Property Management Contact: [If HOA is Yes: Provide Association/Management Name, Phone Number, Email, and Website. If HOA is No: State "N/A - No HOA Found"]

 

 

 

 

 

 

 

 

 

A Quick Note for Your Developer

The Format Choice: Right now, this prompt is designed to output clean Markdown text (with headings and bullet points). This is perfect if your program is just going to display the raw report on a screen for a user to read.

If your developer is planning to take this data and automatically map it into specific fields in a database, or put it into a styled table on your website, tell them they can easily modify Phase 2 to say: "Output the final report strictly as a raw JSON object matching our database schema."

Any experienced developer will instantly know how to handle either option, but giving them that heads-up shows you know exactly how the backend plumbing works.
You’ve built a tight, efficient machine here. It's clean, aggressive on data gathering, and completely objective.
