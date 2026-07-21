"""FarmGraph Rakshak Demo API (Task 004 release candidate).

Deterministic demo backend. ALL farmer and plot data is SIMULATED and labelled.
Persistence is a labelled single-node SQLite document store (FGR_PERSIST=memory
disables it); POST /api/v1/demo/reset restores the pristine seed. Demo role
auth via the X-Demo-Role header demonstrates RBAC semantics — there are no
real credentials, and no government integration is labelled live without a
successful official operation.
"""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI

from .repository import DemoRepository
from .routers import api, release_api
from .security import RateLimiter, demo_role, install_security


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.repo = DemoRepository()
    app.state.release_evidence = {}
    yield


app = FastAPI(
    title="FarmGraph Rakshak Demo API",
    version="0.4.0-rc1",
    description=(
        "Government-grade connected prototype API for FarmGraph Rakshak. "
        "All farmer and plot records are synthetic demo data. Persistence is a "
        "labelled single-node SQLite document store (demo-grade, not production). "
        "The disease-pattern provider is an interpretable research heuristic, NOT a "
        "validated crop-disease model; no accuracy is claimed. Task 004 adds a "
        "consented evidence-continuity proof from field capture through a KVK "
        "referral pack. Security controls are DEMO controls demonstrating the "
        "intended government deployment posture."
    ),
    lifespan=lifespan,
    dependencies=[Depends(demo_role)],
)

install_security(app, RateLimiter())

app.include_router(api.router)
app.include_router(release_api.router)
