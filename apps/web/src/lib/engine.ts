/**
 * Deterministic demo engine (TypeScript) — mirrors apps/api/app/engine.py and
 * data/demo/generate_seed.py exactly. NOT a trained model: all scores are
 * simulated and labelled as such. Thresholds are prototype policies
 * (data/demo/policy.json), not validated agronomic thresholds.
 */
import type {
  CaptureChecklist, CaptureQuality, Case, DiagnosisResult, OutbreakCluster, OutbreakScoreBreakdown,
} from "@contracts";
import { CONDITIONS, POLICY, TAXONOMY } from "./seed";

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = 6371.0;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(a));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function captureQuality(checklist: CaptureChecklist): CaptureQuality {
  const cq = POLICY.captureQuality;
  const w = cq.weights as Record<string, number>;
  const cov = round2(
    (checklist.leafClose ? w.leafClose : 0) +
    (checklist.lowerLeaf ? w.lowerLeaf : 0) +
    (checklist.wholePlant ? w.wholePlant : 0) +
    (checklist.lightingOk ? w.lightingOk : 0),
  );
  const issues: string[] = [];
  const reqs: string[] = [];
  if (!checklist.leafClose) { issues.push("Missing close-up of affected leaf"); reqs.push("leafClose"); }
  if (!checklist.lowerLeaf) { issues.push("Lower leaf surface not captured"); reqs.push("lowerLeaf"); }
  if (!checklist.wholePlant) { issues.push("Whole-plant context missing"); reqs.push("wholePlant"); }
  if (!checklist.lightingOk) { issues.push("Poor lighting / glare"); reqs.push("retake in better light"); }
  const secondary = [checklist.lowerLeaf, checklist.wholePlant].filter(Boolean).length;
  const passed = cov >= cq.minCoverage && checklist.leafClose && secondary >= cq.minSecondaryViews && checklist.lightingOk;
  return { coverageScore: cov, passed, issues: passed ? [] : issues, recaptureRequests: passed ? [] : reqs };
}

export function diagnose(crop: string, symptom: string, checklist: CaptureChecklist, at: string): DiagnosisResult {
  const key = `${crop}:${symptom}`;
  const table = TAXONOMY.diagnosisTable as unknown as Record<string, { conditionId: string; base: number }[]>;
  const rows = table[key] ?? [
    { conditionId: "unknown", base: 0.5 }, { conditionId: "healthy", base: 0.3 }, { conditionId: "unknown", base: 0.2 },
  ];
  const t = POLICY.triage;
  const penalty = checklist.lowerLeaf && checklist.wholePlant ? 0 : t.missingViewsScorePenalty;
  const reasons = TAXONOMY.reasons as Record<string, string[]>;
  const missing = TAXONOMY.missingEvidence as Record<string, string[]>;
  const candidates = rows.map((r, i) => {
    const score = i === 0 ? round2(Math.max(0.05, r.base - penalty)) : r.base;
    return {
      conditionId: r.conditionId,
      label: CONDITIONS[r.conditionId]?.labelEn ?? r.conditionId,
      simConfidence: score,
      reasons: reasons[r.conditionId] ?? reasons.unknown,
      missingEvidence: missing[r.conditionId] ?? missing._default,
    };
  });
  const lead = candidates[0];
  const second = candidates[1] ?? { simConfidence: 0 };
  const margin = round2(lead.simConfidence - second.simConfidence);
  const highSpread = (CONDITIONS[lead.conditionId]?.spreadRisk === "high") && lead.simConfidence >= t.highSpreadRiskMinScore;
  let routing: DiagnosisResult["routing"];
  if (lead.conditionId === "unknown" && lead.simConfidence >= t.abstainOtherThreshold) {
    routing = { decision: "abstain", reason: "Out-of-distribution indicator: no candidate strong enough. Expert must decide; never forced into a known label." };
  } else if (lead.simConfidence >= t.autonomousMinScore && margin >= t.autonomousMinMargin && !highSpread) {
    routing = { decision: "autonomous", reason: "Lead score and margin exceed prototype autonomous thresholds; safe advisory may issue without expert." };
  } else {
    routing = { decision: "expert", reason: `Lead score ${lead.simConfidence.toFixed(2)} below autonomous threshold ${t.autonomousMinScore} or margin ${margin.toFixed(2)} too small; expert review required.` };
  }
  return {
    provider: "demo-rules", modelVersion: "0.1.0-demo", provenance: "SIMULATED",
    at, crop, symptomCategory: symptom, candidates, margin, routing,
    highSpreadRisk: highSpread, escalationRequired: highSpread && t.highSpreadRiskEscalates,
    recommendedNext: routing.decision === "abstain" ? missing.unknown : (missing[lead.conditionId] ?? missing._default),
    thresholdsUsed: { autonomousMinScore: t.autonomousMinScore, autonomousMinMargin: t.autonomousMinMargin, abstainOtherThreshold: t.abstainOtherThreshold },
    note: "Simulated scores from deterministic demo rules — not measured model accuracy.",
  };
}

