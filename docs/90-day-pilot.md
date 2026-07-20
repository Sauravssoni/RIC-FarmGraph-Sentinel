# 90-Day Pilot Plan — Jodhpur · Nagaur · Jalore

## Objective

Prove that a quality-gated, expert-verified field evidence grid reduces time-to-advice and produces trustworthy early outbreak signal — **before** any ML model is activated.

## Phasing

### Days 0–15 — Readiness
- MoUs: district agriculture offices (3), 2 KVKs for expert roster; RajSSO request filed.
- Recruit 6 field workers (2/district) and 3 KVK experts; consent scripts approved.
- Content: approve v0 advisories for the 4 pilot crops (non-chemical) through the governance lifecycle.
- Training: half-day per worker on capture checklist, consent, offline sync; expert queue calibration session.

### Days 16–45 — Controlled field run (wave 1: Balesar + Nagaur blocks)
- ~40 farmers/block enrolled (pseudonymous references; Jan Aadhaar verification pending authority).
- Field workers run scheduled sweeps + farmer-initiated reports; experts clear queue daily (SLA 24 h).
- Weekly district review: cluster list, dismissed clusters, queue depth, sync failures.
- **Gate to wave 2:** ≥85% captures pass quality gate by week 3 (recapture loop working); expert median review < 24 h; zero advisory safety incidents.

### Days 46–75 — Scale within districts (wave 2: all 6 blocks)
- Add outbreak missions: every SUSPECTED cluster gets a representative mission inside 5 days.
- Follow-up discipline: every issued advisory gets a day-5 follow-up; not-improving escalates.
- IMD district feed wired into weather-suitability component (public data).

### Days 76–90 — Evaluation & decision
- Compute pilot metrics (measurement plan); expert-agreement study on 100 cases.
- Dataset licensing review for Task 002 model; shadow-mode plan.
- Go/no-go for model evaluation harness and 3-district expansion.

## Staffing & cost drivers (prototype-grade estimate)

6 field workers, 3 experts (part-time), 1 district coordinator per district, 1 programme lead. Dominant costs are people and travel — not software.

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| MoU delays | Pilot runs on PUBLIC_DATA_ONLY + SIMULATED adapters; integrations are accelerators, not prerequisites |
| Expert fatigue | Priority queue caps daily load; abstain/duplicate filtering keeps noise out |
| Connectivity worse than expected | Offline-first is already the design; low-bandwidth mode default-on in wave 1 |
| Farmer trust | Assisted capture via field workers; advisories only through approved content |
