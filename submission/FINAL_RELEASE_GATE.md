# FarmGraph Rakshak — Final Submission Release Gate

**Applicant:** Syntheon Technology Private Limited  
**DPIIT:** DIPP213187  
**Competition:** Rajasthan Innovation Challenge  
**Challenge:** AI-Based Crop Disease & Pest Detection for Smallholder Farmers  
**Audited product base:** `a2e720c0b597c491c18121e1767870b2a96915e1`  
**Submission branch:** `main`

This is the authoritative go/no-go index for the prototype, proposal, live demonstration and portal submission. It separates implemented evidence from external access, field-validation and hosting dependencies.

## 1. Release decision

| Gate | Current state | Submission effect |
|---|---|---|
| Source architecture and product flow | READY | No further feature expansion required |
| Government command centre | READY | Use as evaluator landing screen |
| Five-act Judge Mode | READY | Use as primary live demonstration |
| Official four-feature challenge fit | READY | Visible on the primary demo screen |
| Offline evidence and PWA implementation | READY IN SOURCE | Automated Pixel hard-offline proof implemented |
| Connected FastAPI evidence handoff | READY IN SOURCE | Requires deployed API for live connected proof |
| Model evaluation governance | READY | Executable evaluation and promotion gates present |
| Field disease-model performance | NOT CLAIMABLE | Expert-labelled Rajasthan field dataset not yet available |
| Physical Android field sign-off | PENDING | Do not claim physical-device validation yet |
| Vercel public deployment | EXTERNALLY BLOCKED | Account build-rate limit, not current source error |
| GitHub Pages / CI execution | EXTERNALLY BLOCKED | Jobs terminate before step 1 at runner/account level |
| Portal submission receipt | PENDING | Complete only after a stable public URL is available |

**Current release decision:** **CONDITIONALLY SUBMISSION-READY.** The source, evaluator flow and evidence contracts are ready. Public hosting and physical-device evidence remain explicit release gates.

## 2. Primary evaluator path

Use `/demo/` and remain on **Primary evaluator proof**.

1. **Operational picture** — pilot-district map, four decision KPIs and priority rail.
2. **Offline evidence before AI** — poor capture rejection, guided recapture, sync and uncertainty-aware triage.
3. **Expert control and local learning** — expert confirmation creates a governed learning record and strengthens the cluster.
4. **Mission, KVK and advisory** — representative mission, nearest sourced KVK referral in `READY_TO_SHARE`, approved non-chemical advisory.
5. **Measured outcome** — improving/not-improving follow-up and retained audit chain.

Expected duration: approximately three minutes. Reset before every evaluator session.

## 3. Official challenge requirement matrix

| Challenge expectation | Implemented proof | Primary evidence |
|---|---|---|
| Offline image recognition for Rajasthan crops | Offline evidence store, image processing, quality gate, heuristic screening and optional ONNX OOD screen | `/field/scan/`, Judge Mode Act 2, Pixel offline E2E |
| Hindi and regional voice access | Real recorder, local retention, backend Bhashini Hindi adapter, human-confirmed transcript; dialect recordings require human review | `/field/scan/`, `/release-proof/` |
| Nearest KVK / support linkage | Official-directory records, distance matching, contact actions, SLA lifecycle and privacy-masked referral pack | Judge Mode Act 4, `/support/` |
| Local feedback and improvement loop | Expert-labelled `LearningRecord`, provenance, model lifecycle and reviewed promotion gate | Judge Mode Act 3, `/learning/`, model protocol |

## 4. Benchmark evidence

### Product and evaluator experience

- compact map-first government command centre;
- four mathematically defined executive KPIs;
- one action per Judge Mode act;
- deterministic 0/5 → 5/5 proof sequence;
- human-readable states and pilot-scoped wording;
- truthful simulated/live/cached/authority labels;
- no unsupported statewide, accuracy or delivered-referral claim.

### Safety and responsible AI

- poor/corrupt/unsupported evidence rejection;
- abstention and expert escalation;
- expert confirm, correct, unknown, recapture and field-visit decisions;
- locked chemical-advisory section;
- consent references and privacy-masked KVK packs;
- append-only audit continuity;
- synthetic evidence prohibited from becoming field-accuracy claims.

### Model evaluation

Executable tools:

```bash
python3 scripts/evaluate_model.py \
  --input <expert-labelled-predictions.jsonl> \
  --output evaluation-report.json \
  --split test \
  --high-spread-labels downy_mildew \
  --require-field-provenance

python3 scripts/model_promotion_gate.py \
  --report evaluation-report.json \
  --output promotion-decision.json
```

The contract reports leakage, end-to-end macro F1/recall, per-class recall, high-spread recall, abstention coverage, calibration, Brier score, crop/district subgroups and bootstrap confidence intervals. The current synthetic fixture is deliberately rejected from promotion and cannot be quoted as accuracy.

### Mobile and offline

Automated Pixel 7 test:

