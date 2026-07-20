"""Phase G/H test suite (Task 002).

Covers: sourced KVK directory, referral lifecycle + transition guards,
learning records + summary, advisory safety invariants (every rejection code
plus the success path), idempotent sync, evidence upload validation, demo
role RBAC (403/400), security headers, rate limiting, digital-twin bundle,
and SQLite persistence across a simulated restart.
"""
from __future__ import annotations

import importlib
import os

import pytest
from fastapi.testclient import TestClient

from app.main import app

FULL = {"leafClose": True, "lowerLeaf": True, "wholePlant": True, "lightingOk": True}
PNG_1PX = bytes.fromhex(
    "89504e470d0a1a0a0000000d494844520000000100000001080600000"
    "01f15c4890000000d49444154789c626001000000ffff030000060005"
    "57bfabd40000000049454e44ae426082"
)


@pytest.fixture()
def client():
    with TestClient(app) as c:
        c.post("/api/v1/demo/reset")
        yield c


def _mk_case(client, crop: str = "bajra", plot: str = "RJ-DEMO-PLOT-118") -> str:
    payload = {
        "farmerId": "RJ-DEMO-F1042", "plotId": plot, "crop": crop,
        "cropStage": "vegetative", "season": "kharif-2026", "district": "Jodhpur",
        "block": "Balesar", "lat": 26.391, "lon": 72.946, "areaAcres": 2.6,
        "consent": {"given": True, "channel": "typed"},
    }
    return client.post("/api/v1/cases", json=payload).json()["id"]


def _confirm(client, cid: str, condition: str = "downy_mildew") -> None:
    client.post(f"/api/v1/cases/{cid}/observations",
                json={"symptomCategory": "pale_streaking", "symptomNote": "x", "checklist": FULL})
    client.post(f"/api/v1/cases/{cid}/triage")
    r = client.post(f"/api/v1/cases/{cid}/reviews",
                    json={"decision": "confirm", "conditionId": condition, "note": "verified"})
    assert r.status_code == 200


# ---------------- health / security posture ----------------

def test_health_surfaces_persistence_and_security(client):
    body = client.get("/api/v1/health").json()
    assert "in-memory" in body["persistence"]  # FGR_PERSIST=memory in tests
    assert body["persistedBoot"] is False
    assert "X-Demo-Role" in body["security"]


def test_security_headers_present(client):
    r = client.get("/api/v1/health")
    assert r.headers["X-Content-Type-Options"] == "nosniff"
    assert r.headers["X-Frame-Options"] == "DENY"
    assert r.headers["Referrer-Policy"] == "no-referrer"


def test_demo_role_rbac(client):
    cid = _mk_case(client)
    # farmer may write case data but may not review (expert action)
    client.post(f"/api/v1/cases/{cid}/observations",
                json={"symptomCategory": "pale_streaking", "symptomNote": "x", "checklist": FULL},
                headers={"X-Demo-Role": "farmer"})
    client.post(f"/api/v1/cases/{cid}/triage", headers={"X-Demo-Role": "farmer"})
    r = client.post(f"/api/v1/cases/{cid}/reviews",
                    json={"decision": "confirm", "conditionId": "downy_mildew", "note": "verified on call"},
                    headers={"X-Demo-Role": "farmer"})
    assert r.status_code == 403
    # unknown roles are rejected outright
    r2 = client.get("/api/v1/cases", headers={"X-Demo-Role": "minister"})
    assert r2.status_code == 400
    # expert role passes the same review
    r3 = client.post(f"/api/v1/cases/{cid}/reviews",
                     json={"decision": "confirm", "conditionId": "downy_mildew", "note": "verified on call"},
                     headers={"X-Demo-Role": "expert"})
    assert r3.status_code == 200


def test_write_rate_limit(client, monkeypatch):
    monkeypatch.setenv("FGR_RATE_LIMIT", "2")
    app.state.rate_limiter._hits.clear()
    payload = {
        "farmerId": "RJ-DEMO-F1042", "plotId": "RJ-DEMO-PLOT-118", "crop": "bajra",
        "cropStage": "vegetative", "season": "kharif-2026", "district": "Jodhpur",
        "block": "Balesar", "lat": 26.4, "lon": 72.95, "areaAcres": 2.0,
        "consent": {"given": True, "channel": "typed"},
    }
    assert client.post("/api/v1/cases", json=payload).status_code == 201
    assert client.post("/api/v1/cases", json=payload).status_code == 201
    r = client.post("/api/v1/cases", json=payload)
    assert r.status_code == 429
    assert "Retry-After" in r.headers


