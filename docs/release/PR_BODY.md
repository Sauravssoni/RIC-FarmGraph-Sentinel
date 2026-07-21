# FarmGraph Rakshak — Task 002: from simulated prototype to genuinely real

13 commits, every quality gate green at every step. Full report: `docs/release/TASK002_COMPLETION_REPORT.md`.

## What changed

- **Real pixel CV**: pixel-quality engine (blur/brightness/contrast/exposure/ExG) + pixfeat-v0 interpretable scorer (published weights) + **bundled MobileNetV2-7 ONNX running real in-browser inference** (onnxruntime-web, non-threaded wasm so it works on GitHub Pages). Provider identity labels everywhere; abstention with reasons; no score is ever called accuracy.
- **Real image pipeline**: validation, downscale, EXIF-strip by re-encode, SHA-256, duplicate detection, IndexedDB evidence store.
- **Farm Digital Twin**: 29 twin pages + compute-only scenario simulator ("not a biological prediction").
- **KVK support layer**: 6 sourced KVKs, nearest-KVK routing, referral lifecycle, last-mile coverage.
- **Voice**: consented record/playback/delete, labelled hi-IN dictation, TTS guidance.
- **Learning flywheel**: expert-verified learning records, balance dashboards, model lifecycle — no auto-training.
- **Authoritative backend**: SQLite persistence surviving restarts, 16 new endpoints (referrals, learning, twins, advisory-issue, sync, evidence, public-data, audit), idempotent sync, 7 advisory safety invariants, demo RBAC + CORS + headers + rate limiting.
- **Judge Mode**: 12-step golden path + 9 live adversarial checks.
- **Public-data proof**: live-fetched World Bank + Open-Meteo snapshot served CACHED; data.gov.in honestly KEY_REQUIRED.
- **Deployment & CI**: docker-compose, Dockerfiles, GH Pages workflow, render.yaml; CI now runs Playwright e2e (14 tests) + advisory security scans.
- **Evidence package**: MODEL_CARD, DATA_CARD, EVALUATOR_GUIDE, LIVE_DEMO, RESPONSIBLE_AI.

## Gates

52 vitest · 33 pytest · 14 Playwright e2e · strict tsc · eslint 0 warnings · deterministic seed · 73-page static export — all green.

## Honesty statement

No government adapter is live; no trained crop-disease model is claimed; the demo engine's scores remain labelled SIMULATED; security controls are labelled demo-grade. Known gaps are listed in the completion report.
