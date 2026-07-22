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

**FarmGraph Rakshak — Rajasthan’s Offline Crop-Health and Predictive Outbreak-Response Grid**

## 2. One-line description

An offline-first crop-health operations platform that captures trustworthy image and voice evidence, keeps experts in control, forecasts district workload and outbreak-response demand, routes cases to the nearest KVK and converts verified outcomes into governed local intelligence.

## 3. Executive summary

Smallholder crop-health losses are not caused only by the absence of a classifier. The larger operational failure occurs across the full chain: farmers submit incomplete evidence, connectivity is unreliable, uncertain cases are forced into labels, experts receive unstructured reports, district officers manually scan case lists, nearby incidents remain disconnected, field visits are not prioritised, KVK deadlines are tracked separately, and advisories are difficult to govern and measure.

FarmGraph Rakshak converts that fragmented chain into one auditable operating workflow. A Hindi-first mobile PWA works offline on field devices. It guides users to capture multiple crop views, checks real image pixels for blur, exposure, contrast and vegetation coverage, preserves EXIF-stripped evidence with SHA-256 hashes, records voice notes and executes a conservative edge-screening layer with uncertainty and abstention. Consequential cases route to structured expert review and the nearest sourced KVK.

Every plot is represented by a Farm Digital Twin combining crop stage, observations, image and voice evidence, expert decisions, weather and market context, referrals, advisories, missions and outcomes. Compatible cases aggregate into explainable outbreak clusters. A compact Decision Intelligence layer uses recent case flow, current expert backlog, cluster temporal growth, weather-suitability context, referral deadlines and offline-sync state to show a seven-day trend, forecast the next 72 hours of expert-review demand, identify rising districts, detect KVK SLA risk and rank the next three operational actions.

This is designed to reduce repetitive government coordination, not replace agronomists. The platform automatically ranks queues, pre-checks evidence, batches representative field missions, prepares privacy-masked KVK packs and explains why each action is prioritised. The displayed operator-time saving is an assumption-based planning estimate with its calculation visible, not a fabricated impact claim.

The prototype does not fabricate government integrations or model accuracy. Bhashini, IMD, AGMARKNET/data.gov.in, AgriStack/UFSI, Raj Kisan, RajSSO, Jan Aadhaar, e-Dharti/ULPIN, Soil Health Card and NPSS are represented through live, cached, credential-required, public-directory or authority-gated states. The current disease-pattern scorer is a transparent research heuristic, not a field-validated model; the architecture is model-replaceable and includes a governed learning pipeline for expert-corrected local evidence.

## 4. Problem being solved

Rajasthan’s smallholder crop-health response faces six connected problems:

1. **Poor evidence quality:** blurred, poorly lit or incomplete photographs create unsafe confidence and repeated expert effort.
2. **Connectivity and language barriers:** field capture must survive low bandwidth and support Hindi and regional speech workflows.
3. **Fragmented expert escalation:** cases are not consistently routed with structured evidence to the nearest relevant institution.
4. **Manual operating overload:** officers and experts must scan registers, compare districts, track referral deadlines, prepare handoff packs and plan visits manually.
5. **No field-to-district intelligence:** isolated reports do not become explainable outbreak signals, workload forecasts, mission priorities or measurable outcomes.
6. **Unsafe and ungoverned advice:** uncertain diagnoses can lead to inappropriate chemical action, while advisory versions and follow-up are difficult to audit.

FarmGraph addresses the entire evidence-to-response failure rather than stopping after image classification.

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
- Uncertainty, abstention and specific recapture instructions.
- Expert confirm, correct, unknown, recapture or field-visit decisions.
- Governed learning record created from expert decisions.

### Farm Digital Twin and outbreak response

- Plot, crop season and stage timeline.
- Evidence, inference and expert-decision history.
- IMD/data-source status, KVK referral, mandi context and government-adapter rail.
- Explainable spatial and temporal outbreak score.
- Representative field mission generation instead of visiting every report.
- Approved, versioned advisory workflow with chemical content locked by policy.
- Follow-up, outcome and append-only audit.