- validates PWA manifest and icons;
- waits for production service-worker control;
- captures online mobile screenshot;
- disables the browser network completely;
- reloads the command centre from cache;
- verifies `navigator.onLine === false`;
- verifies no horizontal overflow;
- repeats under the GitHub Pages project subpath;
- retains screenshots, traces and HTML reports.

Physical Android validation remains governed by `docs/MOBILE_FIELD_VALIDATION.md`.

## 5. Deployment state

### Vercel

Repository deployment configuration now has:

- Node.js `24.x` in root and web package manifests;
- npm `10.x`;
- native Vercel npm-workspace/Next.js handling;
- public-registry normalization for legacy lockfile hosts;
- no custom parent-directory installer;
- fixed release-proof TypeScript nullability.

The last source build log installed dependencies and compiled Next.js successfully before exposing the strict nullability issue; that issue is fixed. New Vercel builds are currently rejected before execution with an account `build-rate-limit` URL. Do not describe the red status as a current code failure.

### GitHub Pages and CI

The independent Pages workflow uses Node 24 and requires lint, strict typecheck and unit tests before deployment. The quality matrix also defines API, connected browser-to-FastAPI, root E2E, Pages-subpath E2E, Pixel hard-offline and model-contract gates.

GitHub currently creates the jobs but terminates every job with zero executed steps, including the Python-only API job. This is an account/repository runner-execution restriction. No green CI claim is permitted until jobs execute.

### Connected API

`render.yaml` defines the demo API and web services. Required connected deployment values:

- `NEXT_PUBLIC_API_URL` on the frontend;
- exact frontend origin in `FGR_ALLOWED_ORIGINS`;
- explicit persistence mode;
- Bhashini/data.gov.in/IMD credentials only in backend secrets.

## 6. Submission assets and routes

| Asset | Location / route | Status |
|---|---|---|
| Command centre | `/command-centre/` | Ready |
| Judge Mode | `/demo/` | Ready |
| Field capture | `/field/scan/` | Ready |
| Connected proof | `/release-proof/` | Source ready; API host required |
| KVK support | `/support/` | Ready |
| Farm Digital Twins | `/digital-twins/` | Ready |
| Integrations operations | `/integrations/` | Ready |
| Evaluator guide | `docs/EVALUATOR_GUIDE.md` | Ready |
| Two-minute script | `submission/DEMO_SCRIPT_2_MIN.md` | Ready |
| Model card | `docs/MODEL_CARD.md` | Ready |
| Field model protocol | `docs/MODEL_EVALUATION_PROTOCOL.md` | Ready |
| Mobile field protocol | `docs/MOBILE_FIELD_VALIDATION.md` | Ready |
| Responsible AI | `docs/RESPONSIBLE_AI.md` | Ready |
| 90-day pilot | `docs/90-day-pilot.md` | Ready |

## 7. Portal submission checklist

Do not press final submit until all mandatory items are complete.

### Mandatory

- [ ] Stable public HTTPS frontend URL opens in incognito.
- [ ] `/demo/` resets and completes 0/5 → 5/5.
- [ ] `/command-centre/` and `/field/scan/` work on mobile Chrome.
- [ ] Public URL survives refresh on nested routes.
- [ ] Manifest, service worker, icons, ONNX and WASM assets return successfully.
- [ ] Proposal/deck uses the same product name, pilot geography, limitations and integration states.
- [ ] All portal character limits are rechecked after final paste.
- [ ] Final PDF is under the portal size limit and visually inspected page by page.
- [ ] Demo URL and repository commit are included in the application.
- [ ] Submission reference number and timestamp are saved.

### Strongly recommended

- [ ] Complete at least one physical Android airplane-mode sign-off.
- [ ] Deploy the connected API and execute `/release-proof/` once.
- [ ] Retain screenshots of command centre, Judge Mode, offline capture, KVK referral and integration states.
- [ ] Export and archive the final release-gate, model-contract and browser-evidence artifacts.

## 8. Claims register

### Safe claims

- working offline-first prototype;
- real browser image processing, hashing and quality checks;
- real voice-note recording and local retention;
- conservative research screening with abstention;
- expert-controlled decisions;
- deterministic outbreak-response workflow;
- sourced nearest-KVK routing and referral-pack preparation;
- governed expert-labelled learning records;
- versioned government integration contracts and truthful access states.

### Prohibited until new evidence exists

- measured field accuracy;
- Rajasthan-trained disease neural model;
- physical Android field validation;
- live Raj Kisan/AgriStack/RajSSO integration;
- Marwari or Mewari automatic speech recognition;
- KVK receipt when only a pack was prepared;
- production deployment across Rajasthan;
- green CI while jobs execute zero steps.

## 9. Final evaluator framing

> An image model can flag a pattern. FarmGraph Rakshak is the operating system that helps Rajasthan capture trustworthy evidence offline, put experts in control, detect emerging clusters, coordinate field and KVK response, measure outcomes and safely convert every verified correction into future local intelligence.
