"""Task 004 connected evidence handoff.

This router closes the submission-critical continuity gap without changing the
stable Task 001-003 API contracts. It proves that consented image and voice
evidence, pixel-quality results, edge-inference metadata and a human-confirmed
transcript survive the full connected path into an authoritative demo case and
KVK referral pack.

All farmer/plot records remain synthetic demo records. Evidence is stored in a
labelled local demo blob store when SQLite persistence is enabled; in-memory
mode retains metadata only. No external KVK delivery is claimed.
"""
from __future__ import annotations

import hashlib
from datetime import datetime
from pathlib import Path
from typing import Any, Literal, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from pydantic import BaseModel, Field

from ..security import require_expert, require_write

router = APIRouter(prefix="/api/v1/release", tags=["Task 004 release proof"])

IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
VOICE_TYPES = {"audio/webm", "audio/ogg", "audio/mpeg", "audio/mp4", "audio/wav", "audio/x-wav"}
MAX_EVIDENCE_BYTES = 15 * 1024 * 1024


def repo(request: Request):
    return request.app.state.repo


async def rate_limit(request: Request) -> None:
    limiter = getattr(request.app.state, "rate_limiter", None)
    if limiter is not None:
        await limiter(request)


def now_iso() -> str:
    return datetime.now().astimezone().isoformat(timespec="seconds")


def evidence_meta_store(request: Request) -> dict[str, dict[str, Any]]:
    if not hasattr(request.app.state, "release_evidence"):
        request.app.state.release_evidence = {}
    return request.app.state.release_evidence


def get_evidence_meta(request: Request, ref: str) -> Optional[dict[str, Any]]:
    r = repo(request)
    if r.store is not None:
        return r.store.get("kv_meta", f"release-evidence:{ref}")
    return evidence_meta_store(request).get(ref)


class PixelQualityIn(BaseModel):
    score: float = Field(ge=0, le=1)
    passed: bool
    failedChecks: list[str] = Field(default_factory=list)
    recaptureInstructions: list[str] = Field(default_factory=list)


class EdgeInferenceIn(BaseModel):
    providerId: str
    providerKind: Literal["EDGE_MODEL", "EDGE_HEURISTIC", "DETERMINISTIC_FALLBACK", "EXPERT_ONLY"]
    modelVersion: str
    runtime: str
    durationMs: int = Field(ge=0)
    topClass: str
    topScore: float = Field(ge=0, le=1)
    uncertainty: float = Field(ge=0, le=1)
    abstain: bool
    abstainReasons: list[str] = Field(default_factory=list)
    at: str


class TranscriptIn(BaseModel):
    provider: str
    providerState: str
    serviceId: Optional[str] = None
    rawResponseHash: Optional[str] = None
    originalTranscript: str
    confirmedTranscript: str
    confirmationStatus: Literal["CONFIRMED_AS_RETURNED", "CONFIRMED_AFTER_EDIT"]
    consentRef: str
    voiceNoteHash: str
    confirmedAt: str


class ObservationIn(BaseModel):
    symptomCategory: str
    symptomNote: str = ""
    checklist: dict[str, bool]
    imageHashes: list[str] = Field(default_factory=list)
    evidenceRefs: list[str] = Field(default_factory=list)
    pixelQuality: PixelQualityIn
    edgeInference: EdgeInferenceIn
    voiceEvidenceRef: Optional[str] = None
    voiceHash: Optional[str] = None
    transcript: Optional[TranscriptIn] = None
    at: Optional[str] = None


class CaseIn(BaseModel):
    farmerId: str = "RJ-DEMO-F1042"
    plotId: str = "RJ-DEMO-PLOT-118"
    crop: str
    cropStage: str
    season: str
    district: str
    block: str
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    areaAcres: float = Field(gt=0, le=10000)
    consent: dict[str, Any]
    createdOffline: bool = True
    observation: ObservationIn


class HandoffIn(BaseModel):
    idempotencyKey: str = Field(min_length=8, max_length=160)
    case: CaseIn
    kvkId: str
    referralReason: str
    referralNote: str = ""
    urgency: Literal["ROUTINE", "PRIORITY", "URGENT"] = "PRIORITY"