### Predictive operations and workload automation

- Seven observed daily signal counts and a transparent three-day forecast.
- Forecast of expert decisions likely in the next 72 hours.
- Detection of pilot districts whose signal volume is increasing.
- Detection of open KVK referrals due within the next 24 hours.
- Ranked next-best actions linked to expert, outbreak, field and support workflows.
- Automatic queue ranking by spread risk, uncertainty and evidence state.
- Estimated officer minutes avoided through evidence pre-checks, queue ranking, cluster synthesis, mission batching and referral-pack preparation.
- Expandable formulas and assumptions so the intelligence can be audited.

The operations forecast is explicitly not presented as a field-validated epidemiological model and cannot make agronomic decisions.

## 7. Alignment with the four challenge requirements

### Offline regional crop-recognition capability

The prototype performs genuine offline image processing and bundles browser-executable ONNX infrastructure. It supports structured workflows for bajra, mustard, guar and cumin. The present disease-pattern scorer is a transparent research heuristic and is not presented as field-validated accuracy. The 90-day pilot includes a governed Rajasthan dataset and model-evaluation workstream to replace or augment this scorer with a benchmarked regional model.

### Hindi and Marwari/Mewari voice

Real voice notes record and remain on-device offline. Hindi browser dictation is visibly labelled as a browser fallback. A backend-only Bhashini PoC adapter supports Hindi ASR/TTS when credentials are configured. Marwari/Mewari ASR is not falsely claimed; regional recordings, phrase guidance and human-review routing are implemented.

### Nearest KVK or expert linkage

The prototype includes sourced KVK records for the pilot region, nearest-distance and crop-speciality matching, call/email/directions actions, a guarded referral lifecycle, 48-hour SLA, escalation, audit history and downloadable privacy-masked evidence packs. External delivery is labelled non-automated until institutional integration is approved.

### Feedback loop using local data

Every expert confirmation or correction can create a consent-aware learning record containing crop, district, original provider and label, expert label, evidence references and model-version eligibility. The prototype prevents automatic retraining. Candidate models must pass class-wise evaluation, calibration, abstention, subgroup and safety gates before shadow deployment or promotion.

## 8. Innovation and uniqueness

FarmGraph’s innovation is the integrated, predictive government response system:

- **Evidence Quality Before AI:** unusable images are rejected with specific recapture guidance.
- **Honest Edge Intelligence:** provider, uncertainty, limitations and abstention remain visible.
- **Farm Digital Twin:** every plot has a versioned operational history rather than a one-time diagnosis.
- **Field-to-Outbreak Graph:** verified cases become explainable district intelligence.
- **Predictive Operations Intelligence:** case flow, cluster growth, weather context and backlogs become a 72-hour staffing and response forecast.
- **Next-Best-Action Ranking:** the system identifies the most urgent expert, district, outbreak, sync or KVK action and displays the evidence behind it.
- **Representative Mission Intelligence:** field visits are selected to maximise verification value and reduce repeat travel.
- **KVK SLA Protection:** referral deadlines become visible operational risk rather than spreadsheet follow-up.
- **Advisory Safety by Architecture:** unapproved, expired, mismatched or superseded advisories are rejected server-side.
- **Expert Corrections as Governed Learning Data:** feedback becomes auditable model-improvement evidence.
- **Government Interoperability Without Fabrication:** public data works where available; authority-dependent services use explicit contracts and readiness states.

## 9. Technology architecture

