# IMD weather adapter — setup guide

IMD (India Meteorological Department, Ministry of Earth Sciences) is the
PRIMARY government weather/agromet source for FarmGraph Rakshak. Open-Meteo
is retained strictly as `NON_GOVERNMENT_WEATHER_FALLBACK` and is never
promoted to an IMD label.

## Current state (verified 2026-07-21)

The documented endpoint `https://mausam.imd.gov.in/api/current_wx_api.php`
answers **HTTP 401 — "Your IP/Domain needs to be whitelisted"** from this
environment. Genuine capture: `data/reference/imd-whitelist-evidence.json`
(sha256 included). Integration state: **`IMD_IP_WHITELIST_REQUIRED`**.

## Source hierarchy implemented

| # | Source | State | Status here |
|---|---|---|---|
| 1 | OGD-hosted IMD product via data.gov.in (`DATAGOV_API_KEY` + `IMD_DATAGOV_RESOURCE_ID`) | `LIVE_IMD_API` | key not configured → `IMD_CREDENTIALS_REQUIRED` |
| 2 | Direct documented IMD endpoint | `IMD_IP_WHITELIST_REQUIRED` | **verified genuine 401** |
| 3 | Cached official capture (`data/reference/imd-cached-<district>.json`) | `CACHED_IMD_DATA` / `IMD_STALE_CACHE` (>48 h) | none bundled yet — honest |
| 4 | Open-Meteo snapshot | `NON_GOVERNMENT_WEATHER_FALLBACK` | live-fetched in public-data snapshot |
| 5 | Seeded demo weather | `SIMULATED_WEATHER` | last resort |

The bundled `data/reference/imd-sample-district-forecast.json` is a labelled
**SAMPLE SHAPE — awaiting first whitelisted capture**. It demonstrates the
normalised district contract, parsing and the explainable outbreak-score
component. It is never reported as `CACHED_IMD_DATA`.

## Activation

1. Request IP/domain whitelisting from IMD for the API host, or
2. Configure `DATAGOV_API_KEY` (free from data.gov.in) plus
   `IMD_DATAGOV_RESOURCE_ID` for the OGD-hosted IMD district product, then set
   `IMD_ENABLED=1`. Optional: `IMD_API_URL`, `IMD_TIMEOUT_SEC` (12),
   `IMD_PROBE_TTL_SEC` (21600).
3. On the first successful official fetch, save the raw response as
   `data/reference/imd-cached-<district>.json` (with `fetchedAt`) — it becomes
   the `CACHED_IMD_DATA` fallback and replaces the SAMPLE in scoring.

## Explainable outbreak-score component

`GET /api/v1/outbreaks/{clusterId}/weather-context` shows prior→new for the
`weatherSuitability` component with exact variables, reason, score effect,
freshness and source status. Rules are conservative GENERIC associations in
`data/policy/weather-risk.json` (moisture-sensitive disease risk, warning-
driven urgency; wind/rain field-access risk is operational context, not
scored). Fallback/sample sources move the score less than official IMD data
(policy `stateMultipliers`); `SIMULATED_WEATHER` never moves it.

## Attribution (always displayed)

> Source: India Meteorological Department, Ministry of Earth Sciences,
> Government of India — with source product, issue time, fetch time, cache
> age and official-source reference.
