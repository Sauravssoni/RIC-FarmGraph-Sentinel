# Implementation Status — Winning Release (Task 002)

Branch: `kimi/farmgraph-winning-release` · Baseline commit: `be12400` (Task 001, pushed to main)

## Baseline audit (Phase A results, 2026-07-20)

| Gate | Result |
|---|---|
| `eslint . --max-warnings 0` | clean (0/0) |
| `tsc --noEmit` (strict) | clean |
| `vitest run` | 26/26 (4 files) |
| `pytest apps/api/tests -q` | 18/18 |
| `next build` | 42 static pages exported |
| `playwright test` | 8/8 (golden loop, provenance, lock, integrations truth, 1440/1024/768/390 no-overflow) |
| Routes | 11 live + 29 prerendered case pages; no dead routes found |
| Mobile 390px | no horizontal overflow (e2e-verified) |

## P0 defects carried from Task 001 (from evaluator-risk review)

1. **Images are not processed.** Capture stores checklist ticks only; no pixel handling, no blob storage, no hash. → Phase B1.
2. **Quality gate is checklist-driven only.** No blur/exposure/coverage measurement. → Phase B2.
3. **Diagnosis is a lookup table.** No pixel inference; no real model. → Phase B3 (classical-CV pixel scorer + optional ONNX screening model, honest labels).
4. **Voice is an affordance.** No recording/playback/storage; no transcription path. → Phase E.
5. **KVK linkage is a card, not a workflow.** → Phase D (sourced directory + referral lifecycle).
6. **Expert corrections vanish.** No learning records, no flywheel surface. → Phase F.
7. **Frontend stays on browser-local state when API present.** Badge must mean something. → Phase G.
8. **No authoritative persistence.** → Phase G (SQLite, labelled single-node demo; repository pattern preserved).
9. **Advisory safety is UI-level.** Needs domain/API enforcement + tests. → Phase H.
10. **No Farm Digital Twin.** → Phase C.
11. **No public live demo URL.** Deployment files + GH Pages workflow; exact external blockers documented. → Phase L.
12. **Runtime-created cases 404 on `/cases/[id]`** (static export). → link-guarded; documented; server build removes it.
13. **No model card / data card / benchmark evidence.** → Phase N.
14. **CI lacks Playwright + scans.** → Phase M.

## Strategy notes (honest trade-offs, recorded up front)

- **Edge model:** Hugging Face is unreachable from this environment; GitHub raw/media works. MobileNetV2-7 ONNX (Apache-2.0, onnx/models zoo) is bundled as an **out-of-distribution screening model** — real deep-learning inference in-browser, honest narrow role (ImageNet has no crop-disease classes; it screens "is this plant material at all"). Crop-disease differential ships as an **interpretable classical-CV pixel-feature scorer** (labelled `EDGE_HEURISTIC`, "research preview — not a trained neural network; no accuracy measured"), with the deterministic rules engine retained as the safety/fallback layer. No accuracy is claimed for any component.
- **Persistence:** SQLite (aiosqlite-free: stdlib `sqlite3` with thread check) — labelled single-node demo; Postgres swap documented behind the repository pattern.
- **Public-data proof:** data.gov.in AGMARKNET connector with a **real cached snapshot** fetched from the public API where reachable, labelled `CACHED PUBLIC DATA`; KVK directory from official institutional sources with check dates.
