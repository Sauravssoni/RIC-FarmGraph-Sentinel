# Data Provenance

## Labels you will see on screen

| Label | Meaning |
|---|---|
| `Demo data — simulated prototype dataset…` banner | Everything on this deployment is demo data |
| `Simulated score — deterministic demo logic, not measured model accuracy` | Every confidence number |
| `SIMULATED EVIDENCE — NOT A PHOTO` tiles | Placeholder evidence; no fabricated field photos ship in the repo |
| `Pilot geospatial view` caption | Map is a state outline + reference points, not survey data |
| Chemical **LOCKED** box | Advisory safety policy |
| Adapter status chips | No integration is live |

## Provenance model

- Every `DiagnosisResult` carries `provider`, `modelVersion`, `provenance: "SIMULATED"`, thresholds used, and a fixed honesty note.
- Every timeline/audit event carries `provenance` and an actor string marked `(demo)`.
- Seed `meta` records `generatedBy: data/demo/generate_seed.py (deterministic; no randomness)` and the scenario timestamp `demoNow` — the localStorage overlay is keyed to it, so yesterday's demo state can never masquerade as today's data.

## Farmer privacy

- Farmers exist only as `FarmerReference` (`RJ-DEMO-F####`, pseudonym, district, block). No names, phone numbers, Aadhaar, or Jan Aadhaar values exist anywhere in the repo.
- Consent is recorded per case: `given`, `at`, `channel` (voice/typed), and a purpose note shown during capture.
- A unit test (`tests/provenance.test.ts`) fails the build if any case lacks consent or references an unregistered farmer.

## Geospatial licensing

- `data/geo/rajasthan-outline.geojson` derives from **Natural Earth 10m admin-1** (public domain), simplified (Douglas–Peucker) for web payload. Provenance text ships in the file and renders under the map.
- **No district polygons** are shown: we could not source them at a licence and quality level we would defend, so district HQs render as labelled reference points with real coordinates instead. This is a deliberate honesty trade-off.
- Case coordinates are demo coordinates inside the three pilot districts.

## Evidence policy

No stock photos, no AI-generated "field photos", no scraped imagery. Evidence tiles are clearly-marked simulated placeholders; the schema (`EvidenceAsset.kind: "simulated-image"`) makes fabrication structurally visible rather than merely discouraged.
