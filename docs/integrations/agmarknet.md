# AGMARKNET mandi prices — setup guide

Mandi prices come from the **data.gov.in AGMARKNET resource** (Open
Government Data Platform, Government of India) — Rajasthan only, for the four
pilot crops (bajra, mustard, guar, cumin) with commodity aliases in
`data/reference/agmarknet-crop-aliases.json`.

## Current state

Without a key the API reports exactly **`MANDI_CREDENTIALS_REQUIRED`** and
serves the labelled **SAMPLE SHAPE** (`data/reference/agmarknet-sample-rajasthan.json`)
to demonstrate the quote contract — never `CACHED_MANDI_DATA`.

## Activation (free, official route)

1. Create a free API key at https://data.gov.in (user profile → API key).
2. Set on the **API host only**: `DATAGOV_API_KEY=<key>`
   (optionally `AGMARKNET_RESOURCE_ID`, default `9ef84268-d588-465a-a308-a864a43d0070`;
   `AGMARKNET_TIMEOUT_SEC`, default 15).
3. On the first successful keyed fetch, save the raw records as
   `data/reference/agmarknet-cached-rajasthan.json` (with `fetchedAt`) to get
   `CACHED_MANDI_DATA` / `MANDI_STALE_CACHE` (>72 h) resilience.

## Contract

`GET /api/v1/integrations/mandi?crop=bajra&district=Jodhpur` returns:
mandi, district, state, crop, commodity label, variety, arrival date,
min/modal/max price (`INR/quintal`), market type, source, fetched time, cache
age, response hash, attribution and the exact integration state
(`LIVE_MANDI_DATA` / `CACHED_MANDI_DATA` / `MANDI_CREDENTIALS_REQUIRED` /
`MANDI_PRODUCT_UNAVAILABLE` / `MANDI_STALE_CACHE` / `NO_MANDI_DATA_FOR_CROP`).

Queries always carry `filters[state]=Rajasthan`; district filtering is applied
server-side. Non-Rajasthan records are discarded even if the upstream returns
them (tested).
