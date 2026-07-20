/**
 * Farm Digital Twin (Phase C) — derivation + transparent scenario simulation.
 * A twin is DERIVED from the store's plots, seasons, cases, clusters, missions
 * and advisories — no separate twin database that could drift. Every value is
 * traceable to its source record; synthetic context is labelled simulated.
 */
import type { Case, OutbreakCluster, FieldMission, Advisory, DemoSeed } from "@contracts";
import { outbreakScore } from "./engine";
import type { OutbreakScoreBreakdown } from "@contracts";

export type TwinState =
  | "STABLE" | "WATCH" | "SUSPECTED_ISSUE" | "VERIFIED_ISSUE"
  | "INTERVENTION_ACTIVE" | "IMPROVING" | "UNRESOLVED";

export const TWIN_STATE_META: Record<TwinState, { label: string; glyph: string; cls: string }> = {
  STABLE: { label: "Stable", glyph: "●", cls: "bg-leaf-100 text-leaf-800" },
  WATCH: { label: "Watch", glyph: "◔", cls: "bg-sand-200 text-ink-800" },
  SUSPECTED_ISSUE: { label: "Suspected issue", glyph: "▲", cls: "bg-saffron-100 text-saffron-800" },
  VERIFIED_ISSUE: { label: "Verified issue", glyph: "◆", cls: "bg-alert-100 text-alert-700" },
  INTERVENTION_ACTIVE: { label: "Intervention active", glyph: "⚒", cls: "bg-ink-800/10 text-ink-800" },
  IMPROVING: { label: "Improving", glyph: "↗", cls: "bg-leaf-100 text-leaf-800" },
  UNRESOLVED: { label: "Unresolved", glyph: "✖", cls: "bg-alert-100 text-alert-700" },
};

export interface DigitalTwin {
  plot: DemoSeed["plots"][number];
  season: DemoSeed["cropSeasons"][number] | null;
  farmer: DemoSeed["farmers"][number] | null;
  cases: Case[];
  cluster: { cluster: OutbreakCluster; score: OutbreakScoreBreakdown } | null;
  missions: FieldMission[];
  advisories: Advisory[];
  state: TwinState;
  stateReason: string;
  /** Simulated context placeholders — always labelled. */
  weatherNote: string;
  soilNote: string;
  lastSyncAt: string | null;
  nextActions: string[];
}

const OPEN_STATES = new Set(["DRAFT", "CAPTURE_PENDING", "READY_FOR_TRIAGE", "NEEDS_RECAPTURE", "TRIAGED", "AWAITING_EXPERT", "FIELD_VISIT_REQUIRED", "FOLLOW_UP_DUE"]);

