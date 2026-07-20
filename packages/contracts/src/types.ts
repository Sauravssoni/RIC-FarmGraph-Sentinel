/**
 * FarmGraph Rakshak — shared domain contracts (Task 001 prototype).
 * These types mirror data/demo/seed.json and the FastAPI pydantic models.
 * Provenance rule: every record carries or inherits SIMULATED provenance.
 */

export type Provenance = "SIMULATED";

export type CaseState =
  | "DRAFT"
  | "CAPTURE_PENDING"
  | "READY_FOR_TRIAGE"
  | "TRIAGED"
  | "NEEDS_RECAPTURE"
  | "AWAITING_EXPERT"
  | "EXPERT_CONFIRMED"
  | "EXPERT_CORRECTED"
  | "FIELD_VISIT_REQUIRED"
  | "ADVISORY_ISSUED"
  | "FOLLOW_UP_DUE"
  | "IMPROVING"
  | "NOT_IMPROVING"
  | "RESOLVED"
  | "CLOSED_UNKNOWN"
  | "CLOSED_DUPLICATE";

export type Role = "farmer" | "field_worker" | "expert" | "district_officer" | "state_admin";

export interface FarmerReference { id: string; pseudonym: string; district: string; block: string; }
export interface PlotReference { id: string; farmerId: string; district: string; block: string; lat: number; lon: number; areaAcres: number; soilNote: string; }
export interface CropSeason { id: string; plotId: string; crop: string; season: string; stage: string; sownOn: string; }
export interface ConsentRecord { given: boolean; at: string; channel: "voice" | "typed"; purposeNote: string; }

export interface CaptureChecklist { leafClose: boolean; lowerLeaf: boolean; wholePlant: boolean; lightingOk: boolean; }
export interface CaptureQuality {
  coverageScore: number;
  passed: boolean;
  issues: string[];
  recaptureRequests: string[];
}
export interface CropObservation {
  id: string; at: string; symptomCategory: string; symptomNote: string;
  checklist: CaptureChecklist; imageCount: number; imageRef: string; quality: CaptureQuality;
}
export interface EvidenceAsset { ref: string; kind: "simulated-image"; note: string; provenance: Provenance; }

export interface DiagnosisCandidate {
  conditionId: string; label: string; simConfidence: number;
  reasons: string[]; missingEvidence: string[];
}
export interface DiagnosisRouting { decision: "autonomous" | "expert" | "abstain"; reason: string; }
export interface DiagnosisResult {
  provider: string; modelVersion: string; provenance: Provenance; at: string;
  crop: string; symptomCategory: string;
  candidates: DiagnosisCandidate[]; margin: number;
  routing: DiagnosisRouting; highSpreadRisk: boolean; escalationRequired: boolean;
  recommendedNext: string[]; thresholdsUsed: Record<string, number>; note: string;
}

export type ReviewDecision = "confirm" | "correct" | "unknown" | "field_visit" | "recapture";
export interface ExpertReview {
  id: string; at: string; reviewer: string; decision: ReviewDecision;
  conditionId: string | null; note: string;
}

export type FollowUpStatus = "improving" | "not_improving" | "resolved";
export interface FollowUp { id: string; at: string; channel: string; status: FollowUpStatus; note: string; }
export interface Outcome { status: "improving" | "not_improving" | "resolved" | "unknown"; note: string; updatedAt: string; }

export interface TimelineEvent {
  id: string; at: string; type: string; actor: string; summary: string; provenance: Provenance;
}
export interface AuditEvent extends TimelineEvent { caseId: string | null; }

export interface Case {
  id: string; farmerId: string; plotId: string; crop: string; cropStage: string; season: string;
  district: string; block: string; lat: number; lon: number; areaAcres: number;
  state: CaseState; createdAt: string; updatedAt: string;
  createdOffline: boolean; pendingSync: boolean; syncNote?: string;
  consent: ConsentRecord;
  observations: CropObservation[]; diagnosis: DiagnosisResult | null;
  reviews: ExpertReview[]; advisoryRef: string | null;
  followUps: FollowUp[]; outcome: Outcome | null;
  expertConfirmedCondition: string | null; duplicateOf: string | null;
  timeline: TimelineEvent[];
}

