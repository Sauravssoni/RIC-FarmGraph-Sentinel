"""AGMARKNET mandi-price connector via data.gov.in (Task 003 Phase 2D).

Rajasthan only, four pilot crops (bajra, mustard, guar, cumin) with
data-driven commodity aliases (data/reference/agmarknet-crop-aliases.json).

States (exact): LIVE_MANDI_DATA, CACHED_MANDI_DATA, MANDI_CREDENTIALS_REQUIRED,
MANDI_PRODUCT_UNAVAILABLE, MANDI_STALE_CACHE, NO_MANDI_DATA_FOR_CROP.

Honesty rules:
  * data.gov.in requires a free API key — without DATAGOV_API_KEY the state is
    MANDI_CREDENTIALS_REQUIRED and no data is fabricated.
  * The bundled agmarknet-sample-rajasthan.json is a labelled SAMPLE SHAPE
    (awaiting first keyed capture) — never reported as CACHED_MANDI_DATA. A
    real CACHED_MANDI_DATA file only ever comes from an actual keyed fetch.
"""
from __future__ import annotations

import hashlib
import json
import os
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Optional

STATE_LIVE = "LIVE_MANDI_DATA"
STATE_CACHED = "CACHED_MANDI_DATA"
STATE_CREDS = "MANDI_CREDENTIALS_REQUIRED"
STATE_PRODUCT = "MANDI_PRODUCT_UNAVAILABLE"
STATE_STALE = "MANDI_STALE_CACHE"
STATE_NO_DATA = "NO_MANDI_DATA_FOR_CROP"

DEFAULT_RESOURCE_ID = "9ef84268-d588-465a-a308-a864a43d0070"  # documented AGMARKNET current daily mandi prices
STALE_AFTER_SEC = 72 * 3600
REF_DIR = Path(__file__).resolve().parents[3] / "data" / "reference"
PILOT_CROPS = ("bajra", "mustard", "guar", "cumin")

GetTransport = Callable[[str, float], tuple[int, str]]


