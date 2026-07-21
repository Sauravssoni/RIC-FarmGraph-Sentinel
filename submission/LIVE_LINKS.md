# FarmGraph Rakshak — Live Link Register

This file must be updated only after a URL has been opened in a clean incognito browser and the relevant path returns successfully.

## Repository

- Repository: https://github.com/Sauravssoni/RIC-FarmGraph-Sentinel
- Final-release PR: https://github.com/Sauravssoni/RIC-FarmGraph-Sentinel/pull/1
- Release branch: https://github.com/Sauravssoni/RIC-FarmGraph-Sentinel/tree/kimi/farmgraph-winning-release

## Public application

| Link | Status | Verification required |
|---|---|---|
| Frontend | **PENDING DEPLOYMENT VERIFICATION** | Root and `/command-centre/` return 200 |
| Judge Mode | **PENDING DEPLOYMENT VERIFICATION** | `/demo/` loads and reset works |
| Connected Evidence Proof | **PENDING CONNECTED DEPLOYMENT** | `/release-proof/` reaches the configured API |
| API health | **PENDING API DEPLOYMENT** | `/api/v1/release/health` returns 200 |
| OpenAPI | **PENDING API DEPLOYMENT** | `/docs` loads |
| CI run | **BLOCKED — GITHUB ACCOUNT BILLING LOCK** | Every job executes nonzero steps and passes |
| Submission release tag | **PENDING MERGE** | Tag points to final `main` commit |

## Expected hosting paths

### Vercel

The connected GitHub project is named `ric-farm-graph-sentinel-web`. Do not publish an expected domain as verified until Vercel reports success and it has been opened independently.

### Render

The blueprint defines:

- `farmgraph-rakshak-api`
- `farmgraph-rakshak-web`

After creation:

- set web `NEXT_PUBLIC_API_URL` to the API origin;
- set API `FGR_ALLOWED_ORIGINS` to the exact web origin;
- verify the connected release page.

### GitHub Pages

Expected project-site shape after merge and Pages deployment:

`https://sauravssoni.github.io/RIC-FarmGraph-Sentinel/`

This is not a verified live link until the Pages workflow succeeds.

## Public verification checklist

- [ ] Homepage returns 200.
- [ ] Command Centre loads without console errors.
- [ ] Judge Mode golden path works.
- [ ] ONNX model, label file and WASM return 200.
- [ ] Service worker installs.
- [ ] Offline reload works after first load.
- [ ] Field image processing works.
- [ ] Voice recording works on Android Chrome.
- [ ] API release health returns 200.
- [ ] Frontend badge shows connected only when the API responds.
- [ ] Connected image and voice uploads succeed.
- [ ] KVK pack v2 downloads.
- [ ] No request targets `localhost` in production.
- [ ] CORS origin is exact and no wildcard is configured.
- [ ] Demo reset works.
- [ ] All government/public source states remain truthful.
