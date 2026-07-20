"""API v1 router — deterministic demo endpoints (all SIMULATED data)."""
from __future__ import annotations

import hashlib
from typing import Any, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile
from pydantic import BaseModel

from .. import models
from ..repository import AdvisoryRejected, MissionConflict
from ..security import require_expert, require_write

router = APIRouter(prefix="/api/v1", tags=["v1"])

EVIDENCE_MAX_BYTES = 15 * 1024 * 1024
EVIDENCE_TYPES = {"image/jpeg", "image/png", "image/webp"}


def repo(request: Request):
    return request.app.state.repo


async def rate_limit(request: Request) -> None:
    rl = getattr(request.app.state, "rate_limiter", None)
    if rl is not None:
        await rl(request)


def rejected(exc: AdvisoryRejected) -> HTTPException:
    return HTTPException(status_code=409, detail={"code": exc.code, "detail": exc.detail})


@router.get("/health", response_model=models.HealthResponse)
def health(request: Request) -> dict[str, Any]:
    r = repo(request)
    return {
        "status": "ok", "provider": "demo-repository",
        "persistence": r.persistence_label(),
        "provenance": "SIMULATED",
        "persistedBoot": r._persisted_boot,
        "security": "demo role auth via X-Demo-Role header (no credentials — demo only), restricted CORS, security headers, write rate limiting",
    }


@router.get("/overview", response_model=models.OverviewKpis)
def overview(request: Request) -> dict[str, Any]:
    return repo(request).overview()


@router.get("/cases", response_model=list[models.Case])
def list_cases(
    request: Request,
    state: Optional[str] = Query(None),
    crop: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    verifiedOnly: bool = Query(False),
    search: Optional[str] = Query(None),
) -> list[dict[str, Any]]:
    cases = repo(request).cases_list()
    if state:
        cases = [c for c in cases if c["state"] == state]
    if crop:
        cases = [c for c in cases if c["crop"] == crop]
    if district:
        cases = [c for c in cases if c["district"] == district]
    if verifiedOnly:
        cases = [c for c in cases if c.get("expertConfirmedCondition")]
    if search:
        s = search.lower()
        cases = [c for c in cases if s in c["id"].lower() or s in c["plotId"].lower() or s in c["farmerId"].lower()]
    return sorted(cases, key=lambda c: c["createdAt"], reverse=True)


@router.post("/cases", response_model=models.Case, status_code=201, dependencies=[Depends(rate_limit)])
def create_case(request: Request, body: models.CaseCreate, _role: str = Depends(require_write)) -> dict[str, Any]:
    r = repo(request)
    valid_crops = {c["id"] for c in r.taxonomy["crops"]}
    if body.crop not in valid_crops:
        raise HTTPException(status_code=422, detail=f"Unknown crop '{body.crop}'. Valid: {sorted(valid_crops)}")
    if not body.consent.given:
        raise HTTPException(status_code=422, detail="Consent is required to open a case")
    return r.create_case(body.model_dump())


@router.get("/cases/{case_id}", response_model=models.Case)
def get_case(request: Request, case_id: str) -> dict[str, Any]:
    case = repo(request).get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")
    return case


@router.post("/cases/{case_id}/observations", response_model=models.Observation, status_code=201, dependencies=[Depends(rate_limit)])
def add_observation(request: Request, case_id: str, body: models.ObservationCreate, _role: str = Depends(require_write)) -> dict[str, Any]:
    r = repo(request)
    case = r.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")
    valid_symptoms = {s["id"] for s in r.taxonomy["symptomCategories"]}
    if body.symptomCategory not in valid_symptoms:
        raise HTTPException(status_code=422, detail=f"Unknown symptomCategory '{body.symptomCategory}'")
    return r.add_observation(case, body.model_dump())


@router.post("/cases/{case_id}/triage", response_model=models.DiagnosisResult, dependencies=[Depends(rate_limit)])
def triage(request: Request, case_id: str, _role: str = Depends(require_write)) -> dict[str, Any]:
    r = repo(request)
    case = r.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")
    if not case["observations"] or not case["observations"][-1]["quality"]["passed"]:
        raise HTTPException(status_code=409, detail="No quality-passing observation exists; complete the capture gate first")
    return r.triage(case)


@router.post("/cases/{case_id}/reviews", dependencies=[Depends(rate_limit)])
def review(request: Request, case_id: str, body: models.ReviewCreate, _role: str = Depends(require_expert)) -> dict[str, Any]:
    r = repo(request)
    case = r.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")
    if body.decision in ("confirm", "correct"):
        condition = body.conditionId or (case["diagnosis"]["candidates"][0]["conditionId"] if case.get("diagnosis") else None)
        if not condition or condition not in r.engine.conditions:
            raise HTTPException(status_code=422, detail="A valid conditionId is required to confirm/correct")
    rec, affected = r.review(case, body.model_dump())
    return {"review": rec, "case": case, "clusterBreakdown": affected[0] if affected else None}


