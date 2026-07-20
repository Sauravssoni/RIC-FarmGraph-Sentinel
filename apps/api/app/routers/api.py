"""API v1 router — deterministic demo endpoints (all SIMULATED data)."""
from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Query, Request

from .. import models
from ..repository import MissionConflict

router = APIRouter(prefix="/api/v1", tags=["v1"])


def repo(request: Request):
    return request.app.state.repo


@router.get("/health", response_model=models.HealthResponse)
def health(request: Request) -> dict[str, Any]:
    return {"status": "ok", "provider": "demo-repository", "persistence": "in-memory (documented Task 001 limitation)", "provenance": "SIMULATED"}


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


@router.post("/cases", response_model=models.Case, status_code=201)
def create_case(request: Request, body: models.CaseCreate) -> dict[str, Any]:
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


@router.post("/cases/{case_id}/observations", response_model=models.Observation, status_code=201)
def add_observation(request: Request, case_id: str, body: models.ObservationCreate) -> dict[str, Any]:
    r = repo(request)
    case = r.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")
    valid_symptoms = {s["id"] for s in r.taxonomy["symptomCategories"]}
    if body.symptomCategory not in valid_symptoms:
        raise HTTPException(status_code=422, detail=f"Unknown symptomCategory '{body.symptomCategory}'")
    return r.add_observation(case, body.model_dump())


@router.post("/cases/{case_id}/triage", response_model=models.DiagnosisResult)
def triage(request: Request, case_id: str) -> dict[str, Any]:
    r = repo(request)
    case = r.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")
    if not case["observations"] or not case["observations"][-1]["quality"]["passed"]:
        raise HTTPException(status_code=409, detail="No quality-passing observation exists; complete the capture gate first")
    return r.triage(case)


@router.post("/cases/{case_id}/reviews")
def review(request: Request, case_id: str, body: models.ReviewCreate) -> dict[str, Any]:
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


@router.post("/cases/{case_id}/follow-ups", response_model=models.FollowUp, status_code=201)
def follow_up(request: Request, case_id: str, body: models.FollowUpCreate) -> dict[str, Any]:
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


@router.post("/outbreaks/{cluster_id}/missions", response_model=models.FieldMission, status_code=201)
def create_mission(request: Request, cluster_id: str) -> dict[str, Any]:
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


@router.post("/demo/reset")
def demo_reset(request: Request) -> dict[str, Any]:
    r = repo(request)
    r.reset()
    return {"status": "reset", "cases": len(r.cases), "clusters": len(r.clusters),
            "missions": len(r.missions), "advisories": len(r.advisories), "provenance": "SIMULATED"}