export function deriveTwin(plotId: string, s: DemoSeed): DigitalTwin | null {
  const plot = s.plots.find((p) => p.id === plotId);
  if (!plot) return null;
  const season = s.cropSeasons.find((cs) => cs.plotId === plotId) ?? null;
  const farmer = s.farmers.find((f) => f.id === plot.farmerId) ?? null;
  const cases = s.cases.filter((c) => c.plotId === plotId);
  const clusters = s.clusters.filter((cl) => cases.some((c) => cl.memberCaseIds.includes(c.id)));
  const cluster = clusters.length
    ? { cluster: clusters[0], score: outbreakScore(clusters[0], s.cases) }
    : null;
  const missions = s.missions.filter((m) => m.representativeCaseIds.some((id) => cases.some((c) => c.id === id)));
  const advisoryIds = new Set(cases.map((c) => c.advisoryRef).filter(Boolean) as string[]);
  const advisories = s.advisories.filter((a) => advisoryIds.has(a.id));

  const latest = cases.filter((c) => !["CLOSED_DUPLICATE"].includes(c.state))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];

  let state: TwinState = "STABLE";
  let stateReason = "All recorded cases are healthy or resolved.";
  if (latest) {
    if (latest.state === "NOT_IMPROVING" || latest.state === "CLOSED_UNKNOWN") {
      state = "UNRESOLVED";
      stateReason = `Latest case ${latest.id} is ${latest.state === "NOT_IMPROVING" ? "not improving after intervention" : "closed as unknown"} — needs agronomic attention.`;
    } else if (latest.state === "EXPERT_CONFIRMED" || latest.state === "EXPERT_CORRECTED") {
      state = "VERIFIED_ISSUE";
      stateReason = `Expert ${latest.state === "EXPERT_CONFIRMED" ? "confirmed" : "corrected"} ${latest.expertConfirmedCondition ?? "a condition"} on ${latest.id}.`;
    } else if (latest.state === "ADVISORY_ISSUED" || missions.some((m) => m.status === "IN_PROGRESS")) {
      state = "INTERVENTION_ACTIVE";
      stateReason = latest.state === "ADVISORY_ISSUED" ? `Advisory ${latest.advisoryRef} issued — intervention under way.` : `Mission in progress on this plot.`;
    } else if (latest.state === "IMPROVING") {
      state = "IMPROVING";
      stateReason = `Latest follow-up on ${latest.id} reports improvement.`;
    } else if (["TRIAGED", "AWAITING_EXPERT"].includes(latest.state) || (cluster && cluster.score.status === "SUSPECTED")) {
      state = "SUSPECTED_ISSUE";
      stateReason = cluster && cluster.score.status === "SUSPECTED"
        ? `Plot belongs to suspected cluster ${cluster.cluster.id} (score ${cluster.score.score}).`
        : `Case ${latest.id} is awaiting expert review.`;
    } else if (OPEN_STATES.has(latest.state)) {
      state = "WATCH";
      stateReason = `Open case ${latest.id} (${latest.state}) is being worked through the pipeline.`;
    }
  }

  const nextActions: string[] = [];
  if (cases.some((c) => c.state === "AWAITING_EXPERT")) nextActions.push("Expert review of the queued case");
  if (cases.some((c) => c.state === "NEEDS_RECAPTURE")) nextActions.push("Guided recapture with the quality instructions");
  if (cluster && cluster.score.status !== "DISMISSED" && !missions.some((m) => m.status !== "COMPLETED")) nextActions.push("Representative field-verification mission");
  if (cases.some((c) => c.state === "ADVISORY_ISSUED")) nextActions.push("Day-5 follow-up on the issued advisory");
  if (state === "UNRESOLVED") nextActions.push("Escalate to KVK expert with full evidence bundle");
  if (nextActions.length === 0) nextActions.push("Routine monitoring — next scheduled sweep");

  return {
    plot, season, farmer, cases, cluster, missions, advisories, state, stateReason,
    weatherNote: "Weather context: seeded placeholder — IMD district feed not wired (adapter PUBLIC_DATA_ONLY). IMD normals for this district put ~63% of annual rain in Jul–Aug, the downy-mildew risk window.",
    soilNote: plot.soilNote + " (simulated demo context)",
    lastSyncAt: cases.filter((c) => !c.pendingSync).map((c) => c.updatedAt).sort().at(-1) ?? null,
    nextActions,
  };
}

// ---------------------------------------------------------------------------
// Transparent scenario simulator (compute-only; never mutates the store)
// ---------------------------------------------------------------------------

export interface ScenarioResult {
  title: string;
  before: { score: number; status: string } | null;
  after: { score: number; status: string } | null;
  changedComponents: { component: string; before: number; after: number }[];
  operationalResponse: string;
  honestyNote: string;
}

