# Known Limitations (and Task 002 Scope)

## Limitations — stated plainly

1. **No ML model.** All inference is deterministic and simulated; scores are policy placeholders, not measured accuracy. The demo is about the *grid*, not the model.
2. **In-memory API repository.** The FastAPI backend reloads the seed per process and holds mutations in memory; the browser DemoStore persists to localStorage. Neither is a database. (Repository pattern isolates the swap.)
3. **Static export trade-off.** Cases created at runtime (beyond the 29 seeded) appear in registers but have no prerendered `/cases/[id]` page; CaseTable links only seeded IDs. A server-rendered build removes this.
4. **No authentication/authorisation.** Persona switcher is a demo affordance; the API has open CORS. RajSSO is `AWAITING_AUTHORITY`.
5. **No real government integration.** All 17 adapters are non-live by design; contract fields are proposals, not agreements.
6. **Map is state-outline + reference points.** No district polygons (licence/quality); equirectangular projection; not survey-grade.
7. **Weather suitability is seeded**, not computed from live IMD data.
8. **Voice is an affordance with typed fallback.** No ASR ships; no Marwari/Mewari claims are made.
9. **Single-writer sync.** No multi-device conflict resolution yet (append-only streams make it tractable — see offline-sync-design).
10. **Demo-grade service worker** (manual cache versions, no background sync).
11. **Hindi translation covers the golden path**, not every string in the app.
12. **Evidence is simulated placeholders** — no camera photos are stored or transmitted in Task 001.

## Task 002 scope (not started)

1. **Model work:** dataset licensing + provenance review → offline evaluation harness (per-crop accuracy, calibration, abstention quality, expert-agreement) → shadow mode → gated activation. Deterministic provider remains the permanent fallback.
2. **Persistence:** Postgres repository behind the existing pattern; server-authoritative sync with idempotent replay; encrypted on-device storage.
3. **Identity:** RajSSO login for officers/experts; Jan Aadhaar farmer verification (subject to authority); role-based access.
4. **Integrations:** CIB&RC-aligned advisory unlock workflow; IMD district feed into scoring; NPSS export of verified incidents.
5. **Scale:** 3-district pilot per `docs/90-day-pilot.md`; measurement per `docs/pilot-measurement-plan.md`; full Hindi + Bhashini evaluation.
