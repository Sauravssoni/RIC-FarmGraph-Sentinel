# Deployment Notes (Task 001 prototype)

## What ships

- **Web**: static export (`apps/web/out/`) — any static host works (state NIC hosting, S3-style object storage, or a simple nginx). No server runtime, no secrets.
- **API (optional)**: FastAPI demo provider (`apps/api`) for integration review; in-memory deterministic repository. Not required for the demo — the web app detects it via `/health` and falls back to the in-browser provider with a visible badge.

## Local production run

```bash
npm ci
npm run build --workspace apps/web
python3 -m http.server 8080 --directory apps/web/out     # http://localhost:8080/command-centre/
# optional API:
pip install -r apps/api/requirements.txt
uvicorn app.main:app --app-dir apps/api --port 8000
```

## Environment

See `.env.example` in this directory. The only variable is the optional API base URL.

## Production hardening checklist (Task 002+)

1. Postgres behind the repository pattern; server-authoritative sync.
2. RajSSO-backed authn/z; close CORS to known origins.
3. TLS + HSTS at the state hosting edge; CSP headers (static export makes a strict CSP easy).
4. CI: run the exact quality gates from the README on every merge.
5. SBOM + dependency scanning; signed releases.
