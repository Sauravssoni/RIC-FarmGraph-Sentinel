"""Pydantic v2 models for the FarmGraph Rakshak demo API.

Request bodies are strictly validated. Response models mirror
packages/contracts/src/types.ts and data/demo/seed.json.
"""
from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import BaseModel, Field

CaseState = Literal[
    "DRAFT", "CAPTURE_PENDING", "READY_FOR_TRIAGE", "TRIAGED", "NEEDS_RECAPTURE",
    "AWAITING_EXPERT", "EXPERT_CONFIRMED", "EXPERT_CORRECTED", "FIELD_VISIT_REQUIRED",
    "ADVISORY_ISSUED", "FOLLOW_UP_DUE", "IMPROVING", "NOT_IMPROVING", "RESOLVED",
    "CLOSED_UNKNOWN", "CLOSED_DUPLICATE",
]

ReviewDecision = Literal["confirm", "correct", "unknown", "field_visit", "recapture"]
FollowUpStatus = Literal["improving", "not_improving", "resolved"]


class CaptureChecklist(BaseModel):
    leafClose: bool = False
    lowerLeaf: bool = False
    wholePlant: bool = False
    lightingOk: bool = False


class ConsentIn(BaseModel):
    given: bool
    channel: Literal["voice", "typed"] = "typed"


class CaseCreate(BaseModel):
    farmerId: str = Field(min_length=3)
    plotId: str = Field(min_length=3)
    crop: str
    cropStage: str
    season: str
    district: str
    block: str
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    areaAcres: float = Field(gt=0, le=10000)
    createdOffline: bool = False
    consent: ConsentIn


class ObservationCreate(BaseModel):
    at: Optional[str] = None
    symptomCategory: str = Field(min_length=2)
    symptomNote: str = ""
    checklist: CaptureChecklist


class ReviewCreate(BaseModel):
    decision: ReviewDecision
    conditionId: Optional[str] = None
    note: str = Field(min_length=3, max_length=2000)
    reviewer: Optional[str] = None


class FollowUpCreate(BaseModel):
    status: FollowUpStatus
    note: str = Field(min_length=3, max_length=2000)


class CaptureQuality(BaseModel):
    coverageScore: float
    passed: bool
    issues: list[str]
    recaptureRequests: list[str]


class DiagnosisCandidate(BaseModel):
    conditionId: str
    label: str
    simConfidence: float
    reasons: list[str]
    missingEvidence: list[str]


class DiagnosisRouting(BaseModel):
    decision: Literal["autonomous", "expert", "abstain"]
    reason: str


class DiagnosisResult(BaseModel):
    provider: str
    modelVersion: str
    provenance: str
    at: str
    crop: str
    symptomCategory: str
    candidates: list[DiagnosisCandidate]
    margin: float
    routing: DiagnosisRouting
    highSpreadRisk: bool
    escalationRequired: bool
    recommendedNext: list[str]
    thresholdsUsed: dict[str, float]
    note: str


class TimelineEvent(BaseModel):
    id: str
    at: str
    type: str
    actor: str
    summary: str
    provenance: str = "SIMULATED"


class Observation(BaseModel):
    id: str
    at: str
    symptomCategory: str
    symptomNote: str
    checklist: CaptureChecklist
    imageCount: int
    imageRef: str
    quality: CaptureQuality


class ExpertReview(BaseModel):
    id: str
    at: str
    reviewer: str
    decision: ReviewDecision
    conditionId: Optional[str]
    note: str


class FollowUp(BaseModel):
    id: str
    at: str
    channel: str
    status: FollowUpStatus
    note: str


class Outcome(BaseModel):
    status: Literal["improving", "not_improving", "resolved", "unknown"]
    note: str
    updatedAt: str


class ConsentRecord(BaseModel):
    given: bool
    at: str
    channel: str
    purposeNote: str


