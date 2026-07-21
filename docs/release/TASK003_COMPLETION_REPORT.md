# Task 003 Completion Report — Workstream 2: Government Integrations

Branch: `kimi/farmgraph-winning-release` · Baseline: Task 002 winning release (a3e84f9 parent chain) · Date: 2026-07-21

Seven phase commits, every quality gate green at every step. The governing rule never changed: **no fabricated government API access, no fabricated capability** — gates are shown with genuine evidence, samples are labelled SAMPLE, and no adapter claims to be live unless its state chip says LIVE (none does today).

## Phase commits

| Phase | Commit | Scope |
|---|---|---|
| 2A | `df0e865` | KVK completion — 7-state referral lifecycle (creation lands READY_TO_SHARE, never SHARED; ESCALATED requires note; transition guards mirrored API↔web), 48h SLA (WITHIN/DUE_SOON/OVERDUE/COMPLETED), downloadable referral evidence pack (`kvk-referral-pack/v1` JSON + printable HTML, privacy-masked coords, UNVERIFIED statement, audit reference), KVK actions (tel/mailto/directions/copy, speciality match), connected-mode FastAPI mutations with honesty banners |
| 2B | `5f7f5a7` | Bhashini Hindi PoC — backend-only ULCA adapter (official config → cached → callback compute sequence), exact states, ASR always UNREVIEWED + audited confirm/edit, TTS restricted to allowlisted non-chemical templates (no free-text endpoint), offline voice-note queue (recordings never lost), Marwari/Mewari human-review routing with DRAFT glossary (`dialectAsrClaim: NONE`), browser dictation explicitly labelled fallback |
| 2C | `65f7528` | IMD adapter — source hierarchy (official API → cached official → Open-Meteo NON_GOVERNMENT_WEATHER_FALLBACK → seeded), **genuine HTTP 401 whitelist gate captured as hashed evidence artefact**, labelled SAMPLE-shape district contract (never CACHED_IMD_DATA), normalised 14-field contract with attribution/hash/completeness, explainable outbreak-score weather component (prior→new, variables, reason, points effect; policy stateMultipliers: fallback moves less, SIMULATED=0 never moves) |
| 2D | `4fc7970` | AGMARKNET connector — data.gov.in adapter (Rajasthan-only filter, 4 pilot crops with commodity aliases), normalised quote contract (mandi/district/variety/arrival/min-modal-max INR-quintal/APMC/hash/attribution), exact states incl. MANDI_CREDENTIALS_REQUIRED + NO_MANDI_DATA_FOR_CROP, cached fresh/stale (72h), Gujarat-record exclusion tested |
| 2E | `a3e84f9` | Integrations operations screen — live-adapter rows with exact API states when connected and honest known states standalone, IMD hierarchy panel, public-data snapshot section, 17-contract DPI registry with status-family filters + counts + production dependencies, truth statement retained (e2e-guarded) |
| 2F | `9e2e6e0` | Digital Twin government-data rail — six provenance-labelled lanes on every twin (registry linkage SIMULATED IDS with e-Dharti/AgriStack CONTRACT_DEFINED note, consent, IMD weather wired to adapter hierarchy, Soil Health Card CONTRACT_DEFINED, AGMARKNET quotes via new client mirror, nearest KVK), connected/standalone banners |
| 2G | `52a8fcf` | Judge Mode Government Infrastructure chapter — third demo tab, 12 presenter steps covering the full WS2 surface; every panel recomputes from the real adapter mirrors on render; works fully degraded (standalone static export renders identical honest states) |

## Final gates (all run after 2G, HEAD `52a8fcf`)

| Gate | Result |
|---|---|
| `eslint . --max-warnings 0` | clean (0 warnings) |
| `tsc --noEmit` (strict) | clean |
| `vitest run` | **86/86** (13 files; 52 → 86 across WS2) |
| `pytest apps/api/tests -q` | **65/65** (33 → 65 across WS2) |
| `next build` (static export) | 73 pages prerendered |
| `playwright test` (default) | **15 passed** (+4 pre-existing skips) |
| `playwright test` (subpath `/RIC-FarmGraph-Sentinel`) | **19 passed** |

## Honesty guarantees added this workstream

1. **Genuine evidence over assertion.** The IMD whitelist gate is a real HTTP 401 captured from this environment, preserved with body excerpt, SHA-256 and timestamp (`data/reference/imd-whitelist-evidence.json`). Unreachable official endpoints are recorded as integration states, never mocked as success.
2. **SAMPLE can never become CACHED.** Cache loaders accept only genuine captures (`imd-cached-*.json`, `agmarknet-cached-rajasthan.json`); the bundled demonstration shapes are labelled SAMPLE SHAPE at every render site.
3. **SIMULATED never moves the score.** The weather-risk policy gives SIMULATED_WEATHER a 0.0 multiplier; fallback sources move the outbreak score less than official ones; every movement shows its reason string, variables and points effect.
4. **Voice is human-gated.** ASR transcripts are UNREVIEWED until an audited confirm/edit; regional (Marwari/Mewari) speech routes to human review with an explicit `dialectAsrClaim: NONE`; TTS cannot synthesise free text — only allowlisted non-chemical templates; credentials exist only on the API host.
5. **Referrals cannot skip states.** The 7-state machine rejects invalid transitions client- and server-side; escalation requires a note; the evidence pack privacy-masks coordinates and marks unreviewed cases UNVERIFIED.
6. **Mirror parity.** Every server capability has an exact client mirror, so the standalone static export behaves identically to connected mode — with mode banners everywhere and e2e coverage of both.

## Docs added

`docs/integrations/bhashini.md`, `docs/integrations/imd.md`, `docs/integrations/agmarknet.md` (activation runbooks naming the exact credential/approval that flips each adapter live); `data/policy/weather-risk.json` (versioned weather-risk policy); reference artefacts for IMD/AGMARKNET sample shapes, crop aliases, regional glossary.

## Blocked (external, unchanged)

- **CI billing unlock** — required for the GitHub Actions gates to run on push.
- **Repo auth push** — release branch lives locally + in the checkpoint bundle; awaiting a valid PAT with repo scope.
- **Deployment** — GitHub Pages publish pending the two items above.

## What a judge can verify in under 5 minutes

1. `demo/` → tab ③ *Government infrastructure* — 12 steps, every panel live-computed, closing truth statement.
2. `integrations/` — exact state chips; the line "No adapter on this page is live…".
3. `digital-twins/RJ-DEMO-PLOT-118/` — six-lane government rail, all provenance-labelled.
4. `data/reference/imd-whitelist-evidence.json` — the genuine 401 capture.
