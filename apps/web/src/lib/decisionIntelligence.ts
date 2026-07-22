import type {
  Case,
  FieldMission,
  OutbreakCluster,
  OutbreakScoreBreakdown,
  Referral,
} from "@contracts";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const CLOSED_CASE_STATES = new Set(["RESOLVED", "CLOSED_UNKNOWN", "CLOSED_DUPLICATE"]);
const EXPERT_STATES = new Set(["READY_FOR_TRIAGE", "TRIAGED", "NEEDS_RECAPTURE", "AWAITING_EXPERT"]);
const CLOSED_REFERRAL_STATES = new Set(["RESPONDED", "CLOSED"]);

export type DecisionPriority = "CRITICAL" | "HIGH" | "MEDIUM";

export interface SignalTrendPoint {
  label: string;
  value: number;
  kind: "observed" | "forecast";
}

export interface RisingDistrict {
  district: string;
  recentSignals: number;
  previousSignals: number;
  delta: number;
  openCases: number;
  awaitingExpert: number;
}

export interface RecommendedAction {
  id: string;
  priority: DecisionPriority;
  title: string;
  detail: string;
  evidence: string;
  href: string;
}

export interface DecisionIntelligence {
  generatedAt: string;
  forecastHorizonHours: 72;
  expertLoad72h: number;
  expertLoadChangePct: number;
  districtsTrendingUp: number;
  topRisingDistrict: RisingDistrict | null;
  kvkSlaRisk24h: number;
  estimatedMinutesAvoided: number;
  signalTrend: SignalTrendPoint[];
  actions: RecommendedAction[];
  assumptions: string[];
}

type ClusterWithScore = OutbreakCluster & { score: OutbreakScoreBreakdown };