@router.get("/health")
def release_health(request: Request) -> dict[str, Any]:
    r = repo(request)
    return {
        "status": "ok",
        "capability": "connected evidence → case → KVK referral pack",
        "persistence": r.persistence_label(),
        "evidenceMode": "local demo blob store" if r.store is not None else "metadata-only in-memory test mode",
        "provenance": "SIMULATED_DEMO_CASES",
    }


@router.post("/evidence", status_code=201, dependencies=[Depends(rate_limit)])
async def upload_release_evidence(
    request: Request,
    kind: Literal["image", "voice"] = Form(...),
    consentRef: str = Form(...),
    file: UploadFile = File(...),
    _role: str = Depends(require_write),
) -> dict[str, Any]:
    if not consentRef.strip():
        raise HTTPException(status_code=422, detail="A consent reference is required before evidence upload")
    allowed = IMAGE_TYPES if kind == "image" else VOICE_TYPES
    if file.content_type not in allowed:
        raise HTTPException(status_code=415, detail=f"Unsupported {kind} content type '{file.content_type}'. Allowed: {sorted(allowed)}")
    data = await file.read()
    if not data:
        raise HTTPException(status_code=422, detail="Evidence file is empty")
    if len(data) > MAX_EVIDENCE_BYTES:
        raise HTTPException(status_code=413, detail="Evidence exceeds the 15 MB demo limit")

    sha = hashlib.sha256(data).hexdigest()
    ref = f"evidence://sha256/{sha}"
    r = repo(request)
    existing = get_evidence_meta(request, ref)
    stored = False
    if r.store is not None:
        directory = Path(r.store.path).parent / "release-evidence"
        directory.mkdir(parents=True, exist_ok=True)
        extension = {
            "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp",
            "audio/webm": ".webm", "audio/ogg": ".ogg", "audio/mpeg": ".mp3",
            "audio/mp4": ".m4a", "audio/wav": ".wav", "audio/x-wav": ".wav",
        }[file.content_type]
        target = directory / f"{sha}{extension}"
        if not target.exists():
            target.write_bytes(data)
        stored = True

    metadata = {
        "ref": ref,
        "sha256": sha,
        "kind": kind,
        "bytes": len(data),
        "contentType": file.content_type,
        "consentRef": consentRef,
        "stored": stored,
        "duplicate": existing is not None,
        "uploadedAt": now_iso(),
        "provenance": "USER_CONSENTED_DEMO_EVIDENCE",
    }
    if r.store is not None:
        r.store.put("kv_meta", f"release-evidence:{ref}", metadata)
    else:
        evidence_meta_store(request)[ref] = metadata
    return metadata


