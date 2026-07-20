"""Demo security layer (Phase H — Task 002).

Clearly-labelled DEMO controls, not production auth:
- X-Demo-Role header selects a persona role; there are no credentials,
  tokens, or sessions. This exists to demonstrate role-based access control
  semantics to evaluators, and every response/docs surface says it is a demo.
- Security headers middleware (nosniff / DENY / no-referrer / no-store).
- A simple in-process write rate limiter (per client IP) to demonstrate
  abuse resistance; limit configurable via FGR_RATE_LIMIT (writes/minute).
- Restricted CORS (explicit dev origins + the GitHub Pages origin) replaces
  the Task 001 wildcard.
"""
from __future__ import annotations

import os
import threading
import time
from typing import Callable

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

ROLES = ("farmer", "field_worker", "expert", "officer", "admin")
# Roles allowed to mutate case data (create cases, submit observations, sync).
WRITE_ROLES = ("farmer", "field_worker", "expert", "officer", "admin")
# Roles allowed to act as the agronomic authority (review, refer, issue advisory).
EXPERT_ROLES = ("expert", "officer", "admin")

ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:4173",
    "https://sauravssoni.github.io",
]


def demo_role(x_demo_role: str | None = Header(default=None)) -> str:
    """Resolve the caller's demo role. Defaults to 'officer' so that the
    pre-existing demo flows (and tests) keep working without a header; an
    explicitly unknown role is rejected."""
    if x_demo_role is None:
        return "officer"
    role = x_demo_role.strip().lower().replace("-", "_")
    if role not in ROLES:
        raise HTTPException(status_code=400, detail=f"Unknown demo role '{x_demo_role}'. Valid: {list(ROLES)}")
    return role


def require_write(role: str = Depends(demo_role)) -> str:
    if role not in WRITE_ROLES:
        raise HTTPException(status_code=403, detail=f"Demo role '{role}' may not write case data")
    return role


def require_expert(role: str = Depends(demo_role)) -> str:
    if role not in EXPERT_ROLES:
        raise HTTPException(
            status_code=403,
            detail=f"Demo role '{role}' may not perform expert/officer actions (review, referral, advisory issue)",
        )
    return role


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        resp = await call_next(request)
        resp.headers.setdefault("X-Content-Type-Options", "nosniff")
        resp.headers.setdefault("X-Frame-Options", "DENY")
        resp.headers.setdefault("Referrer-Policy", "no-referrer")
        resp.headers.setdefault("Cache-Control", "no-store")
        return resp


class RateLimiter:
    """Fixed-window per-IP limiter for mutating requests only."""

    def __init__(self, writes_per_minute: int | None = None) -> None:
        self._default = writes_per_minute or 90
        self._lock = threading.Lock()
        self._hits: dict[str, list[float]] = {}

    def _limit(self) -> int:
        return int(os.environ.get("FGR_RATE_LIMIT", str(self._default)))

    async def __call__(self, request: Request) -> None:
        if request.method not in ("POST", "PUT", "PATCH", "DELETE"):
            return
        ip = request.client.host if request.client else "unknown"
        now = time.monotonic()
        with self._lock:
            bucket = [t for t in self._hits.get(ip, []) if now - t < 60.0]
            if len(bucket) >= self._limit():
                retry = int(60.0 - (now - bucket[0])) + 1
                raise HTTPException(
                    status_code=429,
                    detail=f"Demo write rate limit exceeded ({self._limit()} writes/minute). Retry later.",
                    headers={"Retry-After": str(retry)},
                )
            bucket.append(now)
            self._hits[ip] = bucket


def install_security(app: FastAPI, rate_limiter: RateLimiter | None = None) -> None:
    """Install CORS restrictions, security headers and (optionally) the write
    rate limiter as router-level dependencies are declared per-endpoint."""
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS,
        allow_credentials=False,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type", "X-Demo-Role"],
    )
    if rate_limiter is not None:
        app.state.rate_limiter = rate_limiter
