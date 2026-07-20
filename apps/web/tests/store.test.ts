// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { DemoStore } from "../src/lib/store";
import { SEED } from "../src/lib/seed";
import type { CaptureChecklist } from "@contracts";

const GOLDEN = "C-2614";
const POOR: CaptureChecklist = { leafClose: true, lowerLeaf: false, wholePlant: false, lightingOk: true };
const FULL: CaptureChecklist = { leafClose: true, lowerLeaf: true, wholePlant: true, lightingOk: true };
const OBS = { symptomCategory: "pale_streaking", symptomNote: "pale streaking on lower leaves" };

function fresh(): DemoStore {
  localStorage.clear();
  return new DemoStore();
}

describe("demo store — golden loop state transitions", () => {
  beforeEach(() => localStorage.clear());

  it("seeds the golden case offline-first: DRAFT + pendingSync + consent", () => {
    const s = fresh();
    const c = s.getCase(GOLDEN)!;
    expect(c.state).toBe("DRAFT");
    expect(c.pendingSync).toBe(true);
    expect(c.createdOffline).toBe(true);
    expect(c.consent.given).toBe(true);
    expect(c.observations).toHaveLength(0);
  });

  it("runs the full golden loop deterministically", () => {
    const s = fresh();
    // 1) poor capture fails the quality gate
    s.addObservation(GOLDEN, { ...OBS, checklist: POOR });
    expect(s.getCase(GOLDEN)!.state).toBe("NEEDS_RECAPTURE");
    // 2) connectivity returns → sync marker clears
    s.markSynced(GOLDEN);
    expect(s.getCase(GOLDEN)!.pendingSync).toBe(false);
    // 3) guided recapture passes
    s.addObservation(GOLDEN, { ...OBS, checklist: FULL });
    expect(s.getCase(GOLDEN)!.state).toBe("READY_FOR_TRIAGE");
    // 4) deterministic triage → expert queue
    s.triage(GOLDEN);
    const triaged = s.getCase(GOLDEN)!;
    expect(triaged.state).toBe("AWAITING_EXPERT");
    expect(triaged.diagnosis!.candidates[0]).toMatchObject({ conditionId: "downy_mildew", simConfidence: 0.62 });
    expect(triaged.diagnosis!.routing.decision).toBe("expert");
    // 5) expert confirm → cluster CL-2601 crosses to VERIFIED
    s.review(GOLDEN, { decision: "confirm", conditionId: "downy_mildew", note: "Typical DM sporulation on lower leaves." });
    const confirmed = s.getCase(GOLDEN)!;
    expect(confirmed.state).toBe("EXPERT_CONFIRMED");
    expect(confirmed.expertConfirmedCondition).toBe("downy_mildew");
    const cl = s.clustersWithScores().find((c) => c.id === "CL-2601")!;
    expect(cl.score.score).toBeCloseTo(71.5, 5);
    expect(cl.score.status).toBe("VERIFIED");
    // 6) approved advisory issues (chemical section stays locked by contract)
    s.issueAdvisory(GOLDEN, "ADV-2601-v0.3");
    expect(s.getCase(GOLDEN)!.state).toBe("ADVISORY_ISSUED");
    expect(s.getCase(GOLDEN)!.advisoryRef).toBe("ADV-2601-v0.3");
    // 7) follow-up improving
    s.followUp(GOLDEN, { status: "improving", note: "New leaves clean after cultural measures." });
    expect(s.getCase(GOLDEN)!.state).toBe("IMPROVING");
    // append-only chronological timeline + audit trail
    const stamps = s.getCase(GOLDEN)!.timeline.map((e) => e.at);
    expect([...stamps].sort()).toEqual(stamps);
    expect(s.getState().auditEvents.some((e) => e.caseId === GOLDEN)).toBe(true);
  });

  it("expert correction records previous → corrected and audits it", () => {
    const s = fresh();
    s.addObservation(GOLDEN, { ...OBS, checklist: FULL });
    s.triage(GOLDEN);
    s.review(GOLDEN, { decision: "correct", conditionId: "nutrient_n", note: "Uniform chlorosis — nitrogen, not mildew." });
    const c = s.getCase(GOLDEN)!;
    expect(c.state).toBe("EXPERT_CORRECTED");
    expect(c.expertConfirmedCondition).toBe("nutrient_n");
    expect(c.timeline.some((e) => e.type === "expert_corrected" && e.summary.includes("downy_mildew → nutrient_n"))).toBe(true);
    expect(s.getState().auditEvents.some((e) => e.type === "expert_corrected" && e.caseId === GOLDEN)).toBe(true);
  });

  it("expert 'unknown' closes the case without forcing a label", () => {
    const s = fresh();
    s.addObservation(GOLDEN, { ...OBS, checklist: FULL });
    s.triage(GOLDEN);
    s.review(GOLDEN, { decision: "unknown", note: "Needs lab confirmation; will not guess." });
    const c = s.getCase(GOLDEN)!;
    expect(c.state).toBe("CLOSED_UNKNOWN");
    expect(c.expertConfirmedCondition).toBe("unknown");
  });

  it("mission generation enforces one open mission per cluster", () => {
    const s = fresh();
    const m1 = s.generateMission("CL-2603"); // no open mission seeded for CL-2603
    expect("error" in m1).toBe(false);
    const m2 = s.generateMission("CL-2603");
    expect("error" in m2).toBe(true);
    if ("error" in m2) expect(m2.error).toMatch(/already exists/i);
  });

  it("reset restores the exact pristine seed", () => {
    const s = fresh();
    s.addObservation(GOLDEN, { ...OBS, checklist: FULL });
    s.triage(GOLDEN);
    s.reset();
    expect(s.getState().cases).toHaveLength(SEED.cases.length);
    expect(s.getCase(GOLDEN)!.observations).toHaveLength(0);
    expect(JSON.stringify(s.getState().cases)).toBe(JSON.stringify(SEED.cases));
  });

  it("persists mutations to localStorage so a refresh loses nothing", () => {
    const s = fresh();
    s.review("C-2611", { decision: "confirm", conditionId: "downy_mildew", note: "confirmed remotely" });
    const reloaded = new DemoStore(); // reads the overlay, like a page refresh
    expect(reloaded.getCase("C-2611")!.state).toBe("EXPERT_CONFIRMED");
  });
});
