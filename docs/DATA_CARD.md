# Data Card — FarmGraph Rakshak (Task 002)

## 1. Demo seed — SIMULATED (`data/demo/seed.json`)

Single source of truth: `data/demo/generate_seed.py` (deterministic; CI
regenerates and diffs it). 29 cases, 29 plots, 29 crop-seasons, 3 clusters, 13
advisories, 220 audit events. All farmer identities are **pseudonymous demo
personas** (`RJ-DEMO-*`); every record carries `provenance: SIMULATED`.
The golden case is C-2614; the golden cluster CL-2601 scores 65.5 → 71.5 when
the expert confirms.

## 2. Reference data — REAL, SOURCED (`data/reference/`)

| File | Contents | Provenance |
|---|---|---|
| `kvk-directory.json` | 6 KVKs (Jodhpur, Nagaur, Jalore) with real phones/emails | Official ICAR-ATARI Zone-II list + KVK websites; `accessedOn` recorded; coordinates marked approximate |
| `research-evidence.json` | 8 evidence entries behind agronomic/climate/integration claims | IMD normals (Jodhpur 370.2 mm), CGWB, ICAR-AICPMIP, ICRISAT, JAU trial, data.gov.in, Bhashini ULCA, Natural Earth — each with URL + honesty note |
| `public-data-snapshot.json` | World Bank India ag indicators + Open-Meteo weather at the golden plot | **Fetched live** by `scripts/fetch_public_data.py` at the recorded `fetchedAt`; served everywhere as `CACHED`. data.gov.in is `KEY_REQUIRED` (free key, not shipped) |

## 3. Field evidence — DEVICE-LOCAL (IndexedDB)

- **Images**: validated (type/size), downscaled to ≤1024px, re-encoded to
  JPEG 0.85 (**EXIF/GPS stripped by construction**), SHA-256 hashed,
  duplicate-detected by content hash, stored in the `fgr-evidence` IndexedDB.
  Deletion and retention are user-controlled (`deleteImage`).
- **Voice notes**: recorded only after explicit consent, SHA-256 hashed,
  stored in `fgr-voice`; playback and deletion supported.
- **Drafts/outbox**: `fgr-field`; outbox sync is idempotent
  (`POST /api/v1/sync/batch` with idempotency keys).

Nothing leaves the device unless the user syncs; the API's evidence endpoint
applies the same type/size/hash rules server-side.

## 4. API persistence — DEMO-GRADE SQLite

`apps/api/app/persistence.py`: JSON documents in stdlib sqlite3 (cases,
missions, referrals, learning records, audit, idempotency keys). Labelled
single-node demo persistence — not production infrastructure. `FGR_PERSIST=memory`
disables it (test default); `POST /api/v1/demo/reset` restores the pristine seed.

## 5. Consent & privacy

Consent is captured before any report (typed or voice channel) and is required
by both the web flow and the API (422 without it). Farmer identities are
pseudonyms. The capture pipeline strips location metadata from images by
re-encoding. Hindi dictation is labelled *unreviewed machine transcription*;
no Marwari/Mewari dialect ASR is claimed.

## 6. What we deliberately do NOT have

No real farmer records. No labelled crop-disease image dataset for
bajra/mustard/guar/cumin (therefore no trained model and no accuracy claims).
No government API credentials (data.gov.in needs a free key; everything else
is contract-defined).
