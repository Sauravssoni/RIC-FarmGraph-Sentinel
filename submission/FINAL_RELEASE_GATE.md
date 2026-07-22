# FarmGraph Rakshak — Final Submission Release Gate

**Applicant:** Syntheon Technology Private Limited  
**DPIIT:** DIPP213187  
**Competition:** Rajasthan Innovation Challenge  
**Challenge:** AI-Based Crop Disease & Pest Detection for Smallholder Farmers  
**Submission branch:** `main`

This is the authoritative go/no-go index for the prototype, proposal, live demonstration and portal submission. It separates implemented evidence from deployment verification, government access, field validation and hosting dependencies.

## 1. Release decision

| Gate | Current state | Submission effect |
|---|---|---|
| Source architecture and product flow | READY | Feature scope frozen |
| Government command centre | READY | Evaluator landing screen |
| Explainable decision intelligence | READY IN SOURCE | 72-hour load forecast, district trends, SLA risk and ranked actions |
| Five-act Judge Mode | READY | Primary live demonstration |
| Official four-feature challenge fit | READY | Visible on the primary demo screen |
| Offline evidence and PWA implementation | READY IN SOURCE | Automated Pixel hard-offline proof implemented |
| Connected FastAPI evidence handoff | READY IN SOURCE | Deployed API required for live connected proof |
| Model evaluation governance | READY | Executable evaluation and promotion gates present |
| Field disease-model performance | NOT CLAIMABLE | Expert-labelled Rajasthan field dataset not yet available |
| Physical Android field sign-off | PENDING | Do not claim physical-device validation yet |
| Vercel repository configuration | READY IN SOURCE | Static export configured as Vercel Other preset, not Next server runtime |
| Final public redeploy verification | PENDING | Rebuild merged commit and verify every evaluator route |
| Portal submission receipt | PENDING | Complete after final URL and PDF checks |

**Current release decision:** **SUBMISSION CANDIDATE — FINAL DEPLOYMENT VERIFICATION REQUIRED.** Product scope, evaluator flow, forecasting logic and evidence contracts are ready. The merged static deployment must be opened and tested before the portal is submitted.

## 2. Primary evaluator path

Use `/demo/` and remain on **Primary evaluator proof**.

1. **Operational picture and forecast** — pilot-district map, four decision KPIs, priority rail, seven-day trend, 72-hour expert-load forecast, KVK SLA risk and ranked next-best actions.
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

## 4. Winning-product benchmark evidence

### Government command centre

- compact, map-first hierarchy;
- four executive KPIs rather than a wall of indicators;
- direct case, cluster, mission and support drill-down;
- a single priority rail for immediate work;
- advanced filters hidden until requested;
- pilot-scoped language and visible data-source state.

### Explainable decision intelligence

The command centre now contains one compact operational-intelligence card rather than another standalone analytics page.

It provides:

- seven observed daily signal counts;
- a transparent three-day / 72-hour forecast;
- forecast expert-decision load;
- rising-district detection;
- KVK SLA-risk detection within 24 hours;
- three ranked next-best actions linked to actual workflows;
- an explicit officer-time avoidance estimate per review cycle;
- expandable calculation assumptions.

Inputs include current case flow, ranked expert backlog, active-cluster temporal growth, cluster weather suitability, mission batching, referral deadlines and offline-sync state. Government/public inputs retain their live, cached, simulated, credentials-required or awaiting-authority labels.

The intelligence layer reduces manual overload by automating repetitive coordination. It does **not** diagnose disease, issue chemical guidance, override experts or mark external delivery complete.

Technical evidence: `docs/DECISION_INTELLIGENCE.md`, `apps/web/src/lib/decisionIntelligence.ts`, and `apps/web/tests/decisionIntelligence.test.ts`.

### Safety and responsible AI

- poor/corrupt/unsupported evidence rejection;
- abstention and expert escalation;
- expert confirm, correct, unknown, recapture and field-visit decisions;
- locked chemical-advisory section;
- consent references and privacy-masked KVK packs;
- append-only audit continuity;
- synthetic evidence prohibited from becoming field-accuracy claims;
- operational forecast clearly separated from agronomic decision-making.

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

### Vercel static frontend

The application intentionally uses `output: "export"` and successfully creates `apps/web/out`.

The prior build installed dependencies, passed strict TypeScript, compiled all routes, generated 74 static pages and completed export. It then failed only because `framework: "nextjs"` made Vercel’s server adapter search for `out/routes-manifest.json`.

The repository fix is:

```json
{
  "framework": null,
  "buildCommand": "npm run build",
  "outputDirectory": "out",
  "trailingSlash": true
}
```

This selects Vercel’s **Other/static** deployment mode and serves the successful `out` export directly. Node is pinned to `24.x`; npm `>=11 <12` matches the current Vercel Node 24 image. The Root Directory remains `apps/web`.

