# Evaluator Guide — how to judge this prototype in ~20 minutes

## 0. One-paragraph orientation

FarmGraph Rakshak is an offline-first crop-health and outbreak-intelligence
prototype for Rajasthan (bajra, mustard, guar, cumin). It is **honest by
construction**: simulated data is labelled SIMULATED, research-grounded claims
carry sources, no government integration is claimed live, and no score is ever
called "accuracy".

## 1. Fastest path (5 min) — guided Judge Mode

```bash
npm ci && npm run build --workspace apps/web
python3 -m http.server 4173 --directory apps/web/out
# open http://localhost:4173/demo/
```

- **① Golden path** — 12 presenter-controlled steps; every number is exact
  (deterministic seed). Watch for: quality gate refusal, uncertainty display,
  expert routing, cluster re-score 65.5 → 71.5 on confirmation, mission
  generation, advisory with the chemical section LOCKED.
- **② Negative path (adversarial)** — 9 checks that run the *real* guards live
  in your browser: blurred/dark photo rejected by the pixel engine, duplicate
  photo caught by SHA-256, corrupt/wrong-type files rejected, crop-unsupported
  pattern abstention, non-plant abstention, plus server-side invariant/RBAC/
  idempotency probes (honest fallback when the API is off).

## 2. Deeper path (15 min) — API + quality gates

```bash
# terminal 1: demo API (SQLite persistence, demo RBAC, advisory invariants)
pip install -r apps/api/requirements.txt
cd apps/api && uvicorn app.main:app --port 8000

# terminal 2: everything the CI runs
npm run lint && npm run typecheck && npm run test        # web gates (52 unit tests)
cd apps/api && python3 -m pytest tests/ -q               # 33 API tests
npm run e2e                                              # 13 Playwright tests
```

Then re-run the Judge Mode negative path — the three server checks now probe
the live API: 409 SUPERSEDED, 403 RBAC, idempotent `already_applied`.

## 3. What to look for (rubric-aligned)

| Claim | Where to verify |
|---|---|
| Real pixel processing, not filename theatre | `apps/web/src/lib/pixelQuality.ts` + negative-path checks 1, 5, 6 |
| Real image pipeline (hash, dedupe, EXIF strip) | `apps/web/src/lib/images.ts` + negative-path checks 2–4 |
| Honest edge inference (provider labels, abstention) | `apps/web/src/lib/edgeModel.ts`, `docs/MODEL_CARD.md` |
| Advisory safety invariants server-side | `issue_advisory` in `apps/api/app/repository.py` + 7 rejection codes in `test_api_phase2.py` |
| Real persistence (restart survives) | `test_sqlite_persistence_across_restart` |
| Idempotent offline sync | `test_sync_batch_idempotent` + negative-path check 9 |
| Sourced KVK routing + referrals | `/support`, `data/reference/kvk-directory.json` |
| Research grounding | `docs/research-evidence.md`, `data/reference/research-evidence.json` |
| Live public-data proof | `/integrations` snapshot card, `scripts/fetch_public_data.py` |
| Security posture | `apps/api/app/security.py` (demo RBAC, CORS, headers, rate limit), `docs/threat-model.md` |
| Farm Digital Twin + transparent simulator | `/digital-twins/RJ-DEMO-PLOT-118` — "not a biological prediction" |
| Learning flywheel, no auto-training | `/learning`, `LearningRecord.usedInModelVersion = null` |

## 4. Known limitations (stated, not hidden)

`docs/known-limitations.md` — the demo engine is not a trained model; SQLite
is demo-grade; the MobileNetV2 screening file is a drop-in (not bundled);
Marwari/Mewari dialect ASR is not claimed; chemical advisory content stays
locked behind approved expert content.