# ---------------- KVK + referrals ----------------

def test_kvk_directory_is_sourced(client):
    body = client.get("/api/v1/kvks").json()
    assert body["provenance"] == "REFERENCE_DATA"
    assert len(body["kvks"]) == 6
    for k in body["kvks"]:
        assert k.get("source"), f"KVK {k['id']} lacks a source citation"


def test_referral_lifecycle(client):
    cid = _mk_case(client)
    kvk = client.get("/api/v1/kvks").json()["kvks"][0]
    r = client.post(f"/api/v1/cases/{cid}/referrals",
                    json={"kvkId": kvk["id"], "reason": "expert consult", "note": "please advise"})
    assert r.status_code == 201
    ref = r.json()
    # Creation lands at READY_TO_SHARE — never SHARED (delivery not automated)
    assert ref["status"] == "READY_TO_SHARE"
    assert ref["statusHistory"][0]["status"] == "READY_TO_SHARE"
    assert ref["slaTargetHours"] == 48 and ref["dueAt"] > ref["createdAt"]
    # unknown KVK rejected
    bad = client.post(f"/api/v1/cases/{cid}/referrals", json={"kvkId": "KVK-FAKE", "reason": "x"})
    assert bad.status_code == 422
    # skipping READY_TO_SHARE → ACKNOWLEDGED is an invalid transition
    skip = client.post(f"/api/v1/referrals/{ref['id']}/status", json={"status": "ACKNOWLEDGED"})
    assert skip.status_code == 409
    # forward transitions along the full lifecycle
    for nxt in ("SHARED", "ACKNOWLEDGED", "RESPONDED", "CLOSED"):
        rr = client.post(f"/api/v1/referrals/{ref['id']}/status", json={"status": nxt})
        assert rr.status_code == 200
        assert rr.json()["status"] == nxt
    # backwards transition rejected
    back = client.post(f"/api/v1/referrals/{ref['id']}/status", json={"status": "SHARED"})
    assert back.status_code == 409
    # unknown referral 404
    assert client.post("/api/v1/referrals/REF-9999/status", json={"status": "CLOSED"}).status_code == 404
    # listing shows the referral
    listing = client.get("/api/v1/referrals").json()["referrals"]
    assert any(x["id"] == ref["id"] for x in listing)
    # farmer role cannot refer
    farmer = client.post(f"/api/v1/cases/{cid}/referrals",
                         json={"kvkId": kvk["id"], "reason": "x"},
                         headers={"X-Demo-Role": "farmer"})
    assert farmer.status_code == 403


# ---------------- learning flywheel ----------------

def test_learning_records_and_summary(client):
    cid = _mk_case(client)
    _confirm(client, cid)
    records = client.get("/api/v1/learning/records").json()["records"]
    mine = [r for r in records if r["caseId"] == cid]
    assert len(mine) == 1
    lr = mine[0]
    assert lr["provenance"] == "EXPERT_VERIFIED_REVIEW"
    assert lr["reviewAction"] == "confirm"
    assert lr["expertLabel"] == "downy_mildew"
    assert lr["usedInModelVersion"] is None
    summary = client.get("/api/v1/learning/summary").json()
    assert summary["total"] >= 1
    assert "no automatic training" in summary["honestyNote"].lower()


# ---------------- advisory safety invariants ----------------

