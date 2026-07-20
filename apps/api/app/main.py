"""FarmGraph Rakshak Demo API (Task 002).

Deterministic demo backend. ALL data is SIMULATED and labelled as such.
Persistence is a labelled single-node SQLite document store (FGR_PERSIST=memory
disables it); POST /api/v1/demo/reset restores the pristine seed. Demo role
auth via the X-Demo-Role header demonstrates RBAC semantics — there are no
real credentials, and no government integration is live.
"""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI

from .repository import DemoRepository
from .routers import api
from .security import RateLimiter, demo_role, install_security


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.repo = DemoRepository()
    yield


app = FastAPI(
    title="FarmGraph Rakshak Demo API",
    version="0.2.0",
    description=(
        "Deterministic demo API for the FarmGraph Rakshak prototype. "
        "All data is SIMULATED and labelled as such. Persistence is a labelled "
        "single-node SQLite document store (demo-grade, not production). "
        "The diagnosis provider is a rule-based demo engine, NOT a trained model — "
        "no accuracy is claimed. No government adapter is live. "
        "Security controls (X-Demo-Role RBAC, restricted CORS, security headers, "
        "write rate limiting) are DEMO controls demonstrating the intended posture."
    ),
    lifespan=lifespan,
    # Validate the X-Demo-Role header on EVERY route (unknown role → 400).
    dependencies=[Depends(demo_role)],
)

install_security(app, RateLimiter())

app.include_router(api.router)