@router.post("/cases/{case_id}/follow-ups", response_model=models.FollowUp, status_code=201, dependencies=[Depends(rate_limit)])
def follow_up(request: Request, case_id: str, body: models.FollowUpCreate, _role: str = Depends(require_write)) -> dict[str, Any]:
    r = repo(request)
    case = r.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")
    return r.add_follow_up(case, body.model_dump())


@router.get("/expert-queue", response_model=list[models.QueueItem])
def expert_queue(request: Request) -> list[dict[str, Any]]:
    return repo(request).expert_queue()


@router.get("/outbreaks", response_model=list[models.ClusterWithScore])
def outbreaks(request: Request) -> list[dict[str, Any]]:
    return repo(request).clusters_with_scores()


@router.get("/outbreaks/{cluster_id}", response_model=models.ClusterDetail)
def outbreak_detail(request: Request, cluster_id: str) -> dict[str, Any]:
    r = repo(request)
    cl = r.clusters.get(cluster_id)
    if not cl:
        raise HTTPException(status_code=404, detail=f"Cluster {cluster_id} not found")
    members = [c for c in r.cluster_cases(cl) if c["state"] != "CLOSED_DUPLICATE"]
    breakdown = r.engine.outbreak_score(cl, r.cases_list())
    reps = r.engine.representative_order(cl, r.cases_list(), limit=3)
    acres = round(sum(c["areaAcres"] for c in members), 1)
    open_missions = [m for m in r.missions.values() if m.get("clusterId") == cluster_id and m["status"] != "COMPLETED"]
    return {**cl, "score": breakdown, "members": members, "recommendedCases": reps,
            "estimatedDemoAcresExposed": acres, "openMissions": open_missions}


@router.post("/outbreaks/{cluster_id}/missions", response_model=models.FieldMission, status_code=201, dependencies=[Depends(rate_limit)])
def create_mission(request: Request, cluster_id: str, _role: str = Depends(require_expert)) -> dict[str, Any]:
    r = repo(request)
    cl = r.clusters.get(cluster_id)
    if not cl:
        raise HTTPException(status_code=404, detail=f"Cluster {cluster_id} not found")
    try:
        return r.create_mission(cl)
    except MissionConflict as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.get("/missions", response_model=list[models.FieldMission])
def missions(request: Request) -> list[dict[str, Any]]:
    return list(repo(request).missions.values())


@router.get("/governance/models", response_model=list[models.ModelVersion])
def governance_models(request: Request) -> list[dict[str, Any]]:
    return repo(request).model_versions


@router.get("/governance/advisories", response_model=list[models.Advisory])
def governance_advisories(request: Request) -> list[dict[str, Any]]:
    return repo(request).advisories


@router.get("/integrations", response_model=list[models.IntegrationAdapterStatus])
def integrations(request: Request) -> list[dict[str, Any]]:
    r = repo(request)
    return [{**a, "lastChecked": r.integrations["lastChecked"]} for a in r.integrations["adapters"]]


@router.post("/demo/reset", dependencies=[Depends(rate_limit)])
def demo_reset(request: Request, _role: str = Depends(require_write)) -> dict[str, Any]:
    r = repo(request)
    r.reset()
    return {"status": "reset", "cases": len(r.cases), "clusters": len(r.clusters),
            "missions": len(r.missions), "advisories": len(r.advisories), "provenance": "SIMULATED"}


# ---------------------------------------------------------------------------
# Phase G/H endpoints (Task 002) — referrals, learning, advisory invariants,
# idempotent sync, digital-twin bundle, evidence upload, audit stream.
# ---------------------------------------------------------------------------


class ReferralCreate(BaseModel):
    kvkId: str
    reason: str
    note: str = ""
    channel: str = "in_app_pack"
    createdBy: Optional[str] = None


class ReferralStatusUpdate(BaseModel):
    status: str
    note: str = ""


class AdvisoryIssue(BaseModel):
    advisoryId: str


class SyncObservation(BaseModel):
    symptomCategory: str
    symptomNote: str = ""
    checklist: dict[str, bool]
    at: Optional[str] = None


class SyncCase(BaseModel):
    farmerId: str
    plotId: str
    crop: str
    cropStage: str
    season: str
    district: str
    block: str
    lat: float
    lon: float
    areaAcres: float
    consent: dict[str, Any]
    createdOffline: bool = True
    observations: list[SyncObservation] = []


class SyncBatch(BaseModel):
    idempotencyKey: str
    cases: list[SyncCase] = []


@router.get("/kvks")
def list_kvks(request: Request) -> dict[str, Any]:
    """Sourced KVK directory (data/reference/kvk-directory.json — real contacts
    from official ICAR-ATARI Zone-II sources, coordinates approximate)."""
    r = repo(request)
    return {"kvks": r.kvks, "source": "data/reference/kvk-directory.json", "provenance": "REFERENCE_DATA"}


@router.get("/digital-twins/{plot_id}")
def digital_twin(request: Request, plot_id: str) -> dict[str, Any]:
    bundle = repo(request).twin_bundle(plot_id)
    if bundle is None:
        raise HTTPException(status_code=404, detail=f"Plot {plot_id} not found")
    return bundle