def test_advisory_invariants(client):
    cid = _mk_case(client, crop="bajra")
    # not found
    r = client.post(f"/api/v1/cases/{cid}/advisory-issue", json={"advisoryId": "ADV-NOPE"})
    assert r.status_code == 409 and r.json()["detail"]["code"] == "ADVISORY_NOT_FOUND"
    # superseded (DRAFT v0.1 superseded by v0.2)
    r = client.post(f"/api/v1/cases/{cid}/advisory-issue", json={"advisoryId": "ADV-2601-v0.1"})
    assert r.status_code == 409 and r.json()["detail"]["code"] == "SUPERSEDED"
    # not approved (guar advisory stuck at EXPERT_REVIEWED)
    r = client.post(f"/api/v1/cases/{cid}/advisory-issue", json={"advisoryId": "ADV-2603-v0.1"})
    assert r.status_code == 409 and r.json()["detail"]["code"] == "NOT_APPROVED"
    # expired (mustard advisory valid until 2026-04-30)
    r = client.post(f"/api/v1/cases/{cid}/advisory-issue", json={"advisoryId": "ADV-2602-v0.1"})
    assert r.status_code == 409 and r.json()["detail"]["code"] == "EXPIRED"
    # crop mismatch (bajra advisory vs mustard case)
    cid_mustard = _mk_case(client, crop="mustard", plot="RJ-DEMO-PLOT-041")
    r = client.post(f"/api/v1/cases/{cid_mustard}/advisory-issue", json={"advisoryId": "ADV-2604-v0.2"})
    assert r.status_code == 409 and r.json()["detail"]["code"] == "CROP_MISMATCH"
    # expert review required (case not yet reviewed)
    r = client.post(f"/api/v1/cases/{cid}/advisory-issue", json={"advisoryId": "ADV-2604-v0.2"})
    assert r.status_code == 409 and r.json()["detail"]["code"] == "EXPERT_REVIEW_REQUIRED"
    # condition mismatch (confirmed downy_mildew vs nutrient_n advisory)
    _confirm(client, cid, "downy_mildew")
    r = client.post(f"/api/v1/cases/{cid}/advisory-issue", json={"advisoryId": "ADV-2604-v0.2"})
    assert r.status_code == 409 and r.json()["detail"]["code"] == "CONDITION_MISMATCH"
    # success path: matching approved current advisory
    r = client.post(f"/api/v1/cases/{cid}/advisory-issue", json={"advisoryId": "ADV-2601-v0.3"})
    assert r.status_code == 200
    assert r.json()["advisoryRef"] == "ADV-2601-v0.3"
    assert r.json()["state"] == "ADVISORY_ISSUED"
    # farmer role blocked from issuing
    r = client.post(f"/api/v1/cases/{cid}/advisory-issue", json={"advisoryId": "ADV-2601-v0.3"},
                    headers={"X-Demo-Role": "farmer"})
    assert r.status_code == 403


# ---------------- idempotent sync ----------------

def _sync_body(key: str) -> dict:
    return {
        "idempotencyKey": key,
        "cases": [{
            "farmerId": "RJ-DEMO-F1042", "plotId": "RJ-DEMO-PLOT-118", "crop": "bajra",
            "cropStage": "vegetative", "season": "kharif-2026", "district": "Jodhpur",
            "block": "Balesar", "lat": 26.4, "lon": 72.95, "areaAcres": 2.0,
            "consent": {"given": True, "channel": "typed"}, "createdOffline": True,
            "observations": [{"symptomCategory": "pale_streaking", "symptomNote": "offline capture", "checklist": FULL}],
        }],
    }


def test_sync_batch_idempotent(client):
    before = len(client.get("/api/v1/cases").json())
    r1 = client.post("/api/v1/sync/batch", json=_sync_body("sync-test-1"))
    assert r1.status_code == 200
    assert r1.json()["status"] == "applied"
    ids = r1.json()["caseIds"]
    assert len(ids) == 1
    r2 = client.post("/api/v1/sync/batch", json=_sync_body("sync-test-1"))
    assert r2.json()["status"] == "already_applied"
    assert r2.json()["caseIds"] == ids
    after = len(client.get("/api/v1/cases").json())
    assert after == before + 1  # replay did not duplicate
    # synced case carries its observation
    case = client.get(f"/api/v1/cases/{ids[0]}").json()
    assert len(case["observations"]) == 1
    assert case["pendingSync"] is False  # sync_completed fired


