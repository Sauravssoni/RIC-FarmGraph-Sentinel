"""Task 003 Phase 2C — IMD government-weather adapter tests.

Covers: source hierarchy (live-creds / whitelist gate / cached official /
sample shape / Open-Meteo fallback / simulated), normalised contract,
stale-cache ageing, the genuine whitelist evidence artefact, attribution, and
the explainable outbreak-score weather component (prior→new, variables,
reason, effect, freshness). All transports are mocked — tests are hermetic.
"""
from __future__ import annotations

import json
import urllib.error
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import app.imd as imd
from app.imd import (
    ImdAdapter, IMD_ATTRIBUTION,
    STATE_CACHED, STATE_FALLBACK, STATE_LIVE, STATE_PRODUCT, STATE_SIMULATED,
    STATE_STALE, STATE_WHITELIST, weather_suitability_explanation,
)
from app.main import app

REF = Path(__file__).resolve().parents[3] / "data" / "reference"
POLICY = json.loads((Path(__file__).resolve().parents[3] / "data" / "policy" / "weather-risk.json").read_text())


@pytest.fixture()
def client():
    with TestClient(app) as c:
        c.post("/api/v1/demo/reset")
        yield c


def whitelist_transport(url: str, timeout: float):
    return 401, "Your IP/Domain 203.0.113.7 needs to be whitelisted"


def down_transport(url: str, timeout: float):
    raise urllib.error.URLError("connection refused")


OM_SNAPSHOT = {
    "status": "LIVE_FETCHED",
    "current": {"temperature_2m": 31.3, "relative_humidity_2m": 59, "precipitation": 0.0, "wind_speed_10m": 12.2},
    "location": {"lat": 26.4, "lon": 72.97},
    "fetchedAt": "2026-07-20T17:35:00+00:00",
}


def make_adapter(**kw):
    kw.setdefault("env", {})
    kw.setdefault("transport", whitelist_transport)
    return ImdAdapter(**kw)


# ---------------- hierarchy + states ----------------

def test_whitelist_gate_state_with_sample_contract_and_fallback():
    ad = make_adapter(open_meteo_snapshot=OM_SNAPSHOT)
    out = ad.district_weather("Jodhpur")
    assert out["state"] == STATE_WHITELIST
    assert "whitelisting" in out["stateDetail"]
    assert out["whitelistEvidence"] == "data/reference/imd-whitelist-evidence.json"
    # sample shape demonstrates the contract, labelled SAMPLE — never CACHED_IMD_DATA
    w = out["weather"]
    assert w["district"] == "Jodhpur"
    assert "SAMPLE SHAPE" in w["provenance"]
    assert w["integrationState"] == STATE_WHITELIST
    assert w["dataCompleteness"] > 0.5
    assert len(w["responseHash"]) == 64
    assert w["attribution"] == IMD_ATTRIBUTION
    # fallback separately labelled — never IMD
    assert out["fallback"]["state"] == STATE_FALLBACK
    assert "NOT a government source" in out["fallback"]["provider"]


def test_product_unavailable_when_endpoint_down():
    ad = make_adapter(transport=down_transport, open_meteo_snapshot=None)
    out = ad.district_weather("Jodhpur")
    assert out["state"] == STATE_PRODUCT
    assert out["fallback"]["state"] == STATE_SIMULATED


def test_datagov_key_required_state():
    ad = make_adapter(transport=whitelist_transport)
    live = ad._try_datagov_live("Jodhpur")
    assert live["state"] == "IMD_CREDENTIALS_REQUIRED"


def test_cached_official_fresh_and_stale(tmp_path):
    doc = json.loads((REF / "imd-sample-district-forecast.json").read_text())
    fresh = {**doc, "fetchedAt": "2099-01-01T00:00:00+00:00"}  # far future → age negative → fresh
    (tmp_path / "imd-cached-jodhpur.json").write_text(json.dumps(fresh))
    ad = make_adapter(ref_dir=tmp_path)
    out = ad.district_weather("Jodhpur")
    assert out["state"] == STATE_CACHED
    assert "CACHED official IMD capture" in out["weather"]["provenance"]

    stale = {**doc, "fetchedAt": "2020-01-01T00:00:00+00:00"}
    (tmp_path / "imd-cached-jodhpur.json").write_text(json.dumps(stale))
    ad2 = make_adapter(ref_dir=tmp_path)
    out2 = ad2.district_weather("Jodhpur")
    assert out2["state"] == STATE_STALE
    assert out2["weather"]["cacheAgeSec"] > 0