export type ClusterStatus = "SUSPECTED" | "VERIFIED" | "DISMISSED" | "WATCH";
export interface ClusterSignals {
  spatialDensity: number; temporalGrowth: number; cropStageCompat: number;
  severityIndex: number; duplicatePenalty: number;
}
export interface OutbreakCluster {
  id: string; name: string; crop: string; conditionId: string; status: ClusterStatus;
  centerLat: number; centerLon: number; radiusKm: number;
  memberCaseIds: string[]; createdAt: string; weatherSuitability: number;
  assignedOfficer: string; slaHours: number; seedSignals: ClusterSignals;
  dismissedAt?: string; dismissedReason?: string; dismissedBy?: string; note: string;
}
export interface OutbreakScoreBreakdown {
  clusterId: string; score: number; status: ClusterStatus;
  components: Record<string, number>;
  weights: Record<string, number>;
  duplicatePenalty: number;
  verifiedCount: number; memberCount: number;
  explanation: string; provenance: Provenance;
}

export type MissionStatus = "PLANNED" | "IN_PROGRESS" | "COMPLETED";
export interface MissionVisit { caseId: string; at: string; findings: string; }
export interface FieldMission {
  id: string; clusterId: string | null; purpose: string; assignedRole: string;
  status: MissionStatus; representativeCaseIds: string[]; routeOrder: string[];
  offlinePack: "READY" | "PENDING" | "SYNCED"; createdAt: string; completedAt?: string;
  infoGainNote: string; checklist: string[]; visits: MissionVisit[]; syncStatus: "SYNCED" | "PARTIAL" | "PENDING";
}

export type AdvisoryStatus = "DRAFT" | "EXPERT_REVIEWED" | "APPROVED" | "EXPIRED" | "WITHDRAWN";
export interface Advisory {
  id: string; conditionId: string; crop: string; version: string; status: AdvisoryStatus;
  reviewer: string | null; approvedOn: string | null; validUntil: string | null;
  supersededBy: string | null; createdAt: string;
  immediateSteps: string[]; monitoring: string[]; escalateWhen: string[];
  chemical: { locked: boolean; note: string }; note: string;
}

export interface ModelVersion {
  id: string; kind: "deterministic-demo" | "planned-ml"; status: string;
  trainedOn: string; evaluationNote: string; activatedAt: string | null;
}

export type IntegrationStatus = "SIMULATED" | "CONTRACT_DEFINED" | "PUBLIC_DATA_ONLY" | "AWAITING_AUTHORITY" | "NOT_STARTED";
export interface IntegrationAdapterStatus {
  id: string; name: string; purpose: string; direction: string; minFields: string[];
  consentBasis: string; status: IntegrationStatus; productionDependency: string;
  fallback: string; owner: string; lastChecked?: string;
}

export interface Persona { id: string; label: string; role: Role; note: string; }

export interface DemoSeed {
  meta: { scenario: string; demoNow: string; generatedBy: string; provenance: string; pilotRegions: string[] };
  personas: Persona[]; farmers: FarmerReference[]; plots: PlotReference[]; cropSeasons: CropSeason[];
  cases: Case[]; clusters: OutbreakCluster[]; missions: FieldMission[];
  advisories: Advisory[]; modelVersions: ModelVersion[]; auditEvents: AuditEvent[];
}

export interface OverviewKpis {
  activeCases: number; awaitingExpert: number; highPriority: number;
  suspectedClusters: number; medianReportToReviewHours: number | null;
  pendingSync: number; followUpCompletionPct: number; resolvedOrImproving: number;
}