@router.post("/cases/{case_id}/referrals", status_code=201, dependencies=[Depends(rate_limit)])
def create_referral(request: Request, case_id: str, body: ReferralCreate, _role: str = Depends(require_expert)) -> dict[str, Any]:
    r = repo(request)
    case = r.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")
    try:
        return r.create_referral(case, body.model_dump())
    except AdvisoryRejected as exc:
        raise HTTPException(status_code=422, detail={"code": exc.code, "detail": exc.detail}) from exc


@router.get("/referrals")
def list_referrals(request: Request) -> dict[str, Any]:
    r = repo(request)
    return {"referrals": list(r.referrals.values()), "provenance": "SIMULATED"}


@router.post("/referrals/{ref_id}/status", dependencies=[Depends(rate_limit)])
def update_referral_status(request: Request, ref_id: str, body: ReferralStatusUpdate, _role: str = Depends(require_expert)) -> dict[str, Any]:
    try:
        return repo(request).update_referral(ref_id, body.status, body.note)
    except AdvisoryRejected as exc:
        status = 404 if exc.code == "REFERRAL_NOT_FOUND" else 409
        raise HTTPException(status_code=status, detail={"code": exc.code, "detail": exc.detail}) from exc


@router.get("/learning/records")
def learning_records(request: Request) -> dict[str, Any]:
    r = repo(request)
    return {"records": list(r.learning_records.values()), "provenance": "SIMULATED"}


@router.get("/learning/summary")
def learning_summary(request: Request) -> dict[str, Any]:
    return repo(request).learning_summary()


@router.post("/cases/{case_id}/advisory-issue", dependencies=[Depends(rate_limit)])
def advisory_issue(request: Request, case_id: str, body: AdvisoryIssue, _role: str = Depends(require_expert)) -> dict[str, Any]:
    """Issue an advisory only if every safety invariant passes (approved,
    not superseded, not expired, crop-matched, expert-reviewed, condition-
    matched). 409 with a machine-readable code otherwise."""
    r = repo(request)
    case = r.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")
    try:
        return r.issue_advisory(case, body.advisoryId)
    except AdvisoryRejected as exc:
        raise rejected(exc) from exc


@router.post("/sync/batch", dependencies=[Depends(rate_limit)])
def sync_batch(request: Request, body: SyncBatch, _role: str = Depends(require_write)) -> dict[str, Any]:
    """Idempotent offline-outbox sync — the same idempotencyKey never applies
    twice; replays return the original result with status=already_applied."""
    r = repo(request)
    valid_crops = {c["id"] for c in r.taxonomy["crops"]}
    for item in body.cases:
        if item.crop not in valid_crops:
            raise HTTPException(status_code=422, detail=f"Unknown crop '{item.crop}'. Valid: {sorted(valid_crops)}")
        if not item.consent.get("given"):
            raise HTTPException(status_code=422, detail="Consent is required to sync a case")
    try:
        return r.sync_batch(body.model_dump())
    except AdvisoryRejected as exc:
        raise HTTPException(status_code=422, detail={"code": exc.code, "detail": exc.detail}) from exc


@router.post("/evidence", status_code=201, dependencies=[Depends(rate_limit)])
async def upload_evidence(request: Request, file: UploadFile = File(...), _role: str = Depends(require_write)) -> dict[str, Any]:
    """Validated evidence upload: jpeg/png/webp only, ≤15 MB, SHA-256 hashed,
    duplicate detection by content hash. Stored under data/runtime/evidence/
    (demo blob store — labelled, not production object storage)."""
    if file.content_type not in EVIDENCE_TYPES:
        raise HTTPException(status_code=415, detail=f"Unsupported content type '{file.content_type}'. Allowed: {sorted(EVIDENCE_TYPES)}")
    data = await file.read()
    if len(data) > EVIDENCE_MAX_BYTES:
        raise HTTPException(status_code=413, detail=f"Evidence exceeds {EVIDENCE_MAX_BYTES // (1024 * 1024)} MB limit")
    sha = hashlib.sha256(data).hexdigest()
    store_dir = repo(request).store.path.parent / "evidence" if repo(request).store is not None else None
    duplicate = False
    if store_dir is not None:
        store_dir.mkdir(parents=True, exist_ok=True)
        existing = repo(request).store.get("kv_meta", f"evidence:{sha}")
        duplicate = existing is not None
        if not duplicate:
            ext = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}[file.content_type]
            (store_dir / f"{sha}{ext}").write_bytes(data)
            repo(request).store.put("kv_meta", f"evidence:{sha}", {"sha256": sha, "bytes": len(data), "contentType": file.content_type})
    return {
        "sha256": sha, "bytes": len(data), "contentType": file.content_type,
        "duplicate": duplicate,
        "stored": store_dir is not None,
        "note": "Demo blob store (local disk). EXIF metadata is not parsed or retained by this endpoint; the web capture pipeline strips EXIF by re-encoding before upload.",
        "provenance": "SIMULATED",
    }


@router.get("/governance/audit")
def governance_audit(request: Request, limit: int = Query(200, ge=1, le=1000)) -> dict[str, Any]:
    r = repo(request)
    return {"events": r.audit_events[-limit:], "total": len(r.audit_events), "provenance": "SIMULATED"}
