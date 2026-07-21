# FarmGraph Rakshak — Evaluator Guide

## The fastest way to judge the prototype

FarmGraph Rakshak is an offline-first crop-health and outbreak-response prototype for Rajasthan’s bajra, mustard, guar and cumin workflows. The product is intentionally honest: demo data is labelled, model limitations are explicit, no score is called accuracy and no government integration is shown as live without verified access.

### Recommended path: five proof acts in three minutes

Open `/demo/` and stay on **Primary evaluator proof**.

1. **See the operational picture** — open the command centre and identify the highest-priority field, cluster and decision queue.
2. **Prove evidence quality before AI** — one action rejects a weak capture, guides recapture, restores sync and routes the usable report through honest triage.
3. **Put the expert in control** — a structured expert decision confirms the case and strengthens the nearby outbreak signal.
4. **Coordinate the field response** — generate a representative mission and issue only the approved, versioned non-chemical advisory.
5. **Close the loop and learn safely** — record improvement, preserve the audit chain and create governed learning evidence without automatic retraining.

The screen exposes one primary action per act. Technical and governance depth remains available through the linked operational pages without interrupting the story.

## Dashboard evaluation

Open `/command-centre/` and look for:

- one dominant Rajasthan pilot map;
- four decision-oriented metrics rather than a wall of KPIs;
- a clear **What needs action now** rail;
- explicit expert, mission, sync and KVK delivery state;
- advanced filters hidden behind **Refine map view**;
- direct drill-down from every metric and priority item;
- clear simulated-data and provider-state labels.

The command centre is designed to answer one government operating question: **where should the next response happen, and why?**

## Deeper technical proof

### Stress tests

In `/demo/`, open **Stress tests**. These checks execute real client-side guards for poor images, duplicates, wrong file types, corrupt payloads, crop-unsupported patterns and non-plant frames. Server-side checks either call the API or show an explicit degraded-state message.

### Government infrastructure

Open **Government infrastructure** to inspect IMD, Bhashini, AGMARKNET/data.gov.in, KVK and authority-gated Rajasthan/AgriStack contracts. Each state is labelled live, cached, public-directory, credentials-required or awaiting authority.

### Connected evidence continuity

Open `/release-proof/` with the FastAPI service configured. The proof preserves consent, image hash, image-quality result, edge-provider metadata, voice hash, confirmed transcript, authoritative case, nearest-KVK referral and downloadable referral pack.

## Local verification commands

```bash
npm ci
npm run lint
npm run typecheck
npm run test
cd apps/api && python3 -m pytest tests/ -q
cd ../..
npm run e2e
npm run e2e:connected
npm run e2e:subpath
```

The last recorded full local baseline before this evaluator-experience refactor was 86 Vitest, 65 Pytest, 15 standard Playwright and 19 Pages-subpath Playwright tests. The refactor updates the affected Playwright selectors and must be rerun when the GitHub Actions account lock is removed.

## Claims the evaluator can verify directly

| Claim | Evidence |
|---|---|
| Real pixel processing and recapture guidance | `apps/web/src/lib/pixelQuality.ts`, field scan, Stress tests |
| Image re-encoding, hash and duplicate detection | `apps/web/src/lib/images.ts` |
| Honest provider identity, uncertainty and abstention | `apps/web/src/lib/edgeModel.ts`, `docs/MODEL_CARD.md` |
| Expert-controlled consequential decisions | Expert desk, case timeline, review APIs |
| Explainable outbreak scoring | Outbreak page and cluster breakdown |
| Safe advisory invariants | API repository tests and locked chemical section |
| Offline draft and idempotent sync | Field workflow, sync tests |
| Sourced KVK routing and referral packs | Support desk and KVK reference directory |
| Farm Digital Twin | `/digital-twins/RJ-DEMO-PLOT-118/` |
| Governed learning without auto-training | `/learning/`, model lifecycle and learning records |

## Known limitations

- The current disease-pattern scorer is a transparent research heuristic with no measured field accuracy.
- MobileNetV2 is used only for broad out-of-distribution screening.
- Marwari/Mewari voice recordings are supported, but dialect ASR is not claimed.
- Farmer, field and outcome data in the repository are synthetic.
- Demo RBAC and persistence are not production infrastructure.
- Government integrations remain truthfully labelled until credentials or authority are granted.
