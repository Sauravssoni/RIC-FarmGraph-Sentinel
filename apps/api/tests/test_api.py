"""FarmGraph Rakshak demo API test suite (Task 001).

Covers: case creation/validation, deterministic triage, low-quality recapture,
uncertain expert escalation, expert correction, unknown pathway, outbreak
scoring, mission generation, follow-up, audit creation, demo reset.
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app

FULL = {"leafClose": True, "lowerLeaf": True, "wholePlant": True, "lightingOk": True}
POOR = {"leafClose": True, "lowerLeaf": False, "wholePlant": False, "lightingOk": False}


@pytest.fixture()
def client():
    with TestClient(app) as c:
        c.post("/api/v1/demo/reset")
        yield c


def test_health(client):
    r = client.get("/api/v1/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["provenance"] == "SIMULATED"
    assert "in-memory" in body["persistence"]


def test_overview_kpis(client):
    body = client.get("/api/v1/overview").json()
    assert body["pendingSync"] >= 2
    assert body["suspectedClusters"] >= 2
    assert body["awaitingExpert"] >= 5
    assert body["provenance"] == "SIMULATED"


def test_cases_filters(client):
    r = client.get("/api/v1/cases", params={"crop": "bajra", "district": "Jodhpur"})
    assert r.status_code == 200
    assert all(c["crop"] == "bajra" and c["district"] == "Jodhpur" for c in r.json())
    awaiting = client.get("/api/v1/cases", params={"state": "AWAITING_EXPERT"}).json()
    assert len(awaiting) >= 5


def test_case_creation_and_validation(client):
    payload = {
        "farmerId": "RJ-DEMO-F1042", "plotId": "RJ-DEMO-PLOT-999", "crop": "bajra",
        "cropStage": "vegetative", "season": "kharif-2026", "district": "Jodhpur",
        "block": "Balesar", "lat": 26.4, "lon": 72.95, "areaAcres": 2.0,
        "createdOffline": True, "consent": {"given": True, "channel": "typed"},
    }
    r = client.post("/api/v1/cases", json=payload)
    assert r.status_code == 201
    assert r.json()["state"] == "DRAFT"
    bad = dict(payload, crop="wheat")
    assert client.post("/api/v1/cases", json=bad).status_code == 422
    nc = dict(payload, consent={"given": False})
    assert client.post("/api/v1/cases", json=nc).status_code == 422


def _mk_case(client) -> str:
    payload = {
        "farmerId": "RJ-DEMO-F1042", "plotId": "RJ-DEMO-PLOT-118", "crop": "bajra",
        "cropStage": "vegetative", "season": "kharif-2026", "district": "Jodhpur",
        "block": "Balesar", "lat": 26.391, "lon": 72.946, "areaAcres": 2.6,
        "consent": {"given": True, "channel": "typed"},
    }
    return client.post("/api/v1/cases", json=payload).json()["id"]


def test_low_quality_recapture_gate(client):
    cid = _mk_case(client)
    r = client.post(f"/api/v1/cases/{cid}/observations",
                    json={"symptomCategory": "pale_streaking", "symptomNote": "streaks", "checklist": POOR})
    assert r.status_code == 201
    obs = r.json()
    assert obs["quality"]["passed"] is False
    assert "lowerLeaf" in obs["quality"]["recaptureRequests"]
    case = client.get(f"/api/v1/cases/{cid}").json()
    assert case["state"] == "NEEDS_RECAPTURE"
    assert any(e["type"] == "quality_failed" for e in case["timeline"])
    # triage blocked until quality passes
    assert client.post(f"/api/v1/cases/{cid}/triage").status_code == 409


def test_deterministic_triage_golden_values(client):
    cid = _mk_case(client)
    client.post(f"/api/v1/cases/{cid}/observations",
                json={"symptomCategory": "pale_streaking", "symptomNote": "streaks", "checklist": FULL})
    r = client.post(f"/api/v1/cases/{cid}/triage")
    assert r.status_code == 200
    d = r.json()
    assert d["candidates"][0]["conditionId"] == "downy_mildew"
    assert d["candidates"][0]["simConfidence"] == 0.62
    assert d["candidates"][1]["conditionId"] == "nutrient_n"
    assert d["margin"] == 0.35
    assert d["routing"]["decision"] == "expert"
    assert d["provenance"] == "SIMULATED"
    case = client.get(f"/api/v1/cases/{cid}").json()
    assert case["state"] == "AWAITING_EXPERT"


def test_abstain_on_out_of_distribution(client):
    payload = {
        "farmerId": "RJ-DEMO-F1067", "plotId": "RJ-DEMO-PLOT-167", "crop": "guar",
        "cropStage": "vegetative", "season": "kharif-2026", "district": "Jalore",
        "block": "Jalore", "lat": 25.315, "lon": 72.655, "areaAcres": 2.0,
        "consent": {"given": True, "channel": "typed"},
    }
    cid = client.post("/api/v1/cases", json=payload).json()["id"]
    client.post(f"/api/v1/cases/{cid}/observations",
                json={"symptomCategory": "stem_rot", "symptomNote": "odd rot", "checklist": FULL})
    d = client.post(f"/api/v1/cases/{cid}/triage").json()
    assert d["candidates"][0]["conditionId"] == "unknown"
    assert d["routing"]["decision"] == "abstain"
    assert client.get(f"/api/v1/cases/{cid}").json()["state"] == "AWAITING_EXPERT"


def test_expert_confirm_changes_case_and_timeline(client):
    cid = _mk_case(client)
    client.post(f"/api/v1/cases/{cid}/observations",
                json={"symptomCategory": "pale_streaking", "symptomNote": "s", "checklist": FULL})
    client.post(f"/api/v1/cases/{cid}/triage")
    r = client.post(f"/api/v1/cases/{cid}/reviews",
                    json={"decision": "confirm", "conditionId": "downy_mildew", "note": "confirmed on evidence"})
    assert r.status_code == 200
    case = r.json()["case"]
    assert case["state"] == "EXPERT_CONFIRMED"
    assert case["expertConfirmedCondition"] == "downy_mildew"
    assert any(e["type"] == "expert_confirmed" for e in case["timeline"])


def test_expert_correction(client):
    cid = _mk_case(client)
    client.post(f"/api/v1/cases/{cid}/observations",
                json={"symptomCategory": "pale_streaking", "symptomNote": "s", "checklist": FULL})
    client.post(f"/api/v1/cases/{cid}/triage")
    r = client.post(f"/api/v1/cases/{cid}/reviews",
                    json={"decision": "correct", "conditionId": "nutrient_n", "note": "pattern is nutrient stress"})
    case = r.json()["case"]
    assert case["state"] == "EXPERT_CORRECTED"
    assert case["expertConfirmedCondition"] == "nutrient_n"


def test_expert_unknown_pathway(client):
    cid = _mk_case(client)
    client.post(f"/api/v1/cases/{cid}/observations",
                json={"symptomCategory": "pale_streaking", "symptomNote": "s", "checklist": FULL})
    client.post(f"/api/v1/cases/{cid}/triage")
    r = client.post(f"/api/v1/cases/{cid}/reviews",
                    json={"decision": "unknown", "note": "does not match references; specimens to KVK"})
    case = r.json()["case"]
    assert case["state"] == "CLOSED_UNKNOWN"
    assert case["expertConfirmedCondition"] == "unknown"
    # never forced into a known label
    assert any(e["type"] == "expert_marked_unknown" for e in case["timeline"])


def test_outbreak_score_and_golden_confirmation_crossing(client):
    before = client.get("/api/v1/outbreaks/CL-2601").json()
    assert before["score"]["status"] == "SUSPECTED"
    assert before["score"]["score"] == pytest.approx(65.5, abs=0.2)
    # golden flow: C-2614 recapture -> triage -> expert confirm
    client.post("/api/v1/cases/C-2614/observations",
                json={"symptomCategory": "pale_streaking", "symptomNote": "streaking", "checklist": FULL})
    client.post("/api/v1/cases/C-2614/triage")
    r = client.post("/api/v1/cases/C-2614/reviews",
                    json={"decision": "confirm", "conditionId": "downy_mildew", "note": "confirmed"})
    assert r.json()["clusterBreakdown"]["status"] == "VERIFIED"
    after = client.get("/api/v1/outbreaks/CL-2601").json()
    assert after["score"]["score"] == pytest.approx(71.5, abs=0.2)
    assert after["score"]["verifiedCount"] == 3
    assert any(e["type"] == "cluster_updated" for e in client.get("/api/v1/cases/C-2614").json()["timeline"])


def test_dismissed_cluster_stays_dismissed(client):
    cl = client.get("/api/v1/outbreaks/CL-2602").json()
    assert cl["status"] == "DISMISSED"
    assert cl["score"]["duplicatePenalty"] == 0.8
    assert cl["score"]["score"] < 40


def test_mission_generation_and_conflict(client):
    r = client.post("/api/v1/outbreaks/CL-2601/missions")
    assert r.status_code == 201
    m = r.json()
    assert m["status"] == "PLANNED"
    assert len(m["representativeCaseIds"]) == 3
    assert m["offlinePack"] == "READY"
    # deterministic: unverified-first ordering
    first = client.get(f"/api/v1/cases/{m['routeOrder'][0]}").json()
    assert first["expertConfirmedCondition"] != "downy_mildew"
    # audit event created on member cases
    case = client.get(f"/api/v1/cases/{m['routeOrder'][0]}").json()
    assert any(e["type"] == "mission_created" for e in case["timeline"])
    # second open mission conflicts
    assert client.post("/api/v1/outbreaks/CL-2601/missions").status_code == 409


def test_follow_up_not_improving_escalates(client):
    r = client.post("/api/v1/cases/C-2609/follow-ups", json={"status": "not_improving", "note": "spread continues"})
    assert r.status_code == 201
    case = client.get("/api/v1/cases/C-2609").json()
    assert case["state"] == "NOT_IMPROVING"
    types = [e["type"] for e in case["timeline"]]
    assert "follow_up_recorded" in types and "escalated_to_expert" in types


def test_expert_queue_prioritised(client):
    q = client.get("/api/v1/expert-queue").json()
    assert len(q) >= 5
    scores = [i["priorityScore"] for i in q]
    assert scores == sorted(scores, reverse=True)
    assert all(i["priorityReason"] for i in q)


def test_demo_reset_restores_determinism(client):
    cid = _mk_case(client)
    client.post(f"/api/v1/cases/{cid}/observations",
                json={"symptomCategory": "pale_streaking", "symptomNote": "s", "checklist": FULL})
    r = client.post("/api/v1/demo/reset")
    assert r.json()["status"] == "reset"
    assert r.json()["cases"] == 29
    assert client.get(f"/api/v1/cases/{cid}").status_code == 404
    golden = client.get("/api/v1/cases/C-2614").json()
    assert golden["state"] == "DRAFT"
    assert golden["observations"] == []


def test_integrations_never_live(client):
    adapters = client.get("/api/v1/integrations").json()
    assert len(adapters) == 17
    allowed = {"SIMULATED", "CONTRACT_DEFINED", "PUBLIC_DATA_ONLY", "AWAITING_AUTHORITY", "NOT_STARTED"}
    assert all(a["status"] in allowed for a in adapters)
    assert not any(a["status"] == "LIVE" for a in adapters)
    assert all(a["lastChecked"] for a in adapters)


def test_governance_endpoints(client):
    models_ = client.get("/api/v1/governance/models").json()
    assert any(m["kind"] == "deterministic-demo" for m in models_)
    advisories = client.get("/api/v1/governance/advisories").json()
    statuses = {a["status"] for a in advisories}
    assert {"DRAFT", "EXPERT_REVIEWED", "APPROVED", "EXPIRED", "WITHDRAWN"} <= statuses
    assert all(a["chemical"]["locked"] for a in advisories)
    assert client.get("/api/v1/cases/NOPE").status_code == 404
