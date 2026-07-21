# Deployment Notes (Task 002)

## What ships

- **Web**: static export (`apps/web/out/`) — any static host works (state NIC hosting, S3-style object storage, GitHub Pages, or the included nginx image). No server runtime, no secrets.
- **API (optional)**: FastAPI demo provider (`apps/api`) with a labelled single-node SQLite document store. Not required for the demo — the web app detects it via `/health` and falls back to the in-browser provider with an honest badge.

## Honest deployment status

| Artifact | Purpose | Status |
|---|---|---|
| `docker-compose.yml` | One-command local stack (web + API + persistent demo volume) | ready — tested locally |
| `apps/api/Dockerfile` | API image (python 3.12-slim, healthcheck) | ready |
| `apps/web/Dockerfile` + `nginx.conf` | Static web image | ready |
| `.github/workflows/pages.yml` | GitHub Pages deploy of the web demo on push to `main` | ready — activates when Pages is enabled in repo settings |
| `render.yaml` | Optional Render blueprint (API free tier runs `FGR_PERSIST=memory` — honestly labelled in the file) | ready — not provisioned by us |

Nothing is claimed live that is not: no public URL is printed anywhere until a maintainer actually enables one.

## One-command local stack

```bash
docker compose up --build
# web → http://localhost:3000  ·  api → http://localhost:8000/api/v1/health
```

The compose stack mounts a named volume for the API's SQLite demo store, so
reviews/referrals/learning records survive container restarts.

## Local production run (no docker)

```bash
npm ci
npm run build --workspace apps/web
python3 -m http.server 8080 --directory apps/web/out     # http://localhost:8080/command-centre/
# optional API:
pip install -r apps/api/requirements.txt
uvicorn app.main:app --app-dir apps/api --port 8000
```

## GitHub Pages

1. Repo **Settings → Pages → Source: GitHub Actions**.
2. Push to `main` — `.github/workflows/pages.yml` builds with
   `NEXT_PUBLIC_BASE_PATH=/<repo-name>` and deploys `apps/web/out`.
3. The Pages build is the same simulated demo; the API is not deployed by
   that workflow (use `render.yaml` or any container host for a demo API,
   then set `NEXT_PUBLIC_API_URL`).

## Environment

See `infra/.env.example`. All variables are optional; the web app runs fully
offline from its bundled deterministic seed.

## Production hardening checklist (pilot phase)

1. Managed Postgres behind the repository pattern; server-authoritative sync (the SQLite store is demo-grade by design).
2. RajSSO-backed authn/z replacing the X-Demo-Role demo header; close CORS to known origins.
3. TLS + HSTS at the state hosting edge; CSP headers (static export makes a strict CSP easy).
4. CI: quality gates + Playwright smoke run on every merge (see `.github/workflows/ci.yml`).
5. SBOM + dependency scanning; signed releases.
