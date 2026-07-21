"""Task 003 Phase 2D — AGMARKNET mandi-price connector tests (hermetic)."""
from __future__ import annotations

import json
import urllib.error
import urllib.parse
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.agmarknet import (
    AgmarknetAdapter, STATE_CACHED, STATE_CREDS, STATE_LIVE,
    STATE_NO_DATA, STATE_PRODUCT, STATE_STALE,
)
from app.main import app

REF = Path(__file__).resolve().parents[3] / "data" / "reference"


@pytest.fixture()
def client():
    with TestClient(app) as c:
        c.post("/api/v1/demo/reset")
        yield c


def live_transport(url: str, timeout: float):
    assert "filters[state]=Rajasthan" in urllib.parse.unquote(url)  # Rajasthan-only by construction
    records = [
        {"state": "Rajasthan", "district": "Jodhpur", "market": "Jodhpur (Grain)",
         "commodity": "Bajra(Pearl Millet/Cumbu)", "variety": "FAQ", "arrival_date": "20/07/2026",
         "min_price": "2350", "max_price": "2580", "modal_price": "2460"},
        {"state": "Gujarat", "district": "Banaskantha", "market": "Deesa",
         "commodity": "Bajra(Pearl Millet/Cumbu)", "variety": "FAQ", "arrival_date": "20/07/2026",
         "min_price": "1", "max_price": "2", "modal_price": "2"},  # must be filtered out
    ]
    return 200, json.dumps({"records": records})


def make_adapter(**kw):
    kw.setdefault("env", {})
    kw.setdefault("transport", live_transport)
    return AgmarknetAdapter(**kw)


def test_credentials_required_without_key():
    out = make_adapter().mandi_prices("bajra")
    assert out["state"] == STATE_CREDS
    assert "DATAGOV_API_KEY" in out["stateDetail"]
    assert "SAMPLE SHAPE" in out["provenance"]  # never CACHED_MANDI_DATA
    assert out["recordCount"] == 2
    q = out["quotes"][0]
    assert q["mandi"] == "Jodhpur (Grain)"
    assert q["modalPriceInrQuintal"] == 2460.0
    assert q["unit"] == "INR/quintal"
    assert q["marketType"].startswith("APMC")
    assert len(out["responseHash"]) == 64
    assert "data.gov.in" in out["attribution"]


def test_live_keyed_fetch_filters_rajasthan_and_normalises():
    out = make_adapter(env={"DATAGOV_API_KEY": "k"}).mandi_prices("bajra")
    assert out["state"] == STATE_LIVE
    assert out["recordCount"] == 1  # Gujarat record excluded
    assert out["quotes"][0]["district"] == "Jodhpur"
    assert out["quotes"][0]["state"] == "Rajasthan"
    assert out["fetchedAt"]


def test_alias_mapping_covers_pilot_crops():
    ad = make_adapter()
    assert set(ad.aliases) == {"bajra", "mustard", "guar", "cumin"}
    assert "Bajra(Pearl Millet/Cumbu)" in ad.aliases["bajra"]
    for crop in ("bajra", "mustard", "guar", "cumin"):
        assert ad.mandi_prices(crop)["recordCount"] >= 1, crop


def test_district_filter_and_no_data_states():
    out = make_adapter().mandi_prices("cumin", district="Jalore")
    assert out["recordCount"] == 1
    assert out["quotes"][0]["mandi"] == "Bhinmal"
    none = make_adapter().mandi_prices("cumin", district="Bikaner")
    assert none["recordCount"] == 0
    unsupported = make_adapter().mandi_prices("tomato")
    assert unsupported["state"] == STATE_NO_DATA
    assert unsupported["quotes"] == []


def test_product_unavailable_and_key_rejection():
    def down(url, timeout):
        raise urllib.error.URLError("refused")
    out = make_adapter(env={"DATAGOV_API_KEY": "k"}, transport=down).mandi_prices("bajra")
    assert out["state"] == STATE_PRODUCT

    def forbidden(url, timeout):
        return 403, "invalid key"
    out2 = make_adapter(env={"DATAGOV_API_KEY": "bad"}, transport=forbidden).mandi_prices("bajra")
    assert out2["state"] == STATE_CREDS


def test_cached_fresh_and_stale(tmp_path):
    (tmp_path / "agmarknet-crop-aliases.json").write_text((REF / "agmarknet-crop-aliases.json").read_text())
    sample = json.loads((REF / "agmarknet-sample-rajasthan.json").read_text())
    fresh = {"fetchedAt": "2099-01-01T00:00:00+00:00", "records": sample["records"]}
    (tmp_path / "agmarknet-cached-rajasthan.json").write_text(json.dumps(fresh))
    out = make_adapter(ref_dir=tmp_path).mandi_prices("bajra")
    assert out["state"] == STATE_CACHED
    assert "CACHED keyed capture" in out["provenance"]

    stale = {"fetchedAt": "2020-01-01T00:00:00+00:00", "records": sample["records"]}
    (tmp_path / "agmarknet-cached-rajasthan.json").write_text(json.dumps(stale))
    out2 = make_adapter(ref_dir=tmp_path).mandi_prices("bajra")
    assert out2["state"] == STATE_STALE
    assert out2["cacheAgeSec"] > 0


def test_mandi_endpoint(client):
    r = client.get("/api/v1/integrations/mandi?crop=bajra")
    assert r.status_code == 200
    body = r.json()
    assert body["state"] in (STATE_CREDS, STATE_LIVE, STATE_PRODUCT)
    assert body["quotes"]
    assert body["quotes"][0]["unit"] == "INR/quintal"
    assert "AGMARKNET" in body["attribution"]
    r2 = client.get("/api/v1/integrations/mandi?crop=tomato")
    assert r2.json()["state"] == STATE_NO_DATA
