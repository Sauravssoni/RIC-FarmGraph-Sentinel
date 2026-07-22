# FarmGraph Rakshak

## Rajasthan’s Offline Crop-Health and Outbreak-Response Grid

> **Every field seen. Every outbreak contained.**

FarmGraph Rakshak is a government-grade working prototype for the Rajasthan Innovation Challenge problem **“AI-Based Crop Disease & Pest Detection for Smallholder Farmers.”** It connects offline field evidence, image-quality controls, conservative edge screening, expert verification, predictive operations intelligence, Farm Digital Twins, outbreak response, KVK referrals, governed advisories and auditable follow-up.

**Applicant:** Syntheon Technology Private Limited  
**DPIIT recognition:** DIPP213187  
**Release branch:** `main`  
**Submission evidence index:** [`submission/FINAL_RELEASE_GATE.md`](submission/FINAL_RELEASE_GATE.md)

## Evaluator entry points

| Experience | Route | Purpose |
|---|---|---|
| Government Command Centre | `/command-centre/` | Map-first operating view, 72-hour load forecast, ranked actions, cases, outbreaks and KVK SLA state |
| Judge Mode | `/demo/` | Five-act, resettable proof covering offline workflow, expert review, local learning and KVK response |
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
- Production service worker and base-path-safe PWA manifest.
- Pixel 7 browser-device proof covering service-worker control and hard offline reload.

### Honest edge intelligence

- `pixfeat-v0.2.0`: an interpretable classical pixel-feature scorer with abstention and crop-support constraints.
- Bundled MobileNetV2-7 ONNX inference in the browser for broad out-of-distribution/plant-material screening only.
- Provider identity, model version, runtime, duration, uncertainty and abstention reasons on evidence records.
- No score is called accuracy.
- Expert confirmation remains mandatory for consequential action.
- Executable leakage-safe field-evaluation and model-promotion contracts.
- Synthetic fixtures are programmatically prevented from becoming accuracy claims or promoted models.

### Predictive operations and manual-overload reduction

- Seven observed days plus a transparent 72-hour signal forecast.
- Forecast expert-review load based on current queue, recent report flow, active-cluster growth and weather-suitability context.
- Rising-district detection and pre-positioning recommendation.
- KVK referral SLA-risk prediction for the next 24 hours.
- Ranked next-best actions linked directly to expert, outbreak, field and support workflows.
- Explicit planning estimate for operator minutes avoided through automatic queue ranking, evidence checks, cluster synthesis, mission batching and KVK pack preparation.
- Every formula and assumption is visible; the forecast is not presented as a field-validated epidemiological model.

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
- **KVK directory:** public institutional records drive nearest-support matching, SLA monitoring and privacy-masked handoff packs.
- **AgriStack, UFSI, Raj Kisan, RajSSO, Jan Aadhaar, e-Dharti/ULPIN, Soil Health Card, NPSS, Rajasthan Sampark and e-Mitra:** versioned adapter contracts with consent, minimum fields, fallbacks and authority dependencies. They are not presented as live connections.

## Official challenge fit

The primary `/demo/` screen visibly covers all four challenge expectations without requiring an evaluator to tour the product:

1. offline crop-health workflow for bajra, mustard, guar and cumin;
2. Hindi voice path plus honest human review for Marwari/Mewari recordings;
3. nearest sourced KVK linkage and privacy-masked referral pack;
4. governed expert-labelled local-learning loop without automatic retraining.

## Connected evidence proof

`/release-proof/` demonstrates:

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
- The 72-hour forecast is an explainable pilot operations forecast, not a field-validated epidemiological forecast.
- The operator-time avoidance value is an assumption-based planning estimate, not measured impact.
- Farmer, plot, case and outcome records are synthetic demonstration data.
- Government systems are labelled live only after a successful official operation.
- KVK contact data comes from public institutional directories; external delivery is not automated.
- Demo RBAC uses `X-Demo-Role`; production must use RajSSO/authority-managed identity.
- SQLite/in-memory persistence is demonstration-grade, not production infrastructure.
- Automated Pixel-class offline proof is implemented; physical Android field sign-off remains a separate evidence gate.

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

- `http://127.0.0.1:3000/command-centre/`
- `http://127.0.0.1:3000/demo/`
- `http://127.0.0.1:3000/release-proof/`
- `http://127.0.0.1:8000/docs`