@router.post("/handoff", status_code=201, dependencies=[Depends(rate_limit)])
def connected_handoff(request: Request, body: HandoffIn, _role: str = Depends(require_expert)) -> dict[str, Any]:
    r = repo(request)
    cache_key = f"release:{body.idempotencyKey}"
    cached = r._idem_cache.get(cache_key)
    if cached is not None:
        return {**cached, "status": "already_applied"}

    payload = body.case.model_dump()
    consent = payload.get("consent") or {}
    if not consent.get("given"):
        raise HTTPException(status_code=422, detail="Consent is required for connected evidence handoff")
    observation = payload.pop("observation")

    for ref in observation.get("evidenceRefs", []):
        meta = get_evidence_meta(request, ref)
        if meta is None or meta.get("kind") != "image":
            raise HTTPException(status_code=422, detail=f"Image evidence reference is missing or invalid: {ref}")
        if meta.get("consentRef") != consent.get("ref"):
            raise HTTPException(status_code=422, detail=f"Evidence consent reference does not match the case: {ref}")
    voice_ref = observation.get("voiceEvidenceRef")
    if voice_ref:
        meta = get_evidence_meta(request, voice_ref)
        if meta is None or meta.get("kind") != "voice":
            raise HTTPException(status_code=422, detail=f"Voice evidence reference is missing or invalid: {voice_ref}")
        if meta.get("consentRef") != consent.get("ref"):
            raise HTTPException(status_code=422, detail="Voice evidence consent reference does not match the case")

    created = r.create_case({
        **payload,
        "consent": {"given": True, "channel": consent.get("channel", "typed")},
    })
    obs = r.add_observation(created, {
        "symptomCategory": observation["symptomCategory"],
        "symptomNote": observation.get("symptomNote", ""),
        "checklist": observation["checklist"],
        "at": observation.get("at"),
    })
    obs.update({
        "imageIds": observation.get("evidenceRefs", []),
        "imageHashes": observation.get("imageHashes", []),
        "imageRef": observation.get("evidenceRefs", [obs.get("imageRef")])[0] if observation.get("evidenceRefs") else obs.get("imageRef"),
        "imageCount": len(observation.get("evidenceRefs", [])),
        "pixelQuality": observation["pixelQuality"],
        "edgeInference": observation["edgeInference"],
        "voiceNoteId": voice_ref,
        "voiceEvidenceRef": voice_ref,
        "voiceHash": observation.get("voiceHash"),
        "voiceTranscript": observation.get("transcript"),
    })

    if observation["pixelQuality"]["passed"]:
        r.triage(created)
    else:
        created["state"] = "NEEDS_RECAPTURE"

    at = now_iso()
    r._append(created, at, "connected_evidence_preserved", "field_worker (demo)",
              f"Connected handoff preserved {len(obs.get('imageHashes', []))} image hash(es), pixel quality and edge inference metadata")
    if voice_ref:
        r._append(created, at, "voice_evidence_preserved", "field_worker (demo)",
                  f"Voice evidence preserved at {voice_ref}; transcript confirmation={bool(observation.get('transcript'))}")
    if observation.get("transcript"):
        tr = observation["transcript"]
        r._append(created, at, "voice_transcript_confirmed", "field_worker (demo)",
                  f"{tr['provider']} transcript {tr['confirmationStatus']} — response hash {(tr.get('rawResponseHash') or 'not-returned')[:12]}")

    if r.store is not None:
        r.store.put("cases", created["id"], created)

    referral = r.create_referral(created, {
        "kvkId": body.kvkId,
        "reason": body.referralReason,
        "note": body.referralNote,
        "urgency": body.urgency,
        "createdBy": "officer — connected release proof",
    })
    pack = r.build_referral_pack(referral["id"])
    edge = observation["edgeInference"]
    transcript = observation.get("transcript")
    pack.update({
        "packVersion": "kvk-referral-pack/v2",
        "imageHashes": observation.get("imageHashes", []),
        "evidenceRefs": observation.get("evidenceRefs", []),
        "imageQuality": observation["pixelQuality"],
        "inference": {
            "provider": edge["providerId"],
            "providerKind": edge["providerKind"],
            "version": edge["modelVersion"],
            "runtime": edge["runtime"],
            "topLabel": edge["topClass"],
            "topScore": edge["topScore"],
            "uncertainty": edge["uncertainty"],
            "abstain": edge["abstain"],
        },
        "voiceEvidence": {
            "ref": voice_ref,
            "sha256": observation.get("voiceHash"),
            "present": bool(voice_ref),
        },
        "transcript": transcript,
        "provenance": "SIMULATED CASE + CONSENTED DEMO EVIDENCE; evidence hashes and provider metadata preserved end-to-end; KVK delivery not automated",
    })
    result = {
        "status": "applied",
        "idempotencyKey": body.idempotencyKey,
        "case": created,
        "referral": referral,
        "pack": pack,
        "auditEventCount": len(created.get("timeline", [])),
        "provenance": "CONNECTED_DEMO_BACKEND",
    }
    r._idem_cache[cache_key] = result
    return result


@router.get("/cases/{case_id}")
def release_case(request: Request, case_id: str) -> dict[str, Any]:
    case = repo(request).get_case(case_id)
    if case is None:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")
    return {"case": case, "provenance": "CONNECTED_DEMO_BACKEND"}