- **Field PWA:** Next.js 15, React 19, TypeScript, IndexedDB/Dexie, service worker and ONNX Runtime Web.
- **Connected API:** FastAPI, Pydantic validation, role semantics, rate limiting, restricted CORS, SQLite demo persistence and idempotent sync.
- **Evidence layer:** client-side compression/re-encoding, SHA-256, duplicate detection and consent-bound upload references.
- **Decision engines:** pixel quality, research edge screening, deterministic policy/safety engine, explainable outbreak scoring, mission selection and predictive operations intelligence.
- **Forecast inputs:** recent case flow, current expert queue, cluster temporal growth, weather-suitability signal, referral due times, mission state and offline backlog.
- **Interoperability:** typed adapters for Bhashini, IMD, data.gov.in/AGMARKNET, KVK, AgriStack/UFSI and Rajasthan government systems.
- **Governance:** model registry, advisory lifecycle, learning records, audit events, data provenance, privacy controls and claim boundaries.

## 10. Current prototype readiness

The repository contains a detailed working prototype with:

- professional government command centre and Rajasthan pilot map;
- explainable 72-hour operations forecast and seven-day trend;
- expert-load prediction, rising-district detection and KVK SLA-risk alerts;
- ranked next-best actions and disclosed workload-reduction assumptions;
- offline field scan;
- image and voice evidence;
- real browser pixel processing and ONNX execution;
- expert workflow;
- 29 Farm Digital Twins;
- outbreak clusters and representative missions;
- KVK routing and evidence packs;
- advisory safety and follow-up;
- governed learning flywheel;
- government integrations control room;
- Judge Mode with primary, negative and infrastructure paths;
- connected evidence-continuity proof from browser to FastAPI to KVK pack;
- static Vercel, GitHub Pages and Render deployment configurations;
- model-evaluation, mobile-offline, decision-intelligence, data, security, pilot and responsible-AI documentation.

## 11. Government infrastructure strategy

FarmGraph complements rather than replaces existing systems:

- **Raj Kisan:** state service-delivery and farmer-facing integration surface.
- **AgriStack/UFSI:** farmer, farmland plot, crop-sown and consent-aligned interoperability.
- **RajSSO:** production identity and role access.
- **Jan Aadhaar:** authority-approved identity linkage only; not used in prototype data.
- **e-Dharti/ULPIN:** plot reference and land-boundary linkage.
- **Soil Health Card:** soil context and differential-diagnosis support.
- **Bhashini:** Hindi ASR/TTS and translation pathway.
- **IMD:** official weather and agrometeorological context for explainable risk and workload forecasting.
- **AGMARKNET/data.gov.in:** mandi context for recovery and market decisions.
- **NPSS:** verified incident and surveillance handoff.
- **KVKs:** expert verification, referral, SLA and local capacity.

Each adapter has a visible source state. No authority-dependent service is represented as live without approval.

## 12. 90-day pilot proposal

**Pilot districts:** Jodhpur, Nagaur and Jalore.  
**Indicative coverage:** 3 districts, 6 blocks, 30 villages, 1,500 farms or plots and four priority crops.  
**Field structure:** 12 field facilitators, 6 agronomy/KVK reviewers, three district coordinators and one state programme cell.

### Days 1–15

- Government and KVK validation workshop.
- Data protection, consent and advisory policy approval.
- Block and village selection and baseline.
- Device and user setup.
- Initial Rajasthan-labelled evidence protocol.
- Baseline time-and-motion study for manual case review, mission planning and KVK handoff.

### Days 16–45

- Field capture and expert-review operation.
- Evidence-quality and language tuning.
- KVK referral and SLA validation.
- Candidate regional-model dataset curation.
- Command-centre and mission exercises.
- Calibration of workload forecasting and next-best-action thresholds using real operating volumes.

### Days 46–75

- Candidate model evaluation in shadow mode.
- Forecast error, district-trend and workload-capacity review.
- Cluster and mission threshold review.
- Advisory comprehension and safety testing.
- Raj Kisan, AgriStack/UFSI and NPSS contract workshop.
- Mid-pilot impact and manual-overload review.

### Days 76–90