class Case(BaseModel):
    id: str
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
    state: CaseState
    createdAt: str
    updatedAt: str
    createdOffline: bool
    pendingSync: bool
    syncNote: Optional[str] = None
    consent: ConsentRecord
    observations: list[Observation]
    diagnosis: Optional[DiagnosisResult]
    reviews: list[ExpertReview]
    advisoryRef: Optional[str]
    followUps: list[FollowUp]
    outcome: Optional[Outcome]
    expertConfirmedCondition: Optional[str]
    duplicateOf: Optional[str]
    timeline: list[TimelineEvent]


class ClusterSignals(BaseModel):
    spatialDensity: float
    temporalGrowth: float
    cropStageCompat: float
    severityIndex: float
    duplicatePenalty: float


class OutbreakCluster(BaseModel):
    id: str
    name: str
    crop: str
    conditionId: str
    status: Literal["SUSPECTED", "VERIFIED", "DISMISSED", "WATCH"]
    centerLat: float
    centerLon: float
    radiusKm: float
    memberCaseIds: list[str]
    createdAt: str
    weatherSuitability: float
    assignedOfficer: str
    slaHours: int
    seedSignals: ClusterSignals
    dismissedAt: Optional[str] = None
    dismissedReason: Optional[str] = None
    dismissedBy: Optional[str] = None
    note: str


class OutbreakScoreBreakdown(BaseModel):
    clusterId: str
    score: float
    status: str
    components: dict[str, float]
    weights: dict[str, float]
    duplicatePenalty: float
    verifiedCount: int
    memberCount: int
    explanation: str
    provenance: str = "SIMULATED"


class ClusterWithScore(OutbreakCluster):
    score: OutbreakScoreBreakdown


class ClusterDetail(ClusterWithScore):
    members: list[Case]
    recommendedCases: list[str]
    estimatedDemoAcresExposed: float
    openMissions: list[dict[str, Any]]


class MissionVisit(BaseModel):
    caseId: str
    at: str
    findings: str


class FieldMission(BaseModel):
    id: str
    clusterId: Optional[str]
    purpose: str
    assignedRole: str
    status: Literal["PLANNED", "IN_PROGRESS", "COMPLETED"]
    representativeCaseIds: list[str]
    routeOrder: list[str]
    offlinePack: Literal["READY", "PENDING", "SYNCED"]
    createdAt: str
    completedAt: Optional[str] = None
    infoGainNote: str
    checklist: list[str]
    visits: list[MissionVisit]
    syncStatus: Literal["SYNCED", "PARTIAL", "PENDING"]


class Advisory(BaseModel):
    id: str
    conditionId: str
    crop: str
    version: str
    status: Literal["DRAFT", "EXPERT_REVIEWED", "APPROVED", "EXPIRED", "WITHDRAWN"]
    reviewer: Optional[str]
    approvedOn: Optional[str]
    validUntil: Optional[str]
    supersededBy: Optional[str]
    createdAt: str
    immediateSteps: list[str]
    monitoring: list[str]
    escalateWhen: list[str]
    chemical: dict[str, Any]
    note: str


class ModelVersion(BaseModel):
    id: str
    kind: str
    status: str
    trainedOn: str
    evaluationNote: str
    activatedAt: Optional[str]


class IntegrationAdapterStatus(BaseModel):
    id: str
    name: str
    purpose: str
    direction: str
    minFields: list[str]
    consentBasis: str
    status: Literal["SIMULATED", "CONTRACT_DEFINED", "PUBLIC_DATA_ONLY", "AWAITING_AUTHORITY", "NOT_STARTED"]
    productionDependency: str
    fallback: str
    owner: str
    lastChecked: Optional[str] = None


class OverviewKpis(BaseModel):
    activeCases: int
    awaitingExpert: int
    highPriority: int
    suspectedClusters: int
    medianReportToReviewHours: Optional[float]
    pendingSync: int
    followUpCompletionPct: float
    resolvedOrImproving: int
    generatedAt: str
    demoNow: str
    provenance: str = "SIMULATED"


class QueueItem(BaseModel):
    case: Case
    priorityScore: float
    priorityReason: str


class HealthResponse(BaseModel):
    status: str
    provider: str
    persistence: str
    provenance: str = "SIMULATED"
    persistedBoot: bool = False
    security: str = ""