interface DecisionIntelligenceInput {
  cases: Case[];
  clusters: ClusterWithScore[];
  missions: FieldMission[];
  referrals: Referral[];
  demoNow: string;
  queueLength: number;
  pendingSync: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function utcDayStart(value: Date): number {
  return Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
}

function countCreatedBetween(cases: Case[], startMs: number, endMs: number): number {
  return cases.filter((item) => {
    const at = Date.parse(item.createdAt);
    return Number.isFinite(at) && at >= startMs && at < endMs;
  }).length;
}

function dominantDistrict(cluster: ClusterWithScore, casesById: Map<string, Case>): string | null {
  const counts = new Map<string, number>();
  for (const caseId of cluster.memberCaseIds) {
    const district = casesById.get(caseId)?.district;
    if (district) counts.set(district, (counts.get(district) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null;
}

function actionPriority(score: number): DecisionPriority {
  if (score >= 90) return "CRITICAL";
  if (score >= 65) return "HIGH";
  return "MEDIUM";
}

export function buildDecisionIntelligence(input: DecisionIntelligenceInput): DecisionIntelligence {
  const now = Date.parse(input.demoNow);
  const safeNow = Number.isFinite(now) ? now : Date.now();
  const openCases = input.cases.filter((item) => !CLOSED_CASE_STATES.has(item.state));
  const awaitingExpert = openCases.filter((item) => EXPERT_STATES.has(item.state) || item.diagnosis?.routing.decision === "expert");
  const activeClusters = input.clusters.filter((item) => item.status !== "DISMISSED");
  const openReferrals = input.referrals.filter((item) => !CLOSED_REFERRAL_STATES.has(item.status));

  const recentStart = safeNow - 72 * HOUR_MS;
  const previousStart = recentStart - 72 * HOUR_MS;
  const recentSignals = countCreatedBetween(input.cases, recentStart, safeNow + 1);
  const previousSignals = countCreatedBetween(input.cases, previousStart, recentStart);
  const expertLoadChangePct = previousSignals > 0
    ? Math.round(((recentSignals - previousSignals) / previousSignals) * 100)
    : recentSignals > 0 ? 100 : 0;

  const observed: SignalTrendPoint[] = [];
  const todayStart = utcDayStart(new Date(safeNow));
  for (let offset = 6; offset >= 0; offset -= 1) {
    const start = todayStart - offset * DAY_MS;
    observed.push({
      label: new Intl.DateTimeFormat("en-IN", { weekday: "short", timeZone: "UTC" }).format(new Date(start)),
      value: countCreatedBetween(input.cases, start, start + DAY_MS),
      kind: "observed",
    });
  }

  const lastThreeAverage = observed.slice(-3).reduce((sum, item) => sum + item.value, 0) / 3;
  const baselineDailySignals = Math.max(lastThreeAverage, openCases.length / 14);
  const averageTemporalGrowth = activeClusters.length
    ? activeClusters.reduce((sum, item) => sum + item.seedSignals.temporalGrowth, 0) / activeClusters.length
    : 0;
  const averageWeatherSuitability = activeClusters.length
    ? activeClusters.reduce((sum, item) => sum + item.weatherSuitability, 0) / activeClusters.length
    : 0;
  const growthUplift = clamp(averageTemporalGrowth * 0.25 + averageWeatherSuitability * 0.15, 0, 0.45);
  const forecast = [1, 2, 3].map((day): SignalTrendPoint => ({
    label: `+${day}d`,
    value: Math.max(0, Math.round(baselineDailySignals * (1 + growthUplift * (day / 3)))),
    kind: "forecast",
  }));

  const forecastSignals = forecast.reduce((sum, item) => sum + item.value, 0);
  const expertShare = clamp(awaitingExpert.length / Math.max(openCases.length, 1), 0.25, 0.8);
  const expertLoad72h = input.queueLength + Math.round(forecastSignals * expertShare);

  const districtRows = [...new Set(input.cases.map((item) => item.district))].map((district): RisingDistrict => {
    const districtCases = input.cases.filter((item) => item.district === district);
    const districtOpen = districtCases.filter((item) => !CLOSED_CASE_STATES.has(item.state));
    const recent = countCreatedBetween(districtCases, recentStart, safeNow + 1);
    const previous = countCreatedBetween(districtCases, previousStart, recentStart);
    return {
      district,
      recentSignals: recent,
      previousSignals: previous,
      delta: recent - previous,
      openCases: districtOpen.length,
      awaitingExpert: districtOpen.filter((item) => EXPERT_STATES.has(item.state) || item.diagnosis?.routing.decision === "expert").length,
    };
  }).sort((a, b) => b.delta - a.delta || b.awaitingExpert - a.awaitingExpert || b.openCases - a.openCases);
  const risingDistricts = districtRows.filter((item) => item.delta > 0);
  const topRisingDistrict = risingDistricts[0] ?? districtRows[0] ?? null;

  const kvkSlaRisk24h = openReferrals.filter((item) => {
    const due = Date.parse(item.dueAt);
    return Number.isFinite(due) && due <= safeNow + 24 * HOUR_MS;
  }).length;

  const recaptureOrDuplicate = input.cases.filter((item) => item.state === "NEEDS_RECAPTURE" || item.state === "CLOSED_DUPLICATE").length;
  const missionBatchSavings = input.missions
    .filter((item) => item.status !== "COMPLETED")
    .reduce((sum, item) => sum + Math.max(0, item.representativeCaseIds.length - 1) * 12, 0);
  const estimatedMinutesAvoided = Math.round(
    input.queueLength * 5
    + recaptureOrDuplicate * 4
    + activeClusters.length * 10
    + openReferrals.length * 8
    + missionBatchSavings,
  );

  const casesById = new Map(input.cases.map((item) => [item.id, item]));
  const topCluster = [...activeClusters].sort((a, b) => b.score.score - a.score.score)[0];
  const topClusterDistrict = topCluster ? dominantDistrict(topCluster, casesById) : null;
  const candidates: Array<RecommendedAction & { score: number }> = [];

  if (kvkSlaRisk24h > 0) {
    candidates.push({
      id: "kvk-sla-risk",
      score: 100 + kvkSlaRisk24h,
      priority: "CRITICAL",
      title: `Protect ${kvkSlaRisk24h} KVK SLA${kvkSlaRisk24h === 1 ? "" : "s"} due within 24 hours`,
      detail: "Escalate or reassign referrals before the response window is breached.",
      evidence: `${openReferrals.length} open referrals · ${kvkSlaRisk24h} due within the next 24 hours`,
      href: "/support",
    });
  }

  if (topRisingDistrict) {
    const score = 70 + Math.max(0, topRisingDistrict.delta) * 4 + topRisingDistrict.awaitingExpert * 2;
    candidates.push({
      id: "rising-district",
      score,
      priority: actionPriority(score),
      title: `Pre-position expert capacity in ${topRisingDistrict.district}`,
      detail: "Clear the review backlog early and batch nearby field verification before signals compound.",
      evidence: `${topRisingDistrict.recentSignals} recent vs ${topRisingDistrict.previousSignals} prior signals · ${topRisingDistrict.awaitingExpert} awaiting expert`,
      href: `/cases?district=${encodeURIComponent(topRisingDistrict.district)}`,
    });
  }

  if (topCluster) {
    const score = Math.round(topCluster.score.score);
    candidates.push({
      id: "top-cluster",
      score,
      priority: actionPriority(score),
      title: `${topCluster.status === "VERIFIED" ? "Contain" : "Verify"} ${topCluster.name}`,
      detail: "Use representative cases instead of manually visiting every report in the cluster.",
      evidence: `${topCluster.score.score.toFixed(1)} risk score · ${topCluster.score.verifiedCount}/${topCluster.score.memberCount} verified${topClusterDistrict ? ` · ${topClusterDistrict}` : ""}`,
      href: "/outbreaks",
    });
  }

  if (input.pendingSync > 0) {
    candidates.push({
      id: "sync-backlog",
      score: 68 + input.pendingSync,
      priority: "HIGH",
      title: `Recover ${input.pendingSync} offline report${input.pendingSync === 1 ? "" : "s"}`,
      detail: "Resolve the sync backlog before district trend estimates become stale.",
      evidence: `${input.pendingSync} evidence package${input.pendingSync === 1 ? "" : "s"} pending upload`,
      href: "/field/scan",
    });
  }

  if (input.queueLength > 0) {
    candidates.push({
      id: "expert-queue",
      score: 60 + Math.min(25, input.queueLength * 2),
      priority: "HIGH",
      title: `Clear the top ${Math.min(3, input.queueLength)} expert decisions`,
      detail: "Work the automatically ranked queue instead of manually scanning the full case register.",
      evidence: `${input.queueLength} structured cases ranked by spread risk, uncertainty and evidence state`,
      href: "/expert",
    });
  }

  const actions = candidates
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, 3)
    .map((item): RecommendedAction => ({
      id: item.id,
      priority: item.priority,
      title: item.title,
      detail: item.detail,
      evidence: item.evidence,
      href: item.href,
    }));

  return {
    generatedAt: new Date(safeNow).toISOString(),
    forecastHorizonHours: 72,
    expertLoad72h,
    expertLoadChangePct,
    districtsTrendingUp: risingDistricts.length,
    topRisingDistrict,
    kvkSlaRisk24h,
    estimatedMinutesAvoided,
    signalTrend: [...observed, ...forecast],
    actions,
    assumptions: [
      "Forecast uses the last three observed days, open-case baseline, active-cluster temporal growth and the cluster weather-suitability signal. Weather remains labelled by its live, cached or simulated adapter state.",
      "Expert-load forecast adds the current ranked queue to the expected share of new reports needing structured review.",
      "Operator-time avoidance is an explicit planning estimate: queue ranking 5 min/case, evidence/duplicate checks 4 min/case, cluster synthesis 10 min/cluster, KVK pack preparation 8 min/referral and 12 min per batched mission stop.",
      "All values use the deterministic pilot dataset and are not represented as field-validated impact.",
    ],
  };
}