One-command Docker demonstration:

```bash
docker compose up --build
```

## Quality and release gates

```bash
npm run lint
npm run typecheck
npm run test
npm run test:api
npm run build
npm run e2e
npm run e2e:connected
npm run e2e:subpath

python3 scripts/evaluate_model.py \
  --input data/validation/model-contract-fixture.jsonl \
  --output model-contract-report.json \
  --split test

python3 scripts/model_promotion_gate.py \
  --report model-contract-report.json \
  --output model-promotion-decision.json \
  --expect-reject
```

Last recorded full local baseline before the latest decision-intelligence release:

- 86 Vitest tests passed.
- 65 Pytest tests passed.
- 15 standard Playwright tests passed.
- 19 GitHub Pages subpath Playwright tests passed.
- Strict TypeScript, ESLint and a 73-page static export passed.

The current release adds decision-intelligence unit tests, connected evidence continuity, model-evaluation rejection, Pixel 7 hard-offline PWA proof and machine-readable release artifacts. The complete matrix must be run against the final submission commit.

## Deployment

### Vercel static frontend

The web app intentionally uses Next.js static export. `apps/web/vercel.json` therefore selects Vercel’s **Other** framework preset (`"framework": null`), runs `npm run build` and publishes `apps/web/out`. This prevents Vercel’s Next.js server adapter from incorrectly looking for `.next/routes-manifest.json` after a successful static export.

Required Vercel project settings:

- Root Directory: `apps/web`
- Framework Preset: overridden by repository to **Other**
- Build Command: overridden by repository to `npm run build`
- Output Directory: overridden by repository to `out`
- Node.js: `24.x`

The repository accepts npm 11 used by the Node 24 Vercel image and normalizes legacy lockfile registry hosts to the public npm registry.

### GitHub Pages fallback

The Pages workflow builds the same static export under the repository base path and runs lint, strict typecheck and unit tests before publishing. ONNX, WASM, manifest, service worker and offline caches are base-path-aware.

### Render connected stack

`render.yaml` defines:

- `farmgraph-rakshak-api`
- `farmgraph-rakshak-web`

After creating the services:

1. Set web `NEXT_PUBLIC_API_URL` to the API URL.
2. Set API `FGR_ALLOWED_ORIGINS` to the exact frontend origin.
3. Keep `FGR_PERSIST=memory` visibly labelled on free-tier hosting, or attach persistent infrastructure.
4. Add Bhashini/data.gov.in/IMD values only through the API host’s secret manager.

## Repository map

```text
apps/web                  Next.js static-export PWA
apps/api                  FastAPI connected demo backend
packages/contracts        Shared TypeScript domain contracts
data/demo                  Deterministic synthetic pilot dataset
data/reference             KVK, government and public-data evidence artefacts
data/models                Transparent research model configuration
data/validation            Evaluation-contract fixtures
scripts                    Model evaluation and promotion gates
submission                 Final application and evaluator package
docs                       Architecture, safety, model, data and pilot evidence
tests/e2e                  Static, subpath, mobile-offline and connected gates
```

## Core documentation

- [`submission/FINAL_RELEASE_GATE.md`](submission/FINAL_RELEASE_GATE.md)
- [`submission/DEMO_SCRIPT_2_MIN.md`](submission/DEMO_SCRIPT_2_MIN.md)
- [`docs/EVALUATOR_GUIDE.md`](docs/EVALUATOR_GUIDE.md)
- [`docs/LIVE_DEMO.md`](docs/LIVE_DEMO.md)
- [`docs/MODEL_CARD.md`](docs/MODEL_CARD.md)
- [`docs/MODEL_EVALUATION_PROTOCOL.md`](docs/MODEL_EVALUATION_PROTOCOL.md)
- [`docs/MOBILE_FIELD_VALIDATION.md`](docs/MOBILE_FIELD_VALIDATION.md)
- [`docs/DATA_CARD.md`](docs/DATA_CARD.md)
- [`docs/RESPONSIBLE_AI.md`](docs/RESPONSIBLE_AI.md)
- [`docs/government-integration-matrix.md`](docs/government-integration-matrix.md)
- [`docs/90-day-pilot.md`](docs/90-day-pilot.md)

FarmGraph Rakshak is designed to complement Raj Kisan, AgriStack, NPSS, KVKs and Rajasthan’s existing service-delivery infrastructure—not replace them.
