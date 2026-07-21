"""Shared pytest environment for the API suite.

FGR_PERSIST=memory keeps every test on the in-memory path (no SQLite files),
and a high default write-rate limit keeps the suite deterministic; the
rate-limit behaviour itself is covered by a dedicated test that overrides it.
"""
import os

os.environ.setdefault("FGR_PERSIST", "memory")
os.environ.setdefault("FGR_RATE_LIMIT", "100000")