export function outbreakScore(cluster: OutbreakCluster, cases: Case[]): OutbreakScoreBreakdown {
  const members = cases.filter((c) => cluster.memberCaseIds.includes(c.id) && c.state !== "CLOSED_DUPLICATE");
  const verified = members.filter((c) => c.expertConfirmedCondition === cluster.conditionId);
  const memberCount = Math.max(1, members.length);
  const verifiedRatio = verified.length / memberCount;
  const ob = POLICY.outbreak;
  const w = ob.weights;
  const sig = cluster.seedSignals;
  const components = {
    verifiedRatio: Math.round(verifiedRatio * 1000) / 1000,
    spatialDensity: sig.spatialDensity,
    temporalGrowth: sig.temporalGrowth,
    cropStageCompat: sig.cropStageCompat,
    weatherSuitability: cluster.weatherSuitability,
    severityIndex: sig.severityIndex,
  };
  const positive = Object.entries(w).reduce((acc, [k, wt]) => acc + wt * components[k as keyof typeof components], 0);
  const penalty = ob.duplicatePenaltyWeight * sig.duplicatePenalty;
  const score = Math.round(Math.max(0, Math.min(100, 100 * (positive - penalty))) * 10) / 10;
  const status = cluster.status === "DISMISSED" ? "DISMISSED"
    : score >= ob.thresholds.verifiedOutbreak ? "VERIFIED"
    : score >= ob.thresholds.suspected ? "SUSPECTED" : "WATCH";
  const top = Object.entries(w)
    .map(([k, wt]) => [k, wt * components[k as keyof typeof components]] as const)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2);
  const explanation = `Score ${score} driven mainly by ${top[0][0]} (${components[top[0][0] as keyof typeof components]}) and ${top[1][0]} (${components[top[1][0] as keyof typeof components]}); ${verified.length}/${memberCount} member cases expert-verified; duplicate penalty ${sig.duplicatePenalty}.`;
  return {
    clusterId: cluster.id, score, status, components, weights: w,
    duplicatePenalty: sig.duplicatePenalty, verifiedCount: verified.length,
    memberCount: memberCount, explanation, provenance: "SIMULATED",
  };
}

export function expertPriority(c: Case): { score: number; reason: string } {
  let score = 10;
  const reasons: string[] = [];
  const d = c.diagnosis;
  if (d) {
    if (d.highSpreadRisk) { score += 50; reasons.push("high-spread-risk candidate"); }
    if (d.escalationRequired) { score += 25; reasons.push("escalation required by policy"); }
    const lead = d.candidates[0];
    if (lead.conditionId === "unknown") { score += 20; reasons.push("abstained / out-of-distribution"); }
    if (lead.simConfidence < 0.5) { score += 10; reasons.push("very low lead score"); }
    reasons.push(`lead ${lead.conditionId} (simulated ${lead.simConfidence.toFixed(2)})`);
  }
  if (c.pendingSync) { score -= 5; reasons.push("sync pending"); }
  return { score: Math.min(100, score), reason: reasons.join("; ") };
}

export function representativeOrder(cluster: OutbreakCluster, cases: Case[], limit = 3): string[] {
  const members = cases.filter((c) => cluster.memberCaseIds.includes(c.id) && c.state !== "CLOSED_DUPLICATE");
  const dist = (c: Case) => haversineKm(c.lat, c.lon, cluster.centerLat, cluster.centerLon);
  const unverified = members.filter((c) => c.expertConfirmedCondition !== cluster.conditionId).sort((a, b) => dist(a) - dist(b));
  const verified = members.filter((c) => c.expertConfirmedCondition === cluster.conditionId).sort((a, b) => dist(a) - dist(b));
  return [...unverified, ...verified].slice(0, limit).map((c) => c.id);
}
