"""Task 003 Phase 2B — Bhashini Hindi PoC adapter tests.

Covers: credentials-required state (endpoint + adapter), the mocked live
contract (official ULCA sequence: config → callback compute), config caching,
timeout/unavailable/config-error mapping, the TTS non-chemical allowlist
guard, and the audited voice-transcript confirmation flow (incl. regional
human-review routing). No real credentials are used anywhere.
"""
from __future__ import annotations

import socket
import urllib.error

import pytest
from fastapi.testclient import TestClient

from app.bhashini import (
    BhashiniAdapter, BhashiniError,
    STATE_CONFIG_ERROR, STATE_CREDS, STATE_LIVE, STATE_TIMEOUT, STATE_UNAVAILABLE,
    TTS_KINDS,
)
from app.main import app

CREDS = {
    "BHASHINI_ENABLED": "1",
    "BHASHINI_USER_ID": "demo-user",
    "BHASHINI_API_KEY": "demo-key",
    "BHASHINI_PIPELINE_ID": "demo-pipeline",
}


@pytest.fixture()
def client():
    with TestClient(app) as c:
        c.post("/api/v1/demo/reset")
        yield c


def fake_transport(url, payload, headers, timeout):
    """Mocked official-sequence transport (see data/reference/bhashini-sample-request.json)."""
    if "getModelsPipeline" in url:
        return 200, {
            "pipelineInferenceAPIEndPoint": {
                "callbackUrl": "https://callback.example/inference",
                "inferenceApiKey": {"name": "Authorization", "value": "runtime-key"},
            },
            "pipelineResponseConfig": [
                {"taskType": "asr", "config": [{"serviceId": "asr-hi-1"}]},
                {"taskType": "tts", "config": [{"serviceId": "tts-hi-1"}]},
            ],
        }
    task = payload["pipelineTasks"][0]["taskType"]
    if task == "asr":
        return 200, {"pipelineResponse": [{"taskType": "asr", "output": [{"source": "पत्तियों पर सफ़ेद धब्बे हैं"}]}]}
    return 200, {"pipelineResponse": [{"taskType": "tts", "audio": [{"audioContent": "QUJD"}]}]}


def make_adapter(**env_over):
    env = {**CREDS, **env_over}
    return BhashiniAdapter(env=env, transport=fake_transport)


# ---------------- credentials-required (no env) ----------------

def test_status_reports_credentials_required(client, monkeypatch):
    for k in CREDS:
        monkeypatch.delenv(k, raising=False)
    body = client.get("/api/v1/bhashini/status").json()
    assert body["state"] == STATE_CREDS
    assert body["credentialsConfigured"] is False
    assert "BHASHINI_API_KEY" in body["missingEnv"]
    assert body["setupDoc"] == "docs/integrations/bhashini.md"
    # never echoes secret material
    assert "demo-key" not in str(body)


def test_asr_and_tts_reject_without_credentials(client, monkeypatch):
    for k in CREDS:
        monkeypatch.delenv(k, raising=False)
    r = client.post("/api/v1/bhashini/asr", json={
        "audioBase64": "QUJD", "mimeType": "audio/webm",
        "consentRef": "consent-1", "caseRef": "C-2614"})
    assert r.status_code == 409
    assert r.json()["detail"]["code"] == STATE_CREDS
    t = client.post("/api/v1/bhashini/tts", json={"kind": "case_received", "params": {"case_id": "C-2614"}})
    assert t.status_code == 409
    assert t.json()["detail"]["code"] == STATE_CREDS


# ---------------- mocked live contract ----------------

def test_asr_contract_live_state_and_unreviewed_transcript():
    ad = make_adapter()
    out = ad.asr("QUJD", "audio/webm", consent_ref="c1", case_ref="C-2614")
    assert out["state"] == STATE_LIVE
    assert out["transcript"] == "पत्तियों पर सफ़ेद धब्बे हैं"
    assert out["serviceId"] == "asr-hi-1"
    assert out["sourceLanguage"] == "hi"
    assert out["latencyMs"] >= 0
    assert len(out["rawResponseHash"]) == 64
    # never auto-verified
    assert out["confirmationStatus"] == "UNREVIEWED"
    assert out["verified"] is False


def test_pipeline_config_is_cached():
    calls = []
    def counting(url, payload, headers, timeout):
        calls.append(url)
        return fake_transport(url, payload, headers, timeout)
    ad = BhashiniAdapter(env=dict(CREDS), transport=counting)
    ad.asr("QUJD", "audio/webm", consent_ref="c1", case_ref="C-2614")
    ad.asr("QUJD", "audio/webm", consent_ref="c1", case_ref="C-2614")
    configs = [u for u in calls if "getModelsPipeline" in u]
    assert len(configs) == 1  # cached — not repeated per call


