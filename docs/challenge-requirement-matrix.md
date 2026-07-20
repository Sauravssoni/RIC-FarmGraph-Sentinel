# Challenge Requirement Matrix

How FarmGraph Rakshak Task 001 answers each expectation of the Rajasthan innovation challenge *“AI-Based Crop Disease & Pest Detection for Smallholder Farmers.”*

| # | Challenge expectation | Where it is met | Evidence |
|---|---|---|---|
| 1 | AI-based detection assistance for smallholders | Deterministic triage layer (simulated, labelled) with candidate conditions, confidence, reasons, missing evidence | `/field/scan` result phase; `DiagnosisPanel`; `data/demo/taxonomy.json` |
| 2 | Works for smallholder reality (offline, low-end, vernacular) | PWA offline shell, IndexedDB drafts + outbox, Hindi/English toggle, voice affordance with typed fallback, low-bandwidth mode | `src/lib/offline.ts`, `public/sw.js`, `src/lib/i18n.tsx`, `/field/scan` |
| 3 | Expert-in-the-loop | Priority-ranked expert queue; confirm / correct / unknown / field-visit / recapture decisions; corrections feed governance | `/expert`, `store.review`, `expertPriority()` |
| 4 | Outbreak intelligence for the district | Explainable cluster scoring with component breakdown, thresholds (70 verified / 40 suspected), duplicate penalty | `/outbreaks`, `outbreakScore()`, cluster CL-2601 65.5→71.5 |
| 5 | Field verification missions | One-open-mission-per-cluster guard; representative ordering (unverified-first then nearest); offline pack; visit logging | `/missions`, `generateMission()` |
| 6 | Safe advisories | Approval lifecycle DRAFT→EXPERT_REVIEWED→APPROVED; chemical section locked; versioned (ADV-2601 v0.1→v0.3) | `/governance` advisory board; `AdvisoryCard` |
| 7 | Follow-up & outcomes | Follow-up states improving / not-improving (escalates) / resolved; outcome trend on command centre | `/cases/[id]`, `/command-centre` |
| 8 | Government ecosystem fit | 17 adapters (RajSSO, Jan Aadhaar, e-Dharti, Girdawari, Raj Kisan Saathi, Rajdhara, NPSS, Kisan e-Mitra, Bhashini, KVK, IMD, SHC, SATHI, CIB&RC, RajSampark, e-Mitra, AGMARKNET) — honest statuses, none live | `/integrations`, `data/demo/integrations.json` |
| 9 | Data protection & consent | Consent recorded per case (channel + purpose), pseudonymous farmers only, purpose note shown at capture | `/field/scan` consent phase; seed invariants test |
| 10 | Auditability | Append-only timeline per case + global audit stream; deterministic reset restores exact seed | `Timeline`, `/governance` audit stream, `/demo` reset |
| 11 | Measurable pilot | 90-day pilot plan + measurement plan with baselines | `docs/90-day-pilot.md`, `docs/pilot-measurement-plan.md` |
| 12 | Transparency / no overclaiming | Simulated labels everywhere; model registry states “no accuracy measured”; known-limitations doc | `ProvenanceTag`, `/governance`, `docs/known-limitations.md` |

## Deliberate scope exclusions (stated to judges)

- No live government API calls (would be fabrication).
- No Marwari/Mewari ASR claims (Bhashini adapter is `CONTRACT_DEFINED`; voice is an affordance with typed fallback).
- No district boundary polygons on the map (not reliably sourced at the required licence; Natural Earth state outline + district HQ reference points instead).