export function simulateScenario(
  scenario: "rainfall" | "nearby_case" | "expert_confirm" | "mark_duplicate" | "intervention_success" | "intervention_failure",
  twin: DigitalTwin,
  allCases: Case[],
): ScenarioResult {
  const cl = twin.cluster?.cluster;
  const beforeScore = cl ? outbreakScore(cl, allCases) : null;
  const before = beforeScore ? { score: beforeScore.score, status: beforeScore.status } : null;
  const honesty = "Simulation of scoring behaviour only — not a biological prediction. No claim of certainty.";

  const mk = (
    title: string, cases: Case[], cluster: OutbreakCluster | undefined,
    response: string,
  ): ScenarioResult => {
    const afterScore = cluster ? outbreakScore(cluster, cases) : null;
    const after = afterScore ? { score: afterScore.score, status: afterScore.status } : null;
    const changed: ScenarioResult["changedComponents"] = [];
    if (beforeScore && afterScore) {
      const keys = Object.keys(afterScore.components) as (keyof typeof afterScore.components)[];
      for (const k of keys) {
        const b = beforeScore.components[k] ?? 0, a = afterScore.components[k] ?? 0;
        if (Math.abs(a - b) > 1e-9) changed.push({ component: k, before: Math.round(b * 100) / 100, after: Math.round(a * 100) / 100 });
      }
      if (beforeScore.duplicatePenalty !== afterScore.duplicatePenalty) {
        changed.push({ component: "duplicatePenalty", before: beforeScore.duplicatePenalty, after: afterScore.duplicatePenalty });
      }
    }
    return { title, before, after, changedComponents: changed, operationalResponse: response, honestyNote: honesty };
  };

  switch (scenario) {
    case "expert_confirm": {
      const target = twin.cases.find((c) => ["AWAITING_EXPERT", "TRIAGED"].includes(c.state));
      if (!cl || !target) return mk("Expert confirms the condition", allCases, cl, "No queued case on this plot — nothing changes.");
      const modified = allCases.map((c) => (c.id === target.id ? { ...c, expertConfirmedCondition: cl.conditionId } : c));
      return mk("Expert confirms the condition", modified, cl,
        "Verified ratio rises → cluster may cross the verified threshold → mission and advisory become urgent.");
    }
    case "nearby_case": {
      if (!cl) return mk("Similar case appears within 6 km", allCases, cl, "No cluster membership — a new cluster would be evaluated from scratch.");
      const centroid = { lat: cl.centerLat, lon: cl.centerLon };
      const ghost: Case = { ...twin.cases[0], id: "C-SIM-NEW", state: "AWAITING_EXPERT", lat: centroid.lat + 0.02, lon: centroid.lon + 0.02, expertConfirmedCondition: null };
      const expanded = { ...cl, memberCaseIds: [...cl.memberCaseIds, "C-SIM-NEW"] };
      return mk("Similar case appears within 6 km", [...allCases, ghost], expanded,
        "Spatial density and temporal growth rise → district officer should watch the score trend.");
    }
    case "rainfall": {
      if (!cl) return mk("Rainfall/humidity increases", allCases, cl, "No cluster — weather suitability would apply at triage policy level.");
      const boosted = { ...cl, weatherSuitability: Math.min(1, (cl.weatherSuitability ?? 0.4) + 0.3) };
      return mk("Rainfall/humidity increases", allCases, boosted,
        "Weather suitability rises → inspection SLA should tighten during humid windows (IMD normals: Jul–Aug).");
    }
    case "mark_duplicate": {
      if (!cl) return mk("A member case is marked duplicate", allCases, cl, "No cluster to modify.");
      const penalised = { ...cl, seedSignals: { ...cl.seedSignals, duplicatePenalty: Math.min(1, (cl.seedSignals.duplicatePenalty ?? 0) + 0.4) } };
      return mk("A member case is marked duplicate", allCases, penalised,
        "Duplicate penalty weakens the cluster — response resources are not wasted on double-reports.");
    }
    case "intervention_success": {
      return mk("Intervention succeeds (follow-up improving)", allCases, cl,
        "Case trends IMPROVING → twin state improves → cluster decays as members resolve. Score unchanged at this instant — outcomes feed the next sweep.");
    }
    case "intervention_failure": {
      return mk("Intervention fails (follow-up not improving)", allCases, cl,
        "Case escalates NOT_IMPROVING → expert re-review + field visit. Cluster response escalates to mission if none is active.");
    }
  }
}