def test_timeout_and_unavailable_and_config_error_mapping():
    def timeout_transport(url, payload, headers, timeout):
        raise socket.timeout("slow")
    with pytest.raises(BhashiniError) as e1:
        BhashiniAdapter(env=dict(CREDS), transport=timeout_transport).asr("QUJD", "audio/webm", consent_ref="c", case_ref="C-2614")
    assert e1.value.state == STATE_TIMEOUT

    def down_transport(url, payload, headers, timeout):
        raise urllib.error.URLError("connection refused")
    with pytest.raises(BhashiniError) as e2:
        BhashiniAdapter(env=dict(CREDS), transport=down_transport).asr("QUJD", "audio/webm", consent_ref="c", case_ref="C-2614")
    assert e2.value.state == STATE_UNAVAILABLE

    def bad_config(url, payload, headers, timeout):
        return 500, {"error": "bad pipeline"}
    with pytest.raises(BhashiniError) as e3:
        BhashiniAdapter(env=dict(CREDS), transport=bad_config).asr("QUJD", "audio/webm", consent_ref="c", case_ref="C-2614")
    assert e3.value.state == STATE_CONFIG_ERROR


def test_tts_allowlist_guard_and_contract():
    ad = make_adapter()
    out = ad.tts("case_received", {"case_id": "C-2614"})
    assert out["state"] == STATE_LIVE
    assert out["audioBase64"] == "QUJD"
    assert "C-2614" in out["spokenText"]
    assert out["chemicalContent"] is False
    # free text / unknown kinds are rejected outright
    with pytest.raises(BhashiniError) as e1:
        ad.tts("read_this_arbitrary_chemical_advisory")
    assert e1.value.state == "BAD_TTS_KIND"
    # unsafe params rejected (only identifier slots allowed)
    with pytest.raises(BhashiniError) as e2:
        ad.tts("case_received", {"chemical": "chlorothalonil 75% WP"})
    assert e2.value.state == "BAD_TTS_PARAM"
    # every template is non-chemical by construction
    for kind in TTS_KINDS:
        assert kind in ("recapture_guidance", "case_received", "expert_review_needed",
                        "safe_non_chemical_instruction", "follow_up_reminder")


def test_endpoint_live_path_with_mocked_pipeline(client, monkeypatch):
    for k, v in CREDS.items():
        monkeypatch.setenv(k, v)
    monkeypatch.setattr("app.bhashini.adapter_from_env",
                        lambda: BhashiniAdapter(env=dict(CREDS), transport=fake_transport))
    r = client.post("/api/v1/bhashini/asr", json={
        "audioBase64": "QUJD", "mimeType": "audio/webm",
        "consentRef": "consent-1", "caseRef": "C-2614"})
    assert r.status_code == 200
    assert r.json()["state"] == STATE_LIVE
    assert r.json()["confirmationStatus"] == "UNREVIEWED"


# ---------------- transcript confirmation (audited) ----------------

def _mk_case(client) -> str:
    payload = {
        "farmerId": "RJ-DEMO-F1042", "plotId": "RJ-DEMO-PLOT-118", "crop": "bajra",
        "cropStage": "vegetative", "season": "kharif-2026", "district": "Jodhpur",
        "block": "Balesar", "lat": 26.391, "lon": 72.946, "areaAcres": 2.6,
        "consent": {"given": True, "channel": "voice"},
    }
    return client.post("/api/v1/cases", json=payload).json()["id"]


def test_voice_transcript_confirmation_is_audited(client):
    cid = _mk_case(client)
    r = client.post(f"/api/v1/cases/{cid}/voice-transcript", json={
        "transcript": "पत्तियों पर सफ़ेद धब्बे हैं, संपादित पुष्टि की",
        "confirmationStatus": "CONFIRMED_AFTER_EDIT",
        "consentRef": "consent-1", "voiceNoteHash": "ab" * 16})
    assert r.status_code == 200
    assert r.json()["confirmationStatus"] == "CONFIRMED_AFTER_EDIT"
    case = client.get(f"/api/v1/cases/{cid}").json()
    events = [e for e in case["timeline"] if e["type"] == "voice_transcript_confirmed"]
    assert len(events) == 1
    assert "after edit" in events[0]["summary"]


def test_voice_transcript_rejects_unconfirmed_and_empty(client):
    cid = _mk_case(client)
    bad = client.post(f"/api/v1/cases/{cid}/voice-transcript", json={
        "transcript": "x", "confirmationStatus": "AUTO_ACCEPTED", "consentRef": "c"})
    assert bad.status_code == 422
    empty = client.post(f"/api/v1/cases/{cid}/voice-transcript", json={
        "transcript": "  ", "confirmationStatus": "CONFIRMED_AS_RETURNED", "consentRef": "c"})
    assert empty.status_code == 422
    missing = client.post("/api/v1/cases/C-9999/voice-transcript", json={
        "transcript": "x", "confirmationStatus": "CONFIRMED_AS_RETURNED", "consentRef": "c"})
    assert missing.status_code == 404


def test_regional_voice_note_routes_to_human_review(client):
    cid = _mk_case(client)
    r = client.post(f"/api/v1/cases/{cid}/voice-transcript", json={
        "transcript": "(Marwari voice note — manual note attached)",
        "confirmationStatus": "CONFIRMED_AS_RETURNED",
        "consentRef": "c", "regional": True})
    assert r.status_code == 200
    assert r.json()["regionalReviewRequired"] is True
    case = client.get(f"/api/v1/cases/{cid}").json()
    assert case["state"] == "AWAITING_EXPERT"
    assert any(e["type"] == "regional_speech_review" and "HUMAN REVIEW REQUIRED" in e["summary"]
               for e in case["timeline"])