After merge, verify the deployment log shows the final commit and ends after publishing `out`—without any `routes-manifest.json` lookup.

### GitHub Pages and CI

The independent Pages workflow uses Node 24 and requires lint, strict typecheck and unit tests before deployment. The quality matrix also defines API, connected browser-to-FastAPI, root E2E, Pages-subpath E2E, Pixel hard-offline, decision-intelligence and model-contract gates.

No green CI claim is permitted unless jobs execute and produce artifacts for the final commit.

### Connected API

`render.yaml` defines the demo API and web services. Required connected deployment values:

- `NEXT_PUBLIC_API_URL` on the frontend;
- exact frontend origin in `FGR_ALLOWED_ORIGINS`;
- explicit persistence mode;
- Bhashini/data.gov.in/IMD credentials only in backend secrets.

## 6. Submission assets and routes

| Asset | Location / route | Status |
|---|---|---|
| Command centre | `/command-centre/` | Ready; final redeploy verification required |
| Judge Mode | `/demo/` | Ready; final redeploy verification required |
| Field capture | `/field/scan/` | Ready; mobile verification required |
| Connected proof | `/release-proof/` | Source ready; API host required |
| KVK support | `/support/` | Ready |
| Farm Digital Twins | `/digital-twins/` | Ready |
| Integrations operations | `/integrations/` | Ready |
| Evaluator guide | `docs/EVALUATOR_GUIDE.md` | Ready |
| Two-minute script | `submission/DEMO_SCRIPT_2_MIN.md` | Ready |
| Decision-intelligence evidence | `docs/DECISION_INTELLIGENCE.md` | Ready |
| Model card | `docs/MODEL_CARD.md` | Ready |
| Field model protocol | `docs/MODEL_EVALUATION_PROTOCOL.md` | Ready |
| Mobile field protocol | `docs/MOBILE_FIELD_VALIDATION.md` | Ready |
| Responsible AI | `docs/RESPONSIBLE_AI.md` | Ready |
| 90-day pilot | `docs/90-day-pilot.md` | Ready |

## 7. Portal submission checklist

Do not press final submit until all mandatory items are complete.

### Mandatory

- [ ] Final merged Vercel deployment completes in static/Other mode.
- [ ] Stable public HTTPS frontend URL opens in incognito.
- [ ] `/command-centre/` shows the Decision Intelligence card and no overflow.
- [ ] Seven observed bars, three forecast bars and ranked actions render correctly.
- [ ] `/demo/` resets and completes 0/5 → 5/5.
- [ ] `/command-centre/` and `/field/scan/` work on mobile Chrome.
- [ ] Public URL survives refresh on nested routes.
- [ ] Manifest, service worker, icons, ONNX and WASM assets return successfully.
- [ ] Proposal/deck uses the same product name, pilot geography, forecast limitations and integration states.
- [ ] All portal character limits are rechecked after final paste.
- [ ] Final PDF is under the portal size limit and visually inspected page by page.
- [ ] Demo URL and final repository commit are included in the application.
- [ ] Submission reference number and timestamp are saved.

### Strongly recommended

- [ ] Complete at least one physical Android airplane-mode sign-off.
- [ ] Deploy the connected API and execute `/release-proof/` once.
- [ ] Retain screenshots of command centre, Decision Intelligence, Judge Mode, offline capture, KVK referral and integration states.
- [ ] Export and archive final release-gate, model-contract and browser-evidence artifacts.
- [ ] Conduct a pilot time-and-motion study before converting estimated minutes avoided into a measured impact claim.

## 8. Claims register

### Safe claims

- working offline-first prototype;
- real browser image processing, hashing and quality checks;
- real voice-note recording and local retention;
- conservative research screening with abstention;
- expert-controlled decisions;
- explainable short-horizon operational forecasting;
- rising-district and KVK SLA-risk detection;
- ranked next-best actions for government operators;
- estimated coordination time avoided with disclosed assumptions;
- deterministic outbreak-response workflow;
- sourced nearest-KVK routing and referral-pack preparation;
- governed expert-labelled learning records;
- versioned government integration contracts and truthful access states.

### Prohibited until new evidence exists

- measured field accuracy;
- Rajasthan-trained disease neural model;
- field-validated epidemiological forecast;
- measured officer-hours saved;
- physical Android field validation;
- live Raj Kisan/AgriStack/RajSSO integration;
- Marwari or Mewari automatic speech recognition;
- KVK receipt when only a pack was prepared;
- production deployment across Rajasthan;
- green CI without executed jobs and artifacts.

## 9. Final evaluator framing

> An image model can flag a pattern. FarmGraph Rakshak is the operating system that helps Rajasthan forecast workload, capture trustworthy evidence offline, put experts in control, detect emerging clusters, coordinate field and KVK response, measure outcomes and safely convert every verified correction into future local intelligence.
