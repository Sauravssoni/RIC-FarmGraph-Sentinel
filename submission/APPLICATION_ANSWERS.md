# Rajasthan Innovation Challenge — Application Answers

## Challenge selected

**AI-Based Crop Disease & Pest Detection for Smallholder Farmers**

## Applicant

**Legal entity:** Syntheon Technology Private Limited  
**DPIIT recognition:** DIPP213187  
**Founder / authorised representative:** Saurav Soni  
**Location:** Jaipur, Rajasthan  
**Solution:** FarmGraph Rakshak

---

## 1. Solution title

**FarmGraph Rakshak — Rajasthan’s Offline Crop-Health and Outbreak-Response Grid**

## 2. One-line description

An offline-first field evidence, Farm Digital Twin and government outbreak-response system that helps Rajasthan detect crop-health signals early, verify them through experts and KVKs, and coordinate safe district-level action.

## 3. Executive summary

Smallholder crop-health losses are not caused only by the absence of a classifier. The operational failure occurs across the full chain: farmers submit incomplete evidence, connectivity is unreliable, uncertain cases are forced into labels, experts receive unstructured reports, nearby incidents remain disconnected, field verification is not prioritised, and advisories are difficult to govern and measure.

FarmGraph Rakshak converts that fragmented chain into one auditable operating workflow. A Hindi-first mobile PWA works offline on field devices. It guides the user to capture multiple crop views, checks the real image pixels for blur, exposure, contrast and vegetation coverage, preserves EXIF-stripped evidence with SHA-256 hashes, and executes an honest edge-screening layer with uncertainty and abstention. Cases requiring verification route to an expert and the nearest sourced KVK. Every plot is represented by a Farm Digital Twin combining crop stage, observations, image and voice evidence, expert decisions, weather/market context, referrals, advisories, missions and outcomes. Compatible cases aggregate into explainable outbreak clusters so district officers can deploy representative field missions and issue only approved, versioned, safe advisories.

The prototype does not fabricate government integrations or model accuracy. Bhashini, IMD, AGMARKNET/data.gov.in, AgriStack/UFSI, Raj Kisan, RajSSO, Jan Aadhaar, e-Dharti/ULPIN, Soil Health Card and NPSS are represented through live, cached, credential-required, public-directory or authority-gated states. The current disease-pattern scorer is a transparent research heuristic, not a field-validated model; the architecture is deliberately model-replaceable and includes a governed learning pipeline for expert-corrected local evidence.

## 4. Problem being solved

Rajasthan’s smallholder crop-health response faces five connected problems:

1. **Poor evidence quality:** blurred, poorly lit or incomplete photographs produce unsafe confidence and repeated expert effort.
2. **Connectivity and language barriers:** field capture must survive low bandwidth and support Hindi and regional speech workflows.
3. **Fragmented expert escalation:** cases are not consistently routed with structured evidence to the nearest relevant support institution.
4. **No field-to-district intelligence:** isolated reports do not become explainable outbreak signals, mission priorities or measurable outcomes.
5. **Unsafe and ungoverned advice:** uncertain diagnoses can lead to inappropriate chemical action, while advisory versions and follow-up are difficult to audit.

FarmGraph addresses the entire operational failure, rather than stopping after image classification.

## 5. Target users

- Smallholder farmers and farmer facilitators.
- Agriculture field workers and extension personnel.
- KVK and agronomy experts.
- Block and district agriculture officers.
- State crop-health and programme leadership.
- Government-system teams integrating Raj Kisan, AgriStack, NPSS, Soil Health Card or related services.

## 6. How the solution works

### Field capture

- Consent acknowledgement.
- Hindi-first crop, stage and symptom inputs.
- Camera/upload and real pixel-quality checks.
- EXIF-stripped compressed image storage and SHA-256 evidence hashes.
- Offline drafts, evidence storage and outbox.
- Voice-note recording; optional Bhashini Hindi ASR/TTS when configured.
- Marwari/Mewari notes retained and routed to human review without false ASR claims.

### Edge screening and expert review

- Interpretable pixel-feature screening with provider/version metadata.
- MobileNetV2 ONNX broad out-of-distribution screening.
- Uncertainty, abstention and recapture instructions.
- Expert confirm, correct, unknown, recapture or field-visit decisions.
- Governed learning record created from expert decisions.

### Farm Digital Twin and outbreak response

- Plot, crop season and stage timeline.
- Evidence, inference and expert-decision history.
- IMD/data-source status, KVK referral, mandi context and government-adapter rail.
- Explainable spatial/temporal outbreak score.
- Representative field mission generation.
- Approved, versioned advisory workflow with chemical content locked by policy.
- Follow-up, outcome and append-only audit.

## 7. Alignment with the four challenge requirements

### Offline regional crop-recognition capability