def test_live_datagov_path():
    def live_transport(url, timeout):
        return 200, json.dumps({"records": [{"district": "Jodhpur", "rainfall": "5.2"}]})
    env = {"IMD_ENABLED": "1", "DATAGOV_API_KEY": "k", "IMD_DATAGOV_RESOURCE_ID": "res-1"}
    ad = ImdAdapter(env=env, transport=live_transport)
    out = ad.district_weather("Jodhpur")
    assert out["state"] == STATE_LIVE
    assert out["weather"]["integrationState"] == STATE_LIVE


# ---------------- explainable score component ----------------

def test_weather_explanation_moves_score_with_reason_and_variables():
    cluster = {"weatherSuitability": 0.4}
    ad = make_adapter(open_meteo_snapshot=OM_SNAPSHOT)
    w = ad.district_weather("Jodhpur")["weather"]
    ex = weather_suitability_explanation(cluster, w, STATE_WHITELIST, POLICY, engine_weather_weight=0.1)
    # rain 18.2 ≥ 10 and RH 82 ≥ 75 → moisture hit; YELLOW warning 0.1
    # raw = 0.2 + 0.5 + 0.1 = 0.8; whitelist multiplier 0.5 → 0.4 + (0.8-0.4)*0.5 = 0.6
    assert ex["prior"] == 0.4
    assert ex["new"] == pytest.approx(0.6)
    assert ex["scoreEffectPoints"] == pytest.approx(2.0)
    assert any("dailyRainfallForecastMm" in v for v in ex["variablesUsed"])
    assert any("warningLevel=YELLOW" in v for v in ex["variablesUsed"])
    assert "Weather suitability: 0.4 → 0.6" in ex["reason"]
    assert ex["sourceStatus"] == STATE_WHITELIST
    assert ex["policyVersion"] == "weather-risk/v1"


def test_simulated_weather_never_moves_score():
    cluster = {"weatherSuitability": 0.7}
    ex = weather_suitability_explanation(cluster, None, STATE_SIMULATED, POLICY, 0.1)
    assert ex["new"] == ex["prior"]
    assert ex["scoreEffectPoints"] == 0.0
    assert "multiplier 0" in ex["reason"]


# ---------------- endpoints ----------------

def test_weather_endpoint_contract(client, monkeypatch):
    monkeypatch.setattr(imd, "_urllib_get", whitelist_transport)
    r = client.get("/api/v1/integrations/weather?district=Jodhpur")
    assert r.status_code == 200
    body = r.json()
    assert body["state"] == STATE_WHITELIST
    assert body["attribution"] == IMD_ATTRIBUTION
    assert body["officialSourceReference"].startswith("https://mausam.imd.gov.in")
    assert body["fallback"]["state"] in (STATE_FALLBACK, STATE_SIMULATED)


def test_cluster_weather_context_endpoint(client, monkeypatch):
    monkeypatch.setattr(imd, "_urllib_get", whitelist_transport)
    r = client.get("/api/v1/outbreaks/CL-2601/weather-context")
    assert r.status_code == 200
    body = r.json()
    assert body["district"] == "Jodhpur"
    comp = body["weatherComponent"]
    assert comp["component"] == "weatherSuitability"
    assert comp["prior"] == 0.8  # seeded value — never silently replaced
    assert comp["sourceStatus"] == STATE_WHITELIST
    assert comp["reason"]
    assert client.get("/api/v1/outbreaks/CL-9999/weather-context").status_code == 404


def test_whitelist_evidence_artefact_is_genuine():
    ev = json.loads((REF / "imd-whitelist-evidence.json").read_text())
    assert ev["response"]["httpStatus"] == 401
    assert "whitelist" in ev["response"]["bodyExcerpt"].lower()
    assert ev["conclusion"] == STATE_WHITELIST
    assert len(ev["response"]["sha256"]) == 64
