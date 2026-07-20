# Architecture — Task 001

## Shape

```
┌────────────────────────────── apps/web (Next.js 15, static export, PWA) ──┐
│  /command-centre /field/scan /cases /cases/[id] /expert /outbreaks        │
│  /missions /governance /integrations /demo                                 │
│                                                                            │
│  DemoStore (browser) ── seed.json + localStorage overlay                   │
│  engine.ts (deterministic triage/outbreak/queue/mission logic)             │
│  Dexie: drafts + outbox   ·   SW: shell + runtime caches                   │
│  httpProvider: typed reads from API when reachable (badge shows mode)      │
└────────────────────────────────────────────────────────────────────────────┘
                 ▲ optional (auto-detected, graceful fallback)
┌────────────────────────────── apps/api (FastAPI, pydantic v2) ────────────┐
│  18 endpoints · DemoRepository (in-memory, deterministic, documented)      │
│  engine.py — mirrors engine.ts exactly                                     │
└────────────────────────────────────────────────────────────────────────────┘
                 ▲ both load the same single source of truth
        data/demo: policy.json · taxonomy.json · integrations.json · seed.json
        packages/contracts: TS domain types (mirrored by pydantic models)
```

## The dual-engine decision (why there are two engines)

The demo must run in two situations: (a) on a judge's laptop with no backend, and (b) against a real HTTP API for integration review. Rather than fake one of them, **the same deterministic engine exists in TypeScript and Python**, driven by the same `policy.json` + `taxonomy.json`. Contract tests pin identical outputs on both sides:

- bajra + pale streaking → `downy_mildew 0.62 / nutrient_n 0.27 / unknown 0.11`, margin 0.35, routing `expert`.
- Cluster CL-2601 scores **65.5 (SUSPECTED)** seeded and **71.5 (VERIFIED)** after the golden confirmation.
- Capture quality gate: coverage = weighted checklist, pass requires close-up + ≥1 secondary view + lighting + coverage ≥ 0.6.

If the two engines ever disagree, that is a test failure, not a judgement call.

## Data flow (golden loop)

1. **Capture** — form validated by zod; checklist drives `captureQuality()`; failure → `NEEDS_RECAPTURE` with explicit recapture requests; success → `READY_FOR_TRIAGE`.
2. **Offline** — with connectivity down, the case bundle is enqueued (Dexie outbox), `pendingSync=true`, pending chip increments; on sync the item is removed and an audit event records it.
3. **Triage** — `diagnose()` looks up crop:symptom in the taxonomy table, applies the missing-views penalty, computes margin, and routes `autonomous | expert | abstain` by policy thresholds. High-spread candidates never auto-close.
4. **Expert** — queue ordered by `expertPriority()`; decisions mutate case state and re-score any cluster containing the case.
5. **Outbreak** — `outbreakScore()` = Σ(weight × component) − duplicate penalty, mapped through thresholds; explanation string names the top contributing components.
6. **Mission** — one open mission per cluster (409-style guard); representative order = unverified members first, then nearest to cluster centre (haversine).
7. **Advisory** — only `APPROVED` advisories issue; chemical block renders locked regardless of status.
8. **Follow-up / outcome** — `not_improving` escalates back to expert; `resolved` writes an outcome record.
9. **Audit** — every mutation appends a timeline event to the case and an audit event to the global stream; nothing is edited in place.

## Key technical choices

| Choice | Reason | Trade-off accepted |
|---|---|---|
| Static export (`output: "export"`) | Judges can open the demo anywhere; no server needed | Runtime-created cases have no prerendered detail page (register guards links) — documented |
| In-memory API repository | Determinism and zero-setup for review | Documented limitation; repository pattern isolates the swap to Postgres in Task 002 |
| localStorage overlay on seed | Refresh-proof demo without a database | Overlay keyed to `demoNow`; stale overlays auto-discarded |
| Hand-rolled service worker | Transparent, demo-grade caching | Not Workbox; cache versions are manual (`fgr-shell-v1`) |
| Natural Earth outline only | Licence-clean geo (public domain) | No district polygons; HQs as labelled reference points |

## Failure modes designed for

- **Storage blocked/full** — demo continues in memory; banner-free degradation.
- **API unreachable** — badge flips to `demo-provider`; all reads served locally.
- **Corrupt overlay** — caught, discarded, pristine seed loaded.
- **Duplicate mission** — guard returns conflict; UI shows the existing mission.
