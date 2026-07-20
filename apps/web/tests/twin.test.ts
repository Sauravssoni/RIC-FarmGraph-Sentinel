import { describe, expect, it } from "vitest";
import { freshSeed } from "../src/lib/seed";
import { deriveTwin, simulateScenario } from "../src/lib/twin";

const GOLDEN_PLOT = "RJ-DEMO-PLOT-118";

describe("Farm Digital Twin derivation", () => {
  it("derives a twin for every seeded plot with a valid state", () => {
    const s = freshSeed();
    for (const p of s.plots) {
      const tw = deriveTwin(p.id, s);
      expect(tw).not.toBeNull();
      expect(tw!.plot.id).toBe(p.id);
      expect(tw!.stateReason.length).toBeGreaterThan(0);
      expect(tw!.nextActions.length).toBeGreaterThan(0);
    }
  });

  it("golden plot twin is SUSPECTED_ISSUE (member of suspected cluster CL-2601)", () => {
    const s = freshSeed();
    const tw = deriveTwin(GOLDEN_PLOT, s)!;
    expect(tw.state).toBe("SUSPECTED_ISSUE");
    expect(tw.cluster?.cluster.id).toBe("CL-2601");
    expect(tw.cluster?.score.score).toBeCloseTo(65.5, 5);
  });

  it("the not-improving escalation plot reports UNRESOLVED with escalation action", () => {
    const s = freshSeed();
    const escalation = s.cases.find((c) => c.state === "NOT_IMPROVING")!;
    const tw = deriveTwin(escalation.plotId, s)!;
    expect(tw.state).toBe("UNRESOLVED");
    expect(tw.nextActions.some((a) => /escalate/i.test(a))).toBe(true);
  });

  it("returns null for unknown plot", () => {
    expect(deriveTwin("RJ-DEMO-PLOT-999", freshSeed())).toBeNull();
  });
});

describe("scenario simulator (compute-only, honest)", () => {
  it("expert-confirm simulation raises verified ratio for golden plot cluster", () => {
    const s = freshSeed();
    const tw = deriveTwin(GOLDEN_PLOT, s)!;
    // put golden case in a queued state for the simulation to act on
    const cases = s.cases.map((c) => (c.id === "C-2614" ? { ...c, state: "AWAITING_EXPERT" as const } : c));
    const tw2 = { ...tw, cases: tw.cases.map((c) => (c.id === "C-2614" ? { ...c, state: "AWAITING_EXPERT" as const } : c)) };
    const r = simulateScenario("expert_confirm", tw2, cases);
    expect(r.before!.score).toBeCloseTo(65.5, 5);
    expect(r.after!.score).toBeCloseTo(71.5, 5);
    expect(r.after!.status).toBe("VERIFIED");
    expect(r.changedComponents.some((c) => c.component === "verifiedRatio")).toBe(true);
    expect(r.honestyNote).toMatch(/not a biological prediction/i);
  });

  it("duplicate scenario weakens the score via penalty", () => {
    const s = freshSeed();
    const tw = deriveTwin(GOLDEN_PLOT, s)!;
    const r = simulateScenario("mark_duplicate", tw, s.cases);
    expect(r.after!.score).toBeLessThan(r.before!.score);
  });

  it("rainfall scenario raises weather suitability component only", () => {
    const s = freshSeed();
    const tw = deriveTwin(GOLDEN_PLOT, s)!;
    const r = simulateScenario("rainfall", tw, s.cases);
    expect(r.changedComponents.length).toBe(1);
    expect(r.changedComponents[0].component).toBe("weatherSuitability");
  });
});
