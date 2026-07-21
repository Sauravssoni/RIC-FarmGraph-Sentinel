"""Task 003 Phase 2A — KVK referral workflow: SLA, escalation, evidence pack.

Covers: urgency validation, escalation-note requirement, SLA overdue/completed
states, the downloadable referral pack (fields, privacy masking, provenance),
and SLA visibility in the referrals listing.
"""
from __future__ import annotations

from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture()
def client():
    with TestClient(app) as c:
        c.post("/api/v1/demo/reset")
        yield c


def _mk_case(client, crop: str = "bajra") -> str:
    payload = {
        "farmerId": "RJ-DEMO-F1042", "plotId": "RJ-DEMO-PLOT-118", "crop": crop,
        "cropStage": "vegetative", "season": "kharif-2026", "district": "Jodhpur",
        "block": "Balesar", "lat": 26.391, "lon": 72.946, "areaAcres": 2.6,
        "consent": {"given": True, "channel": "typed"},
    }
    r = client.post("/api/v1/cases", json=payload)
    assert r.status_code == 201
    return r.json()["id"]


def _mk_referral(client, cid: str, **over) -> dict:
    body = {"kvkId": "KVK-JODHPUR-1", "reason": "local follow-up", **over}
    r = client.post(f"/api/v1/cases/{cid}/referrals", json=body)
    assert r.status_code == 201
    return r.json()


def test_urgency_validation(client):
    cid = _mk_case(client)
    bad = client.post(f"/api/v1/cases/{cid}/referrals",
                      json={"kvkId": "KVK-JODHPUR-1", "reason": "x", "urgency": "WHENEVER"})
    assert bad.status_code == 422
    assert bad.json()["detail"]["code"] == "BAD_URGENCY"
    ok = _mk_referral(client, cid, urgency="URGENT", slaTargetHours=24)
    assert ok["urgency"] == "URGENT"
    assert ok["slaTargetHours"] == 24


def test_escalation_requires_note_and_branch_flow(client):
    cid = _mk_case(client)
    ref = _mk_referral(client, cid)
    client.post(f"/api/v1/referrals/{ref['id']}/status", json={"status": "SHARED"})
    # escalation without a note is rejected
    no_note = client.post(f"/api/v1/referrals/{ref['id']}/status", json={"status": "ESCALATED"})
    assert no_note.status_code == 409
    assert no_note.json()["detail"]["code"] == "ESCALATION_NOTE_REQUIRED"
    # with a note it works, and ESCALATED can resolve or close
    esc = client.post(f"/api/v1/referrals/{ref['id']}/status",
                      json={"status": "ESCALATED", "note": "No KVK response in 48h — escalating to district officer"})
    assert esc.status_code == 200
    assert esc.json()["status"] == "ESCALATED"
    assert esc.json()["statusHistory"][-1]["note"].startswith("No KVK response")
    res = client.post(f"/api/v1/referrals/{ref['id']}/status", json={"status": "RESPONDED", "note": "visit done"})
    assert res.status_code == 200


def test_sla_overdue_and_completed(client):
    cid = _mk_case(client)
    ref = _mk_referral(client, cid)
    # fresh referral is within SLA
    listing = client.get("/api/v1/referrals").json()["referrals"]
    row = next(x for x in listing if x["id"] == ref["id"])
    assert row["slaStatus"] == "WITHIN_SLA"
    # backdate dueAt into the past → OVERDUE (reach into the lifespan-held repo)
    stored = app.state.repo.referrals[ref["id"]]
    stored["dueAt"] = (datetime.now().astimezone() - timedelta(hours=3)).isoformat(timespec="seconds")
    row = next(x for x in client.get("/api/v1/referrals").json()["referrals"] if x["id"] == ref["id"])
    assert row["slaStatus"] == "OVERDUE"
    # completing the referral closes the SLA even when overdue
    client.post(f"/api/v1/referrals/{ref['id']}/status", json={"status": "SHARED"})
    client.post(f"/api/v1/referrals/{ref['id']}/status", json={"status": "ACKNOWLEDGED"})
    done = client.post(f"/api/v1/referrals/{ref['id']}/status", json={"status": "RESPONDED"})
    assert done.json()["slaStatus"] == "COMPLETED"


def test_referral_pack_fields_and_privacy(client):
    cid = _mk_case(client)
    ref = _mk_referral(client, cid, note="bajra downy mildew suspected", urgency="URGENT")
    r = client.get(f"/api/v1/referrals/{ref['id']}/pack")
    assert r.status_code == 200
    pack = r.json()
    # required content
    for key in ("packVersion", "generatedAt", "referralId", "caseId", "farmerRef", "plotRef",
                "district", "block", "coordinates", "crop", "cropStage", "symptomSummary",
                "imageHashes", "imageQuality", "inference", "verificationStatement",
                "expertReviewState", "urgency", "outbreakRelationship", "requestedAction",
                "originatingRole", "consentStatus", "createdAt", "sla", "auditReference",
                "farmgraphContact", "kvk", "provenance"):
        assert key in pack, f"pack missing {key}"
    assert pack["packVersion"] == "kvk-referral-pack/v1"
    assert pack["referralId"] == ref["id"]
    assert pack["urgency"] == "URGENT"
    # unverified case → explicit UNVERIFIED statement
    assert pack["verificationStatement"].startswith("UNVERIFIED")
    # privacy: coordinates rounded to 2 dp; pseudonymous refs only
    assert pack["coordinates"]["lat"] == round(26.391, 2)
    assert "privacy" in pack["coordinates"]["precisionNote"].lower()
    assert pack["farmerRef"] == "RJ-DEMO-F1042"  # pseudonymous ID, not a name
    blob = str(pack).lower()
    assert "aadhaar" not in blob
    # KVK contact from sourced directory + provenance statement
    assert pack["kvk"]["id"] == "KVK-JODHPUR-1"
    assert pack["kvk"]["phone"]
    assert "SIMULATED DEMO PACK" in pack["provenance"]
    # SLA embedded
    assert pack["sla"]["status"] == "WITHIN_SLA"
    assert pack["sla"]["targetHours"] == 48


def test_referral_pack_unknown_404(client):
    assert client.get("/api/v1/referrals/REF-9999/pack").status_code == 404