def _urllib_get(url: str, timeout: float) -> tuple[int, str]:
    req = urllib.request.Request(url, headers={"User-Agent": "FarmGraph-Rakshak-integration/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:  # noqa: S310 (official endpoint only)
        return resp.status, resp.read().decode(errors="replace")


class AgmarknetAdapter:
    def __init__(self, env: Optional[dict[str, str]] = None, transport: Optional[GetTransport] = None,
                 ref_dir: Path = REF_DIR):
        env = env if env is not None else os.environ
        self.api_key = env.get("DATAGOV_API_KEY") or env.get("DATAGOVIN_API_KEY", "")
        self.resource_id = env.get("AGMARKNET_RESOURCE_ID", DEFAULT_RESOURCE_ID)
        self.timeout = float(env.get("AGMARKNET_TIMEOUT_SEC", "15"))
        self.transport: GetTransport = transport or _urllib_get
        self.ref_dir = Path(ref_dir)
        aliases_doc = json.loads((self.ref_dir / "agmarknet-crop-aliases.json").read_text(encoding="utf-8"))
        self.aliases: dict[str, list[str]] = aliases_doc["aliases"]

    # ---------------- fetch ----------------
    def _fetch_live(self, commodity: str) -> dict[str, Any]:
        if not self.api_key:
            return {"state": STATE_CREDS, "detail": "DATAGOV_API_KEY not configured — get a free key from data.gov.in"}
        params = {
            "api-key": self.api_key, "format": "json", "limit": "50",
            "filters[state]": "Rajasthan", "filters[commodity]": commodity,
        }
        url = f"https://api.data.gov.in/resource/{self.resource_id}?{urllib.parse.urlencode(params)}"
        try:
            status, body = self.transport(url, self.timeout)
        except (urllib.error.URLError, OSError, TimeoutError) as exc:
            return {"state": STATE_PRODUCT, "detail": f"data.gov.in unreachable: {exc}"}
        if status in (401, 403):
            return {"state": STATE_CREDS, "detail": f"data.gov.in rejected the key (HTTP {status})"}
        if status != 200:
            return {"state": STATE_PRODUCT, "detail": f"data.gov.in HTTP {status}"}
        try:
            doc = json.loads(body)
        except json.JSONDecodeError:
            return {"state": STATE_PRODUCT, "detail": "non-JSON response"}
        return {"state": STATE_LIVE, "records": doc.get("records") or [],
                "fetchedAt": datetime.now(timezone.utc).isoformat(timespec="seconds")}

    def _cached(self) -> Optional[dict[str, Any]]:
        """A REAL keyed capture — only agmarknet-cached-rajasthan.json counts
        (the bundled sample shape is excluded by name)."""
        path = self.ref_dir / "agmarknet-cached-rajasthan.json"
        if not path.exists():
            return None
        try:
            doc = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return None
        fetched_at = doc.get("fetchedAt")
        age = None
        if fetched_at:
            try:
                age = (datetime.now(timezone.utc) - datetime.fromisoformat(fetched_at)).total_seconds()
            except ValueError:
                age = None
        state = STATE_CACHED if (age is not None and age <= STALE_AFTER_SEC) else STATE_STALE
        return {"state": state, "records": doc.get("records") or [], "cacheAgeSec": age,
                "fetchedAt": fetched_at, "source": path.name}

    def _sample(self) -> dict[str, Any]:
        return json.loads((self.ref_dir / "agmarknet-sample-rajasthan.json").read_text(encoding="utf-8"))

    # ---------------- normalisation ----------------
    @staticmethod
    def _normalise(records: list[dict[str, Any]], crop: str, *, state: str,
                   fetched_at: str | None, cache_age: float | None, provenance: str) -> dict[str, Any]:
        quotes = []
        for r in records:
            try:
                quotes.append({
                    "mandi": r.get("market"),
                    "district": r.get("district"),
                    "state": r.get("state"),
                    "crop": crop,
                    "commodityLabel": r.get("commodity"),
                    "variety": r.get("variety"),
                    "arrivalDate": r.get("arrival_date"),
                    "minPriceInrQuintal": float(r.get("min_price") or 0) or None,
                    "modalPriceInrQuintal": float(r.get("modal_price") or 0) or None,
                    "maxPriceInrQuintal": float(r.get("max_price") or 0) or None,
                    "unit": "INR/quintal",
                    "marketType": "APMC mandi (AGMARKNET)",
                })
            except (TypeError, ValueError):
                continue
        raw = json.dumps(records, sort_keys=True).encode()
        return {
            "crop": crop, "state": state, "quotes": quotes,
            "recordCount": len(quotes),
            "fetchedAt": fetched_at,
            "cacheAgeSec": round(cache_age) if cache_age is not None else None,
            "responseHash": hashlib.sha256(raw).hexdigest(),
            "source": "data.gov.in AGMARKNET current daily mandi prices",
            "attribution": "Source: AGMARKNET via data.gov.in (Open Government Data Platform, Government of India)",
            "provenance": provenance,
        }

    # ---------------- public contract ----------------
    def mandi_prices(self, crop: str, district: Optional[str] = None) -> dict[str, Any]:
        crop = crop.lower()
        if crop not in PILOT_CROPS:
            return {"state": STATE_NO_DATA, "crop": crop,
                    "detail": f"mandi mapping exists only for pilot crops {list(PILOT_CROPS)} (Rajasthan)",
                    "quotes": []}
        alias = self.aliases.get(crop, [crop])[0]

        live = self._fetch_live(alias)
        if live["state"] == STATE_LIVE:
            records = [r for r in live["records"] if (r.get("state") or "").lower() == "rajasthan"]
            if district:
                records = [r for r in records if (r.get("district") or "").lower() == district.lower()]
            if not records:
                return {"state": STATE_NO_DATA, "crop": crop,
                        "detail": f"no AGMARKNET records for {alias} in Rajasthan{('/' + district) if district else ''} on latest arrival date",
                        "quotes": [], "attribution": "Source: AGMARKNET via data.gov.in (Open Government Data Platform, Government of India)"}
            return self._normalise(records, crop, state=STATE_LIVE, fetched_at=live["fetchedAt"],
                                   cache_age=None, provenance="LIVE keyed data.gov.in AGMARKNET fetch")

        cached = self._cached()
        if cached:
            records = cached["records"]
            alias_lc = {a.lower() for a in self.aliases.get(crop, [crop])}
            records = [r for r in records if (r.get("commodity") or "").lower() in alias_lc]
            if district:
                records = [r for r in records if (r.get("district") or "").lower() == district.lower()]
            if records:
                return self._normalise(records, crop, state=cached["state"],
                                       fetched_at=cached["fetchedAt"], cache_age=cached["cacheAgeSec"],
                                       provenance=f"CACHED keyed capture ({cached['source']})")

        # labelled SAMPLE SHAPE — demonstrates the contract, never CACHED_MANDI_DATA
        sample = self._sample()
        alias_lc = {a.lower() for a in self.aliases.get(crop, [crop])}
        records = [r for r in sample["records"] if (r.get("commodity") or "").lower() in alias_lc]
        if district:
            records = [r for r in records if (r.get("district") or "").lower() == district.lower()]
        out = self._normalise(records, crop, state=live["state"], fetched_at=None, cache_age=None,
                              provenance="SAMPLE SHAPE — awaiting first keyed capture (not official data)")
        out["stateDetail"] = live["detail"]
        out["activationNote"] = "Set DATAGOV_API_KEY on the API host (free from data.gov.in) — see docs/integrations/agmarknet.md"
        out["officialSourceReference"] = f"https://api.data.gov.in/resource/{self.resource_id}"
        return out
