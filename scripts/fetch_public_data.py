#!/usr/bin/env python3
"""Live public-data connector (Task 002, Phase J).

Fetches genuinely live, no-key public data and writes a versioned snapshot to
data/reference/public-data-snapshot.json. Every source records its own status:

  LIVE_FETCHED  — retrieved over the network at snapshot time (fetchedAt recorded)
  KEY_REQUIRED  — endpoint needs a free API key we do not ship (data.gov.in)
  UNREACHABLE   — attempted but the network/source failed (error recorded)

Honesty rules:
- Nothing is paraphrased into a claim of government integration. The snapshot
  is CONTEXT DATA for evaluators (macro indicators + live weather at the demo
  plot), not an operational feed.
- The web app and API serve the snapshot with a CACHED label and its
  fetchedAt timestamp; they never imply live freshness beyond it.

Usage:  python3 scripts/fetch_public_data.py
        DATAGOVIN_API_KEY=... python3 scripts/fetch_public_data.py   # enables AGMARKNET attempt
"""
from __future__ import annotations

import json
import os
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
OUT = REPO_ROOT / "data" / "reference" / "public-data-snapshot.json"
TIMEOUT = 25

WB_BASE = "https://api.worldbank.org/v2/country/IND/indicator/{ind}?format=json&date=2019:2024&per_page=6"
WB_INDICATORS = {
    "AG.LND.AGRI.ZS": "Agricultural land (% of land area)",
    "SP.RUR.TOTL.ZS": "Rural population (% of total population)",
    "AG.CON.FERT.ZS": "Fertilizer consumption (kg per hectare of arable land)",
}
OPEN_METEO_URL = (
    "https://api.open-meteo.com/v1/forecast?latitude=26.391&longitude=72.946"
    "&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m"
    "&timezone=Asia%2FKolkata"
)
DATAGOVIN_URL = (
    "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070"
    "?api-key={key}&format=json&limit=3"
)


def _get(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": "farmgraph-rakshak-demo/0.2 (public-data connector)"})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
        return json.loads(resp.read().decode("utf-8"))


def fetch_world_bank() -> dict:
    indicators = []
    for ind, label in WB_INDICATORS.items():
        payload = _get(WB_BASE.format(ind=ind))
        rows = [r for r in (payload[1] if len(payload) > 1 else []) if r.get("value") is not None]
        indicators.append({
            "id": ind, "label": label,
            "latest": {"date": rows[0]["date"], "value": rows[0]["value"]} if rows else None,
            "series": [{"date": r["date"], "value": r["value"]} for r in rows],
        })
    return {
        "status": "LIVE_FETCHED",
        "url": "https://data.worldbank.org (public API, no key)",
        "note": "World Bank Open Data macro indicators for India — context only, not an operational feed.",
        "indicators": indicators,
    }


def fetch_open_meteo() -> dict:
    payload = _get(OPEN_METEO_URL)
    return {
        "status": "LIVE_FETCHED",
        "url": "https://open-meteo.com (CC-BY 4.0, no key; aggregates national weather models)",
        "note": ("Current weather at the demo golden plot (Balesar, Jodhpur). Open-Meteo is open data, "
                 "NOT IMD; IMD remains the cited authority for climate normals (see research-evidence.json)."),
        "location": {"lat": payload.get("latitude"), "lon": payload.get("longitude"), "elevationM": payload.get("elevation")},
        "current": payload.get("current"),
        "units": payload.get("current_units"),
    }


def fetch_datagovin() -> dict:
    key = os.environ.get("DATAGOVIN_API_KEY", "").strip()
    if not key:
        return {
            "status": "KEY_REQUIRED",
            "url": "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070 (AGMARKNET mandi prices)",
            "note": ("data.gov.in requires a free API key (signup at data.gov.in). No key is shipped with this "
                     "repository; set DATAGOVIN_API_KEY and re-run to make this source live. "
                     "Not attempted without a key — no fabricated access."),
        }
    try:
        payload = _get(DATAGOVIN_URL.format(key=key))
        return {
            "status": "LIVE_FETCHED",
            "url": "https://api.data.gov.in (AGMARKNET current mandi prices)",
            "note": "Live AGMARKNET mandi price records via data.gov.in.",
            "records": payload.get("records", [])[:3],
            "total": payload.get("total"),
        }
    except Exception as exc:  # noqa: BLE001 — status recorded honestly
        return {
            "status": "UNREACHABLE",
            "url": "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070",
            "note": f"Attempted with provided key but failed: {exc!r}",
        }


def main() -> int:
    snapshot: dict = {
        "snapshotId": datetime.now(timezone.utc).strftime("PDS-%Y%m%dT%H%M%SZ"),
        "fetchedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "servedAs": "CACHED",
        "honestyNote": ("This snapshot is served by the web app and API with a CACHED label and this fetchedAt "
                        "timestamp. Sources fetch live when this script runs; the shipped artifact is a cache, "
                        "never claimed to be a live feed."),
        "sources": {},
    }
    for name, fn in (("world_bank_india_ag", fetch_world_bank), ("open_meteo_jodhpur", fetch_open_meteo), ("datagovin_agmarknet", fetch_datagovin)):
        try:
            snapshot["sources"][name] = fn()
            print(f"[ok] {name}: {snapshot['sources'][name]['status']}")
        except Exception as exc:  # noqa: BLE001
            snapshot["sources"][name] = {"status": "UNREACHABLE", "note": f"{exc!r}"}
            print(f"[fail] {name}: {exc!r}")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(snapshot, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"snapshot written: {OUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