- Outcome follow-up and independent evaluation.
- Post-pilot time-and-motion comparison.
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
- Zero chemical recommendations issued without approved policy gates.
- At least 30% reduction in median officer time spent prioritising a daily case queue, measured through a pre/post time-and-motion study.
- At least 25% reduction in manual preparation time for KVK and field-mission handoffs.
- 72-hour expert-load forecast evaluated using mean absolute error and calibration against observed pilot demand; no performance claim before measurement.
- Model candidate evaluated using macro-F1, per-class recall, calibration, abstention and district/source-separated test data; no promotion without approval.

All percentages are proposed pilot targets, not current field-performance claims.

## 14. Business and sustainability model

FarmGraph is designed as a government programme platform rather than a farmer-paid diagnosis application.

Potential operating models:

- state or district programme licence and managed deployment;
- implementation and government-integration services;
- field-support, analytics and model-governance service;
- KVK, FPO and cooperative deployment packages;
- approved operational-intelligence and interoperability modules.

Farmers should not be charged for essential reporting and advisory access in a government-funded pilot.

## 15. Scalability

- Static PWA remains usable on low-end Android devices and unreliable networks.
- Model/provider abstraction allows crop- and region-specific replacements.
- Typed integration contracts prevent dependence on one unavailable government API.
- District-sharded operations and role-scoped views support state scale.
- Forecast and action-ranking logic is transparent, configurable and auditable by programme teams.
- Synthetic seed and deterministic Judge Mode make training and acceptance testing reproducible.
- Consent, provenance and learning eligibility are embedded in the data model.

## 16. Responsible AI and safety

- No forced diagnosis when evidence is weak or unsupported.
- No accuracy claim without an evaluation dataset.
- Human expert verification for consequential cases.
- Exact source, provider and version recorded.
- Regional speech routed to humans when unsupported.
- Chemical section locked by default.
- Server rejects draft, expired, withdrawn, superseded, crop-mismatched or condition-mismatched advisories.
- Pseudonymous farmer identifiers and privacy-rounded coordinates in referral packs.
- No Aadhaar or Jan Aadhaar data in the prototype.
- Local evidence is uploaded only after explicit consent.
- Operational forecasts cannot diagnose disease or override an expert.
- Estimated workload savings are visibly assumption-based until measured in the pilot.

## 17. Competitive differentiation

| Alternative | Limitation | FarmGraph advantage |
|---|---|---|
| Image-classifier app | Stops after a label | Complete evidence-to-response workflow |
| Generic chatbot | Weak evidence and safety | Structured capture, abstention and governed advice |
| Helpline-only workflow | Unstructured and difficult to aggregate | Evidence hashes, Digital Twins and outbreak graph |
| Expert-only manual process | Slow prioritisation and limited scale | Forecast workload, rank cases, batch missions and protect SLAs |
| Dashboard without field workflow | No trustworthy input layer | Offline capture and connected evidence continuity |
| Analytics portal without action | Reports trends but does not coordinate response | Ranked next-best actions linked to missions, KVKs and outcomes |
| Surveillance portal without local action | Weak last-mile loop | KVK referral, mission, advisory and follow-up |

## 18. Proposed funding request

**Indicative milestone-based request: ₹2.95 crore over 24 months**, subject to the challenge’s grant framework and government-approved scope.

- 90-day validation pilot: ₹48.60 lakh.
- Six-district hardening and integration phase: ₹1.16 crore.
- State-scale readiness, model expansion, security and institutional handoff: ₹1.304 crore.

Detailed estimates are in `PILOT_BUDGET.md` and `GRANT_USE_PLAN.md`. These are planning estimates, not incurred costs.

## 19. Why Syntheon

Syntheon Technology Private Limited brings a systems-first approach combining product engineering, AI governance, predictive operations, government interoperability, security, legal and compliance reasoning and field-operational design. The team has built FarmGraph as an auditable working prototype rather than a conceptual classifier or presentation-only submission.

## 20. Closing statement

FarmGraph Rakshak gives Rajasthan more than an image diagnosis screen. It provides an offline crop-health operating layer that improves evidence quality, forecasts workload, reduces repetitive coordination, protects expert and KVK response capacity, preserves human control and turns verified field evidence into safe, measurable and continuously improving government action.
