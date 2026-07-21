"""Labelled demonstration security controls for FarmGraph Rakshak.

These controls demonstrate the intended government deployment posture; they
are not RajSSO and do not create real authentication. Production deployments
must replace X-Demo-Role with authority-managed identity and sessions.
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
WRITE_ROLES = ("farmer", "field_worker", "expert", "officer", "admin")
EXPERT_ROLES = ("expert", "officer", "admin")

DEFAULT_ALLOWED_ORIGINS = (
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
    "https://sauravssoni.github.io",
)


def allowed_origins() -> list[str]:
    """Return an explicit CORS allowlist.

    FGR_ALLOWED_ORIGINS is a comma-separated deployment setting. Wildcards are
    deliberately unsupported: the production frontend URL must be named
    exactly, preventing a preview or unrelated origin from silently gaining
    write access to the demo API.
    """
    configured = [
        value.strip().rstrip("/")
        for value in os.environ.get("FGR_ALLOWED_ORIGINS", "").split(",")
        if value.strip()
    ]
    return list(dict.fromkeys([*DEFAULT_ALLOWED_ORIGINS, *configured]))


def demo_role(x_demo_role: str | None = Header(default=None)) -> str:
    """Resolve the caller's demo persona role.

    Missing headers default to officer so the deterministic judge demo remains
    usable. Explicitly unknown roles are rejected. This is not authentication.
    """
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
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        response.headers.setdefault("Cache-Control", "no-store")
        response.headers.setdefault("Cross-Origin-Resource-Policy", "same-site")
        return response


class RateLimiter:
    """Fixed-window per-IP limiter for mutating requests only."""

    def __init__(self, writes_per_minute: int | None = None) -> None:
        self._default = writes_per_minute or 90
        self._lock = threading.Lock()
        self._hits: dict[str, list[float]] = {}

    def _limit(self) -> int:
        try:
            return max(1, int(os.environ.get("FGR_RATE_LIMIT", str(self._default))))
        except ValueError:
            return self._default

    async def __call__(self, request: Request) -> None:
        if request.method not in ("POST", "PUT", "PATCH", "DELETE"):
            return
        ip = request.client.host if request.client else "unknown"
        now = time.monotonic()
        with self._lock:
            bucket = [timestamp for timestamp in self._hits.get(ip, []) if now - timestamp < 60.0]
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
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins(),
        allow_credentials=False,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type", "X-Demo-Role"],
        expose_headers=["Retry-After"],
        max_age=600,
    )
    if rate_limiter is not None:
        app.state.rate_limiter = rate_limiter