The prototype performs genuine offline image processing and bundles browser-executable ONNX infrastructure. It currently supports structured workflows for bajra, mustard, guar and cumin. The present disease-pattern scorer is a transparent research heuristic and is not presented as field-validated accuracy. The 90-day pilot includes a governed Rajasthan dataset and model-evaluation workstream to replace or augment this scorer with a benchmarked regional model.

### Hindi and Marwari/Mewari voice

Real voice notes record and remain on-device offline. Hindi browser dictation is visibly labelled as a browser fallback. A backend-only Bhashini PoC adapter supports Hindi ASR/TTS when credentials are configured. Marwari/Mewari ASR is not falsely claimed; regional recordings, phrase guidance and human-review routing are implemented.

### Nearest KVK or expert linkage

The prototype includes sourced KVK records for the pilot region, nearest-distance and crop-speciality matching, call/email/directions actions, a guarded referral lifecycle, 48-hour SLA, escalation, audit history and downloadable privacy-masked evidence packs. External delivery is labelled as non-automated until institutional integration is approved.

### Feedback loop using local data

Every expert confirmation/correction can create a consent-aware learning record with crop, district, original provider/label, expert label, evidence references and model-version eligibility. The prototype intentionally prevents automatic retraining. Candidate models must pass class-wise evaluation, calibration, abstention and safety gates before shadow deployment or promotion.

## 8. Innovation

FarmGraph’s innovation is the integrated government response system:

- **Evidence Quality Before AI:** unusable images are rejected with specific recapture guidance.
- **Honest Edge Intelligence:** every provider, uncertainty and abstention is visible.
- **Farm Digital Twin:** every plot has a versioned operational history rather than a one-time diagnosis.
- **Field-to-Outbreak Graph:** verified cases become explainable district intelligence.
- **Representative Mission Intelligence:** field visits are selected to maximise verification value.
- **Advisory Safety by Architecture:** unapproved, expired, mismatched or superseded advisories are rejected server-side.
- **Expert Corrections as Governed Learning Data:** feedback becomes auditable model-improvement evidence.
- **Government Interoperability Without Fabrication:** public data works where available; authority-dependent services use explicit contracts and readiness states.

## 9. Technology architecture

- **Field PWA:** Next.js 15, React 19, TypeScript, IndexedDB/Dexie, service worker, ONNX Runtime Web.
- **Connected API:** FastAPI, Pydantic validation, role semantics, rate limiting, restricted CORS, SQLite demo persistence and idempotent sync.
- **Evidence:** client-side compression/re-encoding, SHA-256, duplicate detection and consent-bound upload references.
- **Decision engines:** pixel quality, research edge screening, deterministic safety/policy engine, explainable outbreak scoring and mission selection.
- **Interoperability:** typed adapters for Bhashini, IMD, data.gov.in/AGMARKNET, KVK, AgriStack/UFSI and Rajasthan government systems.
- **Governance:** model registry, advisory lifecycle, learning records, audit events, data provenance and privacy controls.

## 10. Current prototype readiness

The repository contains a detailed working prototype with:

- command centre and Rajasthan pilot map;
- offline field scan;
- image and voice evidence;
- real browser pixel processing and ONNX execution;
- expert workflow;
- 29 Farm Digital Twins;
- outbreak clusters and missions;
- KVK routing and evidence packs;
- advisory safety and follow-up;
- learning flywheel;
- government integrations control room;
- Judge Mode with golden, negative and infrastructure paths;
- connected evidence-continuity proof from browser to FastAPI to KVK pack;
- Docker, Vercel, GitHub Pages and Render deployment configurations;
- comprehensive model, data, security, pilot and responsible-AI documentation.

## 11. Government infrastructure strategy

FarmGraph complements rather than replaces existing systems:

- **Raj Kisan:** state service-delivery and farmer-facing integration surface.
- **AgriStack/UFSI:** farmer, farmland plot, crop-sown and consent-aligned interoperability.
- **RajSSO:** production identity and role access.
- **Jan Aadhaar:** authority-approved identity linkage only; not used in prototype data.
- **e-Dharti/ULPIN:** plot reference and land-boundary linkage.
- **Soil Health Card:** soil context and differential diagnosis support.
- **Bhashini:** Hindi ASR/TTS and translation pathway.
- **IMD:** official weather and agrometeorological context.
- **AGMARKNET/data.gov.in:** mandi context for recovery and market decisions.
- **NPSS:** verified incident and surveillance handoff.
- **KVKs:** expert verification, referral and local capacity.

No authority-dependent service is represented as live without approval.

## 12. 90-day pilot proposal

**Pilot districts:** Jodhpur, Nagaur and Jalore.  
**Indicative coverage:** 3 districts, 6 blocks, 30 villages, 1,500 farms/plots and four priority crops.  
**Field structure:** 12 field facilitators, 6 agronomy/KVK reviewers, three district coordinators and one state programme cell.

