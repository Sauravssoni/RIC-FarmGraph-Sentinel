"""FarmGraph Rakshak Demo API (Task 001).

Deterministic demo backend. ALL data is SIMULATED. Persistence is in-memory
only (documented Task 001 limitation) — restart or POST /api/v1/demo/reset
restores the pristine seed. No government integration is live; no credentials
exist in this service.
"""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .repository import DemoRepository
from .routers import api


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.repo = DemoRepository()
    yield


app = FastAPI(
    title="FarmGraph Rakshak Demo API",
    version="0.1.0",
    description=(
        "Deterministic demo API for the FarmGraph Rakshak prototype. "
        "All data is SIMULATED and labelled as such. Persistence is in-memory only "
        "(documented Task 001 limitation). The diagnosis provider is a rule-based demo "
        "engine, NOT a trained model — no accuracy is claimed. No government adapter is live."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(api.router)
