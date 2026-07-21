# Task 004 — Final Submission Release Status

**Project:** FarmGraph Rakshak  
**Competition:** Rajasthan Innovation Challenge — AI-Based Crop Disease & Pest Detection for Smallholder Farmers  
**Applicant:** Syntheon Technology Private Limited · DPIIT DIPP213187  
**Branch:** `kimi/farmgraph-winning-release`  
**PR:** #1 into `main`  
**Status date:** 21 July 2026

## Release objective

Convert the Task 003 government-systems prototype into a publicly verifiable submission release with evidence continuity, connected demonstration proof, accurate release claims, deployment configuration and a complete evaluator package.

## Implemented in Task 004

### Connected evidence continuity

The connected API can now preserve, in one idempotent handoff:

- consent reference;
- EXIF-stripped image evidence reference;
- SHA-256 image hash;
- measurable pixel-quality result;
- edge provider, provider kind, version and runtime;
- top pattern, raw score, uncertainty and abstention state;
- real voice-evidence reference and hash;
- transcript provider/state/service ID;
- response hash where returned;
- human confirmation/edit state;
- case timeline events;
- KVK referral and SLA;
- `kvk-referral-pack/v2`.

Routes:

- `GET /api/v1/release/health`
- `POST /api/v1/release/evidence`
- `POST /api/v1/release/handoff`
- `GET /api/v1/release/cases/{case_id}`

### Connected judge proof

`/release-proof/` allows an evaluator to:

1. acknowledge consent;
2. select a real image;
3. execute image re-encoding, hashing and pixel-quality analysis;
4. execute the research edge scorer and optional MobileNetV2 OOD screen;
5. record and retain a real voice note;
6. request Bhashini Hindi transcription when configured, or enter a human-confirmed transcript;
7. upload both evidence objects;
8. create an authoritative connected case;
9. generate a nearest-KVK referral and downloadable pack;
10. inspect all evidence metadata and audit continuity.

### New release gates

- Three API tests cover the complete evidence chain, consent mismatch, evidence MIME validation and role restrictions.
- One dedicated Playwright suite starts Next.js and FastAPI together and tests browser CORS, multipart evidence upload, handoff, persistence, referral-pack generation and idempotent replay.
- The connected spec is excluded from standalone/static and GitHub Pages suites.

### Deployment hardening

- Vercel monorepo commands added at `apps/web/vercel.json`.
- API CORS now uses an explicit allowlist and comma-separated `FGR_ALLOWED_ORIGINS` deployment variable; wildcard origins are not supported.
- Render blueprint updated for the release health endpoint, connected frontend/API variables and government credentials.
- README and PR metadata updated to Task 004 release truth.

## Recorded quality baseline

The last complete local verification before Task 004 additions reported:

| Gate | Result |
|---|---:|
| Vitest | 86 passed |
| Pytest | 65 passed |
| Standard Playwright | 15 passed |
| GitHub Pages subpath Playwright | 19 passed |
| TypeScript / ESLint | clean |
| Static export | 73 pages |

Task 004 adds:

- 3 API tests;
- 1 connected browser-to-API E2E test;
- one additional static route (`/release-proof/`).

These additions are committed, but remote execution is not yet independently verified because GitHub currently prevents jobs from starting at the account level.

## External release blockers

### GitHub Actions

Every job is created but executes zero steps. GitHub reports an account-level billing lock. This affects the historical `main` run as well as the release branch and cannot be fixed through source changes.

Required owner action:

1. resolve the account lock in GitHub billing;
2. rerun the latest `quality-gates` workflow;
3. confirm nonzero steps for web, API, static E2E, connected E2E, subpath E2E and security scan.

### Public hosting

Vercel deployments are currently reported as failed/pending. The source now contains monorepo-aware build commands, but the private Vercel build log and project settings require owner access.

Reliable alternative:

1. create the two services from `render.yaml`;
2. set web `NEXT_PUBLIC_API_URL`;
3. set API `FGR_ALLOWED_ORIGINS` to the exact web origin;
4. deploy;
5. verify `/release-proof/` and `/api/v1/release/health`.

### Government credentials/authority

- Bhashini: credentials required for a live PoC call.
- IMD: source currently returns IP-whitelist-required evidence.
- data.gov.in / AGMARKNET: API key required for live refresh.
- Raj Kisan, AgriStack, RajSSO, Jan Aadhaar, e-Dharti/ULPIN and Soil Health Card: authority or sandbox access required.

The prototype remains fully demonstrable with honest degraded states; none of these is represented as live when unavailable.

## Release gates remaining before merge

- [ ] GitHub Actions jobs execute and pass.
- [ ] Public frontend returns 200.
- [ ] Public API release health returns 200.
- [ ] `NEXT_PUBLIC_API_URL` and CORS origin match.
- [ ] Public connected proof succeeds.
- [ ] Mobile Chrome verification completed.
- [ ] Final proposal and pitch PDFs attached to the submission.
- [ ] Application answers copied into Rajasthan SSO portal.
- [ ] PR merged to `main`.
- [ ] Submission release tagged.

## Strict evaluator position

The system design, safety, KVK workflow and government interoperability are competition-leading. The principal technical limitation remains the absence of a field-validated crop-disease neural model. The submission therefore positions the current vision layer as an honest, replaceable research component inside a much stronger government outbreak-response operating system.
