# Live Demo Runbook

## Option A — zero-install static demo (recommended for judges)

```bash
npm ci
npm run build --workspace apps/web
python3 -m http.server 4173 --directory apps/web/out
```

Open `http://localhost:4173/demo/` and follow the Judge Mode tabs. The app
runs fully offline after first load (PWA); the in-browser demo provider needs
no backend.

## Option B — full stack with the demo API

```bash
docker compose up --build
# web → http://localhost:3000   api → http://localhost:8000/api/v1/health
```

or without docker:

```bash
pip install -r apps/api/requirements.txt
cd apps/api && uvicorn app.main:app --port 8000        # terminal 1
npm run dev                                            # terminal 2 (or serve the static export)
```

With the API up, the field scan's **Sync now** writes genuinely to the API
(idempotent — watch `already_applied` on repeat), and the Judge Mode server
checks probe live guards. The API persists to SQLite (`data/runtime/fgr.db`);
`POST /api/v1/demo/reset` restores the pristine seed. Set
`NEXT_PUBLIC_API_URL` to point the web app at a non-local API.

## Option C — hosted

- **GitHub Pages**: enable *Settings → Pages → GitHub Actions*; the
  `pages.yml` workflow publishes the static export on every push to `main`.
- **Render**: `render.yaml` blueprint (API free tier runs in honestly-labelled
  in-memory mode).

No URL is claimed live until a maintainer enables one.

## Presenter script (8 minutes)

1. **Command centre** (30 s) — officer's morning view; every KPI drills down.
2. **Judge Mode ①** (3 min) — golden path steps 3→11: quality refusal,
   guided recapture, triage with uncertainty, expert confirm, cluster
   65.5 → 71.5, mission, advisory (chemical LOCKED), follow-up.
3. **Judge Mode ②** (2 min) — run all 9 adversarial checks; narrate that each
   executes the real guard *now*.
4. **Digital twin** (1 min) — `/digital-twins/RJ-DEMO-PLOT-118`, run the
   expert-confirm scenario; stress "not a biological prediction".
5. **Governance** (1 min) — advisory lifecycle, model registry (CHAMPION is a
   research preview, not a trained NN), append-only audit, evidence register.
6. **Reset** — one click restores the deterministic demo; e2e proves it.

## If something goes wrong live

- **API down**: everything except the 3 server checks still works; they print
  the honest fallback. Restart with `uvicorn app.main:app --port 8000`.
- **Stale browser state**: Judge Mode reset button, or clear site data.
- **Fresh machine**: `npm ci` is the only install; Node 20 + Python 3.12.
