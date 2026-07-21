# FarmGraph Rakshak

## Rajasthan’s Offline Crop-Health and Outbreak-Response Grid

> **Every field seen. Every outbreak contained.**

FarmGraph Rakshak is a government-grade working prototype for the Rajasthan Innovation Challenge problem **“AI-Based Crop Disease & Pest Detection for Smallholder Farmers.”** It connects offline field evidence, image-quality controls, honest edge screening, expert verification, Farm Digital Twins, outbreak intelligence, KVK referrals, governed advisories and auditable follow-up.

**Applicant:** Syntheon Technology Private Limited  
**DPIIT recognition:** DIPP213187  
**Release branch:** `kimi/farmgraph-winning-release`  
**Final-release PR:** [#1](https://github.com/Sauravssoni/RIC-FarmGraph-Sentinel/pull/1)

## Evaluator entry points

| Experience | Route | Purpose |
|---|---|---|
| Government Command Centre | `/command-centre/` | Operational morning view, cases, outbreaks, missions and SLA signals |
| Judge Mode | `/demo/` | Deterministic golden path, adversarial checks and government-infrastructure assurance |
| Connected Evidence Proof | `/release-proof/` | Real image + voice evidence through FastAPI into a KVK referral pack |
| Farm Digital Twins | `/digital-twins/` | Plot-level crop, evidence, risk, referral and government-data context |
| KVK Support | `/support/` | Sourced directory, nearest-KVK matching, SLA lifecycle and evidence packs |
| Integrations Operations | `/integrations/` | Live/cached/credential/authority states for public and government services |

## What is genuinely implemented

### Field evidence and offline operation

- Mobile camera/upload workflow with JPEG, PNG and WebP validation.
- Client-side downscale and JPEG re-encode, stripping EXIF/GPS metadata.
- SHA-256 hashing, duplicate detection, IndexedDB persistence and deletion.
- Measurable image-quality checks: resolution, blur, exposure, contrast, glare, shadow and vegetation coverage.
- Explicit recapture instructions rather than forcing a diagnosis from unusable evidence.
- Offline draft and outbox behaviour with idempotent connected sync.
- Real voice-note recording, playback and on-device retention.

### Honest edge intelligence

- `pixfeat-v0.2.0`: an interpretable classical pixel-feature scorer with abstention and crop-support constraints.
- Bundled MobileNetV2-7 ONNX inference in the browser for broad out-of-distribution/plant-material screening only.
- Provider identity, model version, runtime, duration, uncertainty and abstention reasons on evidence records.
- No score is called accuracy.
- Expert confirmation remains mandatory for consequential action.

### Government operating workflow

- 29 deterministic pilot cases and 29 Farm Digital Twins across Jodhpur, Nagaur and Jalore.
- Explainable outbreak scoring, suspected/verified clusters and representative field missions.
- Versioned advisory governance with server-side safety invariants and a locked chemical section.
- Sourced KVK directory, nearest-distance and crop-speciality matching.
- Connected referral creation, guarded seven-state lifecycle, SLA, call/email/directions actions and privacy-masked evidence packs.
- Expert corrections create governed learning records; no automatic retraining is claimed.
- Append-only case timelines and audit stream.

### Government and public infrastructure

- **Bhashini:** backend-only Hindi ASR/TTS PoC adapter. Without credentials, the UI shows `BHASHINI_CREDENTIALS_REQUIRED`; offline voice notes remain available. Marwari/Mewari ASR is not claimed and routes to human review.
- **IMD:** official-adapter hierarchy with genuine IP-whitelist evidence, source attribution, cache/fallback states and explainable weather-score contribution. Sample data is never promoted as live IMD.
- **data.gov.in / AGMARKNET:** Rajasthan commodity aliases and live/cached/key-required states for bajra, mustard, guar and cumin market context.
- **AgriStack, UFSI, Raj Kisan, RajSSO, Jan Aadhaar, e-Dharti/ULPIN, Soil Health Card, NPSS, Rajasthan Sampark and e-Mitra:** versioned adapter contracts with consent, minimum fields, fallbacks and authority dependencies. They are not presented as live connections.

## Task 004 connected evidence proof

`/release-proof/` closes the last important continuity gap:

```text
consented image + real voice note
→ SHA-256 evidence upload
→ pixel-quality + edge-provider metadata
→ human-confirmed transcript
→ authoritative connected case
→ nearest-KVK referral
→ downloadable kvk-referral-pack/v2
```

The backend release API is under `/api/v1/release` and adds:

- `GET /health`
- `POST /evidence`
- `POST /handoff`
- `GET /cases/{case_id}`

The handoff is idempotent and rejects missing/mismatched consent, unsupported evidence types and insufficient roles.

## Important limitations

- No trained Rajasthan crop-disease neural model is claimed. `pixfeat` is a transparent research heuristic with **no measured field accuracy**.
- MobileNetV2 is an ImageNet OOD screener, not the disease classifier.
- Farmer, plot, case and outcome records are synthetic demonstration data.
- Government systems are labelled live only after a successful official operation.
- KVK contact data comes from public institutional directories; external delivery is not automated.
- Demo RBAC uses `X-Demo-Role`; production must use RajSSO/authority-managed identity.
- SQLite/in-memory persistence is demonstration-grade, not production infrastructure.

## Run locally

```bash
npm ci
pip install -r apps/api/requirements.txt
python3 data/demo/generate_seed.py

# terminal 1
uvicorn app.main:app --app-dir apps/api --host 127.0.0.1 --port 8000

# terminal 2
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000 npm run dev --workspace apps/web
```

Open:

- `http://127.0.0.1:3000/demo/`
- `http://127.0.0.1:3000/release-proof/`
- `http://127.0.0.1:8000/docs`

One-command Docker demonstration:

```bash
docker compose up --build
```

## Quality gates

```bash
npm run lint
npm run typecheck
npm run test
npm run test:api
npm run build
npm run e2e
npm run e2e:connected
npm run e2e:subpath
```

Recorded pre-Task-004 local baseline from the release branch:

- 86 Vitest tests passed.
- 65 Pytest tests passed.
- 15 standard Playwright tests passed.
- 19 GitHub Pages subpath Playwright tests passed.
- Strict TypeScript, ESLint and 73-page static export passed.

Task 004 adds three API evidence-continuity tests and one browser-to-FastAPI connected E2E gate. GitHub Actions is currently prevented from starting jobs by an account-level billing lock; this is recorded as an external release blocker rather than represented as a code pass.

## Deployment

### Vercel frontend

The Vercel project may use `apps/web` as its root. `apps/web/vercel.json` deliberately installs and builds from the monorepo root so workspace packages and `data/` remain available.

### Render connected stack

`render.yaml` defines:

- `farmgraph-rakshak-api`
- `farmgraph-rakshak-web`

After creating the services:

1. Set web `NEXT_PUBLIC_API_URL` to the API URL.
2. Set API `FGR_ALLOWED_ORIGINS` to the exact frontend origin.
3. Keep `FGR_PERSIST=memory` visibly labelled on free-tier hosting, or attach persistent infrastructure.
4. Add Bhashini/data.gov.in/IMD values only through the API host’s secret manager.

### GitHub Pages

The Pages workflow builds with the repository base path. ONNX, WASM, manifest, service worker and offline caches are base-path-aware. Pages publishes only after merge to `main` and requires GitHub Actions to be unlocked.

## Repository map

```text
apps/web                 Next.js 15 static-export PWA
apps/api                 FastAPI connected demo backend
packages/contracts       Shared TypeScript domain contracts
data/demo                 Deterministic synthetic pilot dataset
data/reference            KVK, government and public-data evidence artefacts
data/models               Transparent research model configuration
submission                Final application and evaluator package
docs                      Architecture, safety, model, data and pilot evidence
tests/e2e                 Static, subpath and connected Playwright gates
```

## Core documentation

- [`docs/EVALUATOR_GUIDE.md`](docs/EVALUATOR_GUIDE.md)
- [`docs/LIVE_DEMO.md`](docs/LIVE_DEMO.md)
- [`docs/MODEL_CARD.md`](docs/MODEL_CARD.md)
- [`docs/DATA_CARD.md`](docs/DATA_CARD.md)
- [`docs/RESPONSIBLE_AI.md`](docs/RESPONSIBLE_AI.md)
- [`docs/government-integration-matrix.md`](docs/government-integration-matrix.md)
- [`docs/90-day-pilot.md`](docs/90-day-pilot.md)
- [`docs/release/TASK004_STATUS.md`](docs/release/TASK004_STATUS.md)

FarmGraph Rakshak is designed to complement Raj Kisan, AgriStack, NPSS, KVKs and Rajasthan’s existing service-delivery infrastructure—not replace them.