### Days 1–15

- Government/KVK validation workshop.
- Data protection, consent and advisory policy approval.
- Block/village selection and baseline.
- Device and user setup.
- Initial Rajasthan-labelled evidence protocol.

### Days 16–45

- Field capture and expert-review operation.
- Evidence-quality and language tuning.
- KVK referral and SLA validation.
- Candidate regional model dataset curation.
- Command-centre and mission exercises.

### Days 46–75

- Candidate model evaluation in shadow mode.
- Cluster and mission threshold review.
- Advisory comprehension and safety testing.
- Raj Kisan/AgriStack/UFSI/NPSS contract workshop.
- Mid-pilot impact review.

### Days 76–90

- Outcome follow-up and independent evaluation.
- District and state handoff packages.
- Security, privacy and responsible-AI review.
- Go/no-go decision for expansion.

## 13. Pilot success metrics

- At least 75% first-pass usable evidence after field training.
- Median report-to-expert-review below four working hours for priority cases.
- At least 90% successful offline-to-connected synchronisation.
- At least 80% KVK referral acknowledgement within the agreed pilot SLA where institutional participation is active.
- At least 85% follow-up completion for issued advisories.
- 100% consequential cases retain source, provider, evidence hash and expert-decision provenance.
- Zero chemical recommendations issued without the approved policy gates.
- Model candidate evaluated with macro-F1, per-class recall, calibration, abstention and district/source-separated test data; no promotion without approval.

All targets are proposed pilot targets, not current field-performance claims.

## 14. Business and sustainability model

FarmGraph is designed as a government programme platform rather than a farmer-paid diagnosis application.

Potential operating models:

- state or district programme licence and managed deployment;
- implementation and integration services;
- field-support and model-governance service;
- KVK/FPO/cooperative deployment packages;
- optional analytics and interoperability modules for approved institutional users.

Farmers should not be charged for essential reporting and advisory access in a government-funded pilot.

## 15. Scalability

- Static PWA remains usable on low-end Android devices and unreliable networks.
- Model/provider abstraction allows crop and region-specific replacements.
- Typed integration contracts prevent dependence on one unavailable government API.
- District-sharded operations and role-scoped views support state scale.
- Synthetic seed and deterministic Judge Mode make training and acceptance testing reproducible.
- Consent, provenance and learning eligibility are embedded in the data model.

## 16. Responsible AI and safety

- No forced diagnosis when evidence is weak or unsupported.
- No accuracy claim without an evaluation dataset.
- Human expert verification for consequential cases.
- Exact source/provider/version recorded.
- Regional speech routed to humans when unsupported.
- Chemical section locked by default.
- Server rejects draft, expired, withdrawn, superseded, crop-mismatched or condition-mismatched advisories.
- Pseudonymous farmer identifiers and privacy-rounded coordinates in referral packs.
- No Aadhaar or Jan Aadhaar data in the prototype.
- Local evidence is uploaded only after explicit consent.

## 17. Competitive differentiation

| Alternative | Limitation | FarmGraph advantage |
|---|---|---|
| Image-classifier app | Stops after a label | Complete evidence-to-response workflow |
| Generic chatbot | Weak evidence and safety | Structured capture, abstention and governed advice |
| Helpline-only workflow | Unstructured and difficult to aggregate | Evidence hashes, Digital Twins and outbreak graph |
| Expert-only manual process | Slow prioritisation and limited scale | Quality gate, queue, cluster and mission intelligence |
| Dashboard without field workflow | No trustworthy input layer | Offline capture and evidence continuity |
| Surveillance portal without local action | Weak last-mile loop | KVK referral, mission, advisory and follow-up |

## 18. Proposed funding request

**Indicative milestone-based request: ₹2.95 crore over 24 months**, subject to the challenge’s grant framework and government-approved scope.

- 90-day validation pilot: ₹48.60 lakh.
- Six-district hardening and integration phase: ₹1.16 crore.
- State-scale readiness, model expansion, security and institutional handoff: ₹1.304 crore.

Detailed estimates are in `PILOT_BUDGET.md` and `GRANT_USE_PLAN.md`. These are planning estimates, not incurred costs.

## 19. Why Syntheon

Syntheon Technology Private Limited brings a systems-first approach combining product engineering, AI governance, government interoperability, security, legal/compliance reasoning and field-operational design. The team has built FarmGraph as an auditable working prototype rather than a conceptual classifier or presentation-only submission.

## 20. Closing statement

FarmGraph Rakshak gives Rajasthan more than an image diagnosis screen. It provides a practical crop-health response layer that works offline, respects uncertainty, strengthens local expert institutions and turns verified field evidence into safe, measurable government action.
