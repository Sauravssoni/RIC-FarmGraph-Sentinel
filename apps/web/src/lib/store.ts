"use client";
/**
 * DemoStore — browser-side deterministic demo provider.
 *
 * Implements the same contracts and engine as the FastAPI backend. State is the
 * seed plus user mutations, persisted to localStorage so a refresh never loses
 * work; "Reset demo" restores the pristine deterministic seed.
 */
import { useSyncExternalStore } from "react";
import type {
  CaptureChecklist, Case, DemoSeed, FieldMission, FollowUpStatus, OutbreakCluster,
  OverviewKpis, ReviewDecision, TimelineEvent,
} from "@contracts";
import { freshSeed } from "./seed";
import { captureQuality, diagnose, expertPriority, outbreakScore, representativeOrder } from "./engine";

const STORAGE_KEY = "fgr-demo-state-v1";
const CLOSED = new Set(["RESOLVED", "CLOSED_UNKNOWN", "CLOSED_DUPLICATE"]);

export interface QueueItem { case: Case; priorityScore: number; priorityReason: string; }

function nowIso(): string {
  return new Date().toISOString();
}

export class DemoStore {
  private state: DemoSeed;
  private listeners = new Set<() => void>();
  private evCounter: number;

  constructor() {
    const base = freshSeed();
    this.state = base;
    this.evCounter = 9000;
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as { state: DemoSeed; evCounter: number };
          if (parsed?.state?.meta?.demoNow === base.meta.demoNow) {
            this.state = parsed.state;
            this.evCounter = parsed.evCounter;
          }
        }
      } catch {
        // corrupted overlay — fall back to pristine seed
      }
      this.evCounter = Math.max(
        this.evCounter,
        ...this.state.auditEvents.map((e) => (e.id.startsWith("EV-") ? parseInt(e.id.slice(3), 10) : 0)),
      );
    }
  }

  // --------------- reactivity ---------------
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getState = (): DemoSeed => this.state;

  private emit() {
    // New top-level reference so useSyncExternalStore snapshots change.
    this.state = { ...this.state };
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ state: this.state, evCounter: this.evCounter }));
      } catch {
        // storage full/blocked — demo continues in memory
      }
    }
    this.listeners.forEach((fn) => fn());
  }

  reset() {
    this.state = freshSeed();
    this.evCounter = Math.max(
      9000,
      ...this.state.auditEvents.map((e) => (e.id.startsWith("EV-") ? parseInt(e.id.slice(3), 10) : 0)),
    );
    if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
    this.listeners.forEach((fn) => fn());
  }

  // --------------- helpers ---------------
  private event(at: string, type: string, actor: string, summary: string): TimelineEvent {
    this.evCounter += 1;
    return { id: `EV-${String(this.evCounter).padStart(4, "0")}`, at, type, actor, summary, provenance: "SIMULATED" };
  }

  private append(c: Case, at: string, type: string, actor: string, summary: string) {
    const e = this.event(at, type, actor, summary);
    c.timeline.push(e);
    c.updatedAt = at;
    this.state.auditEvents.push({ ...e, caseId: c.id });
  }

  getCase(id: string): Case | undefined {
    return this.state.cases.find((c) => c.id === id);
  }

  // --------------- mutations (mirror the API) ---------------
  createCase(input: {
    farmerId: string; plotId: string; crop: string; cropStage: string; season: string;
    district: string; block: string; lat: number; lon: number; areaAcres: number;
    createdOffline: boolean; consentChannel: "voice" | "typed";
  }): Case {
    const nums = this.state.cases.map((c) => parseInt(c.id.slice(2), 10));
    const id = `C-${Math.max(...nums) + 1}`;
    const at = nowIso();
    const c: Case = {
      id, farmerId: input.farmerId, plotId: input.plotId, crop: input.crop, cropStage: input.cropStage,
      season: input.season, district: input.district, block: input.block, lat: input.lat, lon: input.lon,
      areaAcres: input.areaAcres, state: "DRAFT", createdAt: at, updatedAt: at,
      createdOffline: input.createdOffline, pendingSync: input.createdOffline,
      consent: { given: true, at, channel: input.consentChannel, purposeNote: "Crop-health advisory and outbreak response (demo consent text)" },
      observations: [], diagnosis: null, reviews: [], advisoryRef: null,
      followUps: [], outcome: null, expertConfirmedCondition: null, duplicateOf: null, timeline: [],
    };
    this.state.cases.push(c);
    this.append(c, at, "case_created", "farmer (demo)", `Report opened for ${c.crop} plot ${c.plotId}${c.createdOffline ? " (offline, on device)" : ""}`);
    this.emit();
    return c;
  }

  addObservation(caseId: string, input: { symptomCategory: string; symptomNote: string; checklist: CaptureChecklist; at?: string }) {
    const c = this.getCase(caseId);
    if (!c) return undefined;
    const at = input.at ?? nowIso();
    const q = captureQuality(input.checklist);
    const n = c.observations.length + 1;
    const obs = {
      id: `${c.id}-O${n}`, at, symptomCategory: input.symptomCategory, symptomNote: input.symptomNote,
      checklist: input.checklist,
      imageCount: [input.checklist.leafClose, input.checklist.lowerLeaf, input.checklist.wholePlant].filter(Boolean).length,
      imageRef: `sim-evidence://${c.id}/${n}`, quality: q,
    };
    c.observations.push(obs);
    this.append(c, at, "capture_submitted", "field worker FW-07 (demo)",
      `Evidence capture submitted (${obs.imageCount} view(s), coverage ${q.coverageScore.toFixed(2)})`);
    if (!q.passed) {
      c.state = "NEEDS_RECAPTURE";
      this.append(c, at, "quality_failed", "system (demo)", `Quality gate failed: ${q.issues.join("; ")}`);
    } else {
      this.append(c, at, "quality_passed", "system (demo)", `Capture quality gate passed (coverage ${q.coverageScore.toFixed(2)})`);
      if (["DRAFT", "CAPTURE_PENDING", "NEEDS_RECAPTURE"].includes(c.state)) c.state = "READY_FOR_TRIAGE";
    }
    this.emit();
    return obs;
  }

  /** Simulated sync: clears pendingSync with an audit event (connectivity restored). */
  markSynced(caseId: string) {
    const c = this.getCase(caseId);
    if (!c || !c.pendingSync) return;
    c.pendingSync = false;
    delete c.syncNote;
    this.append(c, nowIso(), "sync_completed", "system (demo)", "Offline report synced (simulated connectivity)");
    this.emit();
  }

  triage(caseId: string) {
    const c = this.getCase(caseId);
    if (!c || c.observations.length === 0) return undefined;
    const obs = c.observations[c.observations.length - 1];
    if (!obs.quality.passed) return undefined;
    const at = nowIso();
    const d = diagnose(c.crop, obs.symptomCategory, obs.checklist, at);
    c.diagnosis = d;
    c.state = "TRIAGED";
    this.append(c, at, "triage_completed", "system (demo)",
      `Deterministic demo triage: lead ${d.candidates[0].label} (simulated ${d.candidates[0].simConfidence.toFixed(2)}), margin ${d.margin.toFixed(2)}`);
    if (d.routing.decision !== "autonomous") {
      c.state = "AWAITING_EXPERT";
      const prefix = d.routing.decision === "abstain" ? "Abstention: " : "";
      this.append(c, at, "escalated_to_expert", "system (demo)", prefix + d.routing.reason);
    }
    this.emit();
    return d;
  }

  review(caseId: string, input: { decision: ReviewDecision; conditionId?: string; note: string; reviewer?: string }) {
    const c = this.getCase(caseId);
    if (!c) return undefined;
    const at = nowIso();
    const reviewer = input.reviewer ?? "expert — KVK persona (demo)";
    const lead = c.diagnosis?.candidates[0]?.conditionId ?? null;
    const r = {
      id: `${c.id}-R${c.reviews.length + 1}`, at, reviewer,
      decision: input.decision, conditionId: input.conditionId ?? null, note: input.note,
    };
    c.reviews.push(r);
    const label = (id: string | null) => (id ? id : "?");
    switch (input.decision) {
      case "confirm":
        c.expertConfirmedCondition = input.conditionId ?? lead;
        c.state = "EXPERT_CONFIRMED";
        this.append(c, at, "expert_confirmed", reviewer, `Expert confirmed ${c.expertConfirmedCondition}: ${input.note}`);
        break;
      case "correct":
        c.expertConfirmedCondition = input.conditionId ?? null;
        c.state = "EXPERT_CORRECTED";
        this.append(c, at, "expert_corrected", reviewer, `Expert corrected AI triage (${label(lead)} → ${label(c.expertConfirmedCondition)}): ${input.note}`);
        break;
      case "unknown":
        c.expertConfirmedCondition = "unknown";
        c.state = "CLOSED_UNKNOWN";
        this.append(c, at, "expert_marked_unknown", reviewer, `Expert marked condition UNKNOWN — not forced into a known label. ${input.note}`);
        break;
      case "field_visit":
        c.state = "FIELD_VISIT_REQUIRED";
        this.append(c, at, "field_visit_required", reviewer, `Field verification required: ${input.note}`);
        break;
      case "recapture":
        c.state = "NEEDS_RECAPTURE";
        this.append(c, at, "recapture_requested", reviewer, `Expert requested recapture: ${input.note}`);
        break;
    }
    if (input.decision === "confirm" || input.decision === "correct") {
      for (const cl of this.state.clusters) {
        if (cl.memberCaseIds.includes(c.id)) {
          const breakdown = outbreakScore(cl, this.state.cases);
          cl.status = breakdown.status;
          this.append(c, at, "cluster_updated", "system (demo)",
            `Cluster ${cl.id} re-scored to ${breakdown.score} (${breakdown.status}) after expert decision`);
        }
      }
    }
    this.emit();
    return r;
  }

  issueAdvisory(caseId: string, advisoryId: string) {
    const c = this.getCase(caseId);
    if (!c) return;
    const at = nowIso();
    c.advisoryRef = advisoryId;
    c.state = "ADVISORY_ISSUED";
    this.append(c, at, "advisory_issued", "system (demo)", `Safe advisory ${advisoryId} issued (non-chemical immediate actions; chemical section locked)`);
    this.emit();
  }

  followUp(caseId: string, input: { status: FollowUpStatus; note: string }) {
    const c = this.getCase(caseId);
    if (!c) return undefined;
    const at = nowIso();
    const fu = { id: `${c.id}-F${c.followUps.length + 1}`, at, channel: "field visit / call (simulated)", status: input.status, note: input.note };
    c.followUps.push(fu);
    c.state = input.status === "improving" ? "IMPROVING" : input.status === "not_improving" ? "NOT_IMPROVING" : "RESOLVED";
    this.append(c, at, "follow_up_recorded", "field worker FW-07 (demo)", `Follow-up: ${input.status.replace("_", " ")} — ${input.note}`);
    if (input.status === "not_improving") {
      this.append(c, at, "escalated_to_expert", "system (demo)", "No improvement — escalated for expert re-review and field verification");
    }
    if (input.status === "resolved") c.outcome = { status: "resolved", note: input.note, updatedAt: at };
    this.emit();
    return fu;
  }

  generateMission(clusterId: string): FieldMission | { error: string } {
    const cl = this.state.clusters.find((x) => x.id === clusterId);
    if (!cl) return { error: "cluster not found" };
    const open = this.state.missions.find((m) => m.clusterId === clusterId && m.status !== "COMPLETED");
    if (open) return { error: `Open mission ${open.id} already exists for ${clusterId}` };
    const nums = this.state.missions.map((m) => parseInt(m.id.slice(2), 10));
    const id = `M-${Math.max(...nums) + 1}`;
    const reps = representativeOrder(cl, this.state.cases, 3);
    const at = nowIso();
    const mission: FieldMission = {
      id, clusterId, purpose: `Representative field verification — ${cl.name}`,
      assignedRole: "field worker (demo)", status: "PLANNED", representativeCaseIds: reps, routeOrder: reps,
      offlinePack: "READY", createdAt: at,
      infoGainNote: "Deterministic order: unverified cases first (highest information gain), then nearest to cluster centre; not a route optimiser.",
      checklist: ["Whole-block context photos", "20-plant inspection count", "Lower-leaf close-ups", "Spread-direction sketch", "Farmer interview (consent confirmed)"],
      visits: [], syncStatus: "PENDING",
    };
    this.state.missions.push(mission);
    for (const cid of reps) {
      const c = this.getCase(cid);
      if (c) this.append(c, at, "mission_created", "system (demo)", `Mission ${id} created covering this case (representative inspection)`);
    }
    this.emit();
    return mission;
  }

  setMissionStatus(missionId: string, status: "IN_PROGRESS" | "COMPLETED", findings?: string) {
    const m = this.state.missions.find((x) => x.id === missionId);
    if (!m) return;
    m.status = status;
    if (status === "COMPLETED") {
      m.completedAt = nowIso();
      m.syncStatus = "SYNCED";
      if (findings) {
        for (const cid of m.routeOrder) m.visits.push({ caseId: cid, at: nowIso(), findings });
      }
    }
    this.emit();
  }

  // --------------- derived selectors ---------------
  overview(): OverviewKpis & { generatedAt: string; demoNow: string; provenance: "SIMULATED" } {
    const cases = this.state.cases;
    const active = cases.filter((c) => !CLOSED.has(c.state));
    const awaiting = cases.filter((c) => c.state === "AWAITING_EXPERT");
    const high = cases.filter((c) => c.diagnosis?.highSpreadRisk || c.state === "FIELD_VISIT_REQUIRED" || c.state === "NOT_IMPROVING");
    const suspected = this.state.clusters.filter((cl) => {
      const s = outbreakScore(cl, cases);
      return cl.status !== "DISMISSED" && (s.status === "SUSPECTED" || s.status === "VERIFIED");
    });
    const deltas = cases
      .filter((c) => c.reviews.length > 0)
      .map((c) => (new Date(c.reviews[0].at).getTime() - new Date(c.createdAt).getTime()) / 36e5)
      .sort((a, b) => a - b);
    const median = deltas.length ? Math.round(deltas[Math.floor(deltas.length / 2)] * 10) / 10 : null;
    const advised = cases.filter((c) => c.advisoryRef);
    const withFu = advised.filter((c) => c.followUps.length > 0);
    return {
      activeCases: active.length,
      awaitingExpert: awaiting.length,
      highPriority: high.length,
      suspectedClusters: suspected.length,
      medianReportToReviewHours: median,
      pendingSync: cases.filter((c) => c.pendingSync).length,
      followUpCompletionPct: advised.length ? Math.round((1000 * withFu.length) / advised.length) / 10 : 0,
      resolvedOrImproving: cases.filter((c) => c.state === "RESOLVED" || c.state === "IMPROVING").length,
      generatedAt: nowIso(), demoNow: this.state.meta.demoNow, provenance: "SIMULATED",
    };
  }

  expertQueue(): QueueItem[] {
    return this.state.cases
      .filter((c) => c.state === "AWAITING_EXPERT")
      .map((c) => {
        const p = expertPriority(c);
        return { case: c, priorityScore: p.score, priorityReason: p.reason };
      })
      .sort((a, b) => b.priorityScore - a.priorityScore || a.case.createdAt.localeCompare(b.case.createdAt));
  }

  clustersWithScores(): (OutbreakCluster & { score: ReturnType<typeof outbreakScore> })[] {
    return this.state.clusters.map((cl) => ({ ...cl, score: outbreakScore(cl, this.state.cases) }));
  }

  nearbyCompatible(c: Case, limit = 4): Case[] {
    return this.state.cases
      .filter((x) => x.id !== c.id && x.crop === c.crop && x.state !== "CLOSED_DUPLICATE")
      .map((x) => ({ x, d: Math.hypot(x.lat - c.lat, x.lon - c.lon) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, limit)
      .map((p) => p.x);
  }
}

let store: DemoStore | undefined;
const SERVER_SNAPSHOT: DemoSeed = freshSeed();
export function getStore(): DemoStore {
  if (!store) store = new DemoStore();
  return store;
}

/** React binding — re-renders when the demo store changes. SSR/hydration use the pristine seed snapshot. */
export function useDemoStore<T>(selector: (s: DemoStore) => T): T {
  const st = getStore();
  useSyncExternalStore(st.subscribe, () => st.getState(), () => SERVER_SNAPSHOT);
  return selector(st);
}