def test_sync_batch_validation(client):
    bad = _sync_body("sync-test-2")
    bad["cases"][0]["crop"] = "wheat"
    assert client.post("/api/v1/sync/batch", json=bad).status_code == 422
    nc = _sync_body("sync-test-3")
    nc["cases"][0]["consent"] = {"given": False}
    assert client.post("/api/v1/sync/batch", json=nc).status_code == 422


# ---------------- evidence upload ----------------

def test_evidence_upload_validation(client):
    bad = client.post("/api/v1/evidence", files={"file": ("a.txt", b"hello", "text/plain")})
    assert bad.status_code == 415
    ok = client.post("/api/v1/evidence", files={"file": ("leaf.png", PNG_1PX, "image/png")})
    assert ok.status_code == 201
    body = ok.json()
    assert len(body["sha256"]) == 64
    assert body["bytes"] == len(PNG_1PX)
    big = client.post("/api/v1/evidence", files={"file": ("big.jpg", b"x" * (15 * 1024 * 1024 + 1), "image/jpeg")})
    assert big.status_code == 413


# ---------------- digital twin bundle ----------------

def test_twin_bundle(client):
    r = client.get("/api/v1/digital-twins/RJ-DEMO-PLOT-118")
    assert r.status_code == 200
    body = r.json()
    assert body["plot"]["id"] == "RJ-DEMO-PLOT-118"
    assert any(c["id"] == "C-2614" for c in body["cases"])
    assert "not a predictive model" in body["honestyNote"]
    assert client.get("/api/v1/digital-twins/PLOT-NOPE").status_code == 404


# ---------------- governance audit ----------------

def test_audit_stream(client):
    cid = _mk_case(client)
    _confirm(client, cid)
    body = client.get("/api/v1/governance/audit").json()
    assert body["total"] > 0
    types = {e["type"] for e in body["events"]}
    assert "expert_confirmed" in types
    assert "learning_recorded" in types


# ---------------- SQLite persistence across restart ----------------

def test_sqlite_persistence_across_restart(tmp_path, monkeypatch):
    monkeypatch.delenv("FGR_PERSIST", raising=False)
    monkeypatch.setenv("FGR_DB_PATH", str(tmp_path / "fgr.db"))
    import app.repository as repo_mod
    importlib.reload(repo_mod)

    r1 = repo_mod.DemoRepository()
    assert r1._persisted_boot is False  # fresh DB seeded
    case = r1.get_case("C-2614")
    r1.add_observation(case, {"symptomCategory": "pale_streaking", "symptomNote": "x", "checklist": FULL})
    r1.triage(case)
    r1.review(case, {"decision": "confirm", "conditionId": "downy_mildew", "note": "verified"})
    assert len(r1.learning_records) == 1

    # simulate process restart: brand-new repository over the same DB file
    r2 = repo_mod.DemoRepository()
    assert r2._persisted_boot is True
    assert r2.get_case("C-2614")["state"] == "EXPERT_CONFIRMED"
    assert len(r2.learning_records) == 1

    # reset restores the pristine seed
    r2.reset()
    assert r2.get_case("C-2614")["state"] == "DRAFT"
    assert len(r2.learning_records) == 0

    # Restore module identity for later tests: the reload above created a new
    # AdvisoryRejected class, which would break `except AdvisoryRejected` in
    # the already-registered route functions (their __globals__ share the
    # module dict, which reload mutates in place). Re-linking all modules
    # gives one consistent set of classes again.
    import app.persistence as persistence_mod
    import app.routers.api as api_mod
    import app.main as main_mod
    importlib.reload(persistence_mod)
    importlib.reload(repo_mod)
    importlib.reload(api_mod)
    importlib.reload(main_mod)


# ---------------- public-data connector (Phase J) ----------------

def test_public_data_snapshot(client):
    body = client.get("/api/v1/public-data").json()
    assert body["servedAs"] == "CACHED"
    assert body["fetchedAt"]
    wb = body["sources"]["world_bank_india_ag"]
    assert wb["status"] == "LIVE_FETCHED"
    assert any(i["latest"] for i in wb["indicators"])
    # honest labels: every source carries a status + note, none claims live serving
    for src in body["sources"].values():
        assert src["status"] in ("LIVE_FETCHED", "KEY_REQUIRED", "UNREACHABLE")
        assert src["note"]
