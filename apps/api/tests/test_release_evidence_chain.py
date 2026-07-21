"""Task 004 submission gate — connected evidence continuity.

Proves the exact evaluator chain:
consented image + voice evidence → authoritative case → pixel/edge/transcript
metadata → KVK referral → versioned referral pack, including idempotent replay.
"""
from __future__ import annotations

import hashlib

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture()
def client():
    with TestClient(app) as c:
        c.post("/api/v1/demo/reset")
        yield c


def _upload(client: TestClient, kind: str, content: bytes, content_type: str, consent_ref: str) -> dict:
    response = client.post(
        "/api/v1/release/evidence",
        data={"kind": kind, "consentRef": consent_ref},
        files={"file": (f"proof.{content_type.split('/')[-1]}", content, content_type)},
        headers={"X-Demo-Role": "field_worker"},
    )
    assert response.status_code == 201, response.text
    return response.json()


def _handoff_body(image: dict, voice: dict, consent_ref: str) -> dict:
    return {
        "idempotencyKey": "task004-connected-chain-001",
        "case": {
            "farmerId": "RJ-DEMO-F1042",
            "plotId": "RJ-DEMO-PLOT-118",
            "crop": "bajra",
            "cropStage": "vegetative",
            "season": "kharif-2026",
            "district": "Jodhpur",
            "block": "Balesar",
            "lat": 26.391,
            "lon": 72.946,
            "areaAcres": 2.6,
            "createdOffline": True,
            "consent": {"given": True, "channel": "typed", "ref": consent_ref},
            "observation": {
                "symptomCategory": "white_growth",
                "symptomNote": "पत्ते के नीचे सफेद परत दिखाई दे रही है",
                "checklist": {"leafClose": True, "lowerLeaf": True, "wholePlant": True, "lightingOk": True},
                "imageHashes": [image["sha256"]],
                "evidenceRefs": [image["ref"]],
                "pixelQuality": {
                    "score": 0.91,
                    "passed": True,
                    "failedChecks": [],
                    "recaptureInstructions": [],
                },
                "edgeInference": {
                    "providerId": "pixfeat-v0",
                    "providerKind": "EDGE_HEURISTIC",
                    "modelVersion": "0.2.0",
                    "runtime": "typescript-canvas",
                    "durationMs": 18,
                    "topClass": "downy_mildew_suspect",
                    "topScore": 0.72,
                    "uncertainty": 0.31,
                    "abstain": False,
                    "abstainReasons": [],
                    "at": "2026-07-21T12:00:00+05:30",
                },
                "voiceEvidenceRef": voice["ref"],
                "voiceHash": voice["sha256"],
                "transcript": {
                    "provider": "BHASHINI_POC",
                    "providerState": "LIVE_BHASHINI_POC",
                    "serviceId": "demo-service-id",
                    "rawResponseHash": hashlib.sha256(b"bhashini-response").hexdigest(),
                    "originalTranscript": "पत्ते के नीचे सफेद परत है",
                    "confirmedTranscript": "पत्ते के नीचे सफेद परत दिखाई दे रही है",
                    "confirmationStatus": "CONFIRMED_AFTER_EDIT",
                    "consentRef": consent_ref,
                    "voiceNoteHash": voice["sha256"],
                    "confirmedAt": "2026-07-21T12:01:00+05:30",
                },
            },
        },
        "kvkId": "KVK-JODHPUR-1",
        "referralReason": "Possible bajra downy mildew pattern; local verification requested",
        "referralNote": "Please review the attached evidence metadata before field follow-up.",
        "urgency": "PRIORITY",
    }


def test_connected_evidence_survives_into_referral_pack(client: TestClient):
    consent_ref = "consent-task004-001"
    image = _upload(client, "image", b"\xff\xd8task004-jpeg-bytes\xff\xd9", "image/jpeg", consent_ref)
    voice = _upload(client, "voice", b"task004-webm-voice-bytes", "audio/webm", consent_ref)

    body = _handoff_body(image, voice, consent_ref)
    response = client.post("/api/v1/release/handoff", json=body, headers={"X-Demo-Role": "officer"})
    assert response.status_code == 201, response.text
    result = response.json()

    assert result["status"] == "applied"
    pack = result["pack"]
    assert pack["packVersion"] == "kvk-referral-pack/v2"
    assert pack["imageHashes"] == [image["sha256"]]
    assert pack["evidenceRefs"] == [image["ref"]]
    assert pack["imageQuality"]["score"] == 0.91
    assert pack["inference"]["provider"] == "pixfeat-v0"
    assert pack["inference"]["version"] == "0.2.0"
    assert pack["voiceEvidence"]["ref"] == voice["ref"]
    assert pack["voiceEvidence"]["sha256"] == voice["sha256"]
    assert pack["transcript"]["confirmationStatus"] == "CONFIRMED_AFTER_EDIT"
    assert pack["transcript"]["rawResponseHash"]

    case = result["case"]
    observation = case["observations"][-1]
    assert observation["imageHashes"] == [image["sha256"]]
    assert observation["pixelQuality"]["passed"] is True
    assert observation["edgeInference"]["providerKind"] == "EDGE_HEURISTIC"
    assert observation["voiceEvidenceRef"] == voice["ref"]
    assert observation["voiceTranscript"]["confirmedTranscript"].startswith("पत्ते")
    assert any(event["type"] == "connected_evidence_preserved" for event in case["timeline"])
    assert any(event["type"] == "voice_transcript_confirmed" for event in case["timeline"])

    fetched = client.get(f"/api/v1/release/cases/{case['id']}")
    assert fetched.status_code == 200
    assert fetched.json()["case"]["observations"][-1]["imageHashes"] == [image["sha256"]]

    replay = client.post("/api/v1/release/handoff", json=body, headers={"X-Demo-Role": "officer"})
    assert replay.status_code == 201
    assert replay.json()["status"] == "already_applied"
    assert replay.json()["case"]["id"] == case["id"]


def test_release_handoff_rejects_missing_or_mismatched_consent(client: TestClient):
    image = _upload(client, "image", b"image-a", "image/jpeg", "consent-a")
    voice = _upload(client, "voice", b"voice-a", "audio/webm", "consent-a")
    body = _handoff_body(image, voice, "consent-b")
    response = client.post("/api/v1/release/handoff", json=body, headers={"X-Demo-Role": "officer"})
    assert response.status_code == 422
    assert "consent reference" in response.json()["detail"].lower()


def test_release_evidence_type_and_role_guards(client: TestClient):
    bad_type = client.post(
        "/api/v1/release/evidence",
        data={"kind": "voice", "consentRef": "c-1"},
        files={"file": ("payload.exe", b"bad", "application/octet-stream")},
        headers={"X-Demo-Role": "field_worker"},
    )
    assert bad_type.status_code == 415

    consent_ref = "consent-role-guard"
    image = _upload(client, "image", b"image-role", "image/jpeg", consent_ref)
    voice = _upload(client, "voice", b"voice-role", "audio/webm", consent_ref)
    forbidden = client.post(
        "/api/v1/release/handoff",
        json=_handoff_body(image, voice, consent_ref),
        headers={"X-Demo-Role": "field_worker"},
    )
    assert forbidden.status_code == 403
