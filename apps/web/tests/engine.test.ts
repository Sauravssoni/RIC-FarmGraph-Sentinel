import { describe, expect, it } from "vitest";
import type { CaptureChecklist } from "@contracts";
import {
  captureQuality,
  diagnose,
  outbreakScore,
  expertPriority,
  representativeOrder,
  haversineKm,
} from "../src/lib/engine";
import { freshSeed } from "../src/lib/seed";

const AT = "2026-07-17T05:30:00.000Z";
const FULL: CaptureChecklist = { leafClose: true, lowerLeaf: true, wholePlant: true, lightingOk: true };
const POOR: CaptureChecklist = { leafClose: true, lowerLeaf: false, wholePlant: false, lightingOk: true };

describe("capture quality gate", () => {
  it("fails the golden first attempt (no secondary view) and demands recapture", () => {
    const r = captureQuality(POOR);
    expect(r.passed).toBe(false);
    expect(r.coverageScore).toBeCloseTo(0.5, 5); // leafClose 0.4 + lightingOk 0.1
    expect(r.recaptureRequests.length).toBeGreaterThan(0);
    expect(r.issues.join(" ")).toMatch(/Lower leaf surface/i);
  });
  it("passes with close-up + one secondary view", () => {
    const r = captureQuality({ leafClose: true, lowerLeaf: true, wholePlant: false, lightingOk: true });
    expect(r.passed).toBe(true);
    expect(r.coverageScore).toBeCloseTo(0.75, 5);
    expect(r.issues).toEqual([]);
  });
});

describe("deterministic triage (simulated)", () => {
  it("golden bajra pale-streaking scores 0.62 / 0.27 / 0.11 and routes to expert", () => {
    const d = diagnose("bajra", "pale_streaking", FULL, AT);
    expect(d.candidates[0]).toMatchObject({ conditionId: "downy_mildew", simConfidence: 0.62 });
    expect(d.candidates[1]).toMatchObject({ conditionId: "nutrient_n", simConfidence: 0.27 });
    expect(d.candidates[2]).toMatchObject({ conditionId: "unknown", simConfidence: 0.11 });
    expect(d.margin).toBeCloseTo(0.35, 5);
    expect(d.routing.decision).toBe("expert"); // margin 0.35 < 0.40 → never autonomous
    expect(d.provenance).toBe("SIMULATED");
    expect(d.note).toMatch(/not measured model accuracy/i);
  });
  it("abstains on out-of-distribution symptoms instead of forcing a label", () => {
    const d = diagnose("bajra", "other_unlisted", FULL, AT);
    expect(d.routing.decision).toBe("abstain");
    expect(d.candidates[0].conditionId).toBe("unknown");
    expect(d.recommendedNext.length).toBeGreaterThan(0);
  });
  it("applies the missing-views penalty to the lead score", () => {
    const full = diagnose("mustard", "white_downy_growth", FULL, AT);
    const partial = diagnose("mustard", "white_downy_growth", { leafClose: true, lowerLeaf: true, wholePlant: false, lightingOk: true }, AT);
    expect(partial.candidates[0].simConfidence).toBeCloseTo(full.candidates[0].simConfidence - 0.08, 5);
  });
});

describe("outbreak scoring (explainable)", () => {
  it("CL-2601 seeds at 65.5 SUSPECTED; golden confirmation crosses to 71.5 VERIFIED", () => {
    const seed = freshSeed();
    const cl = seed.clusters.find((c) => c.id === "CL-2601")!;
    const before = outbreakScore(cl, seed.cases);
    expect(before.score).toBeCloseTo(65.5, 5);
    expect(before.status).toBe("SUSPECTED");
    expect(before.verifiedCount).toBe(2);

    const confirmed = seed.cases.map((c) =>
      c.id === "C-2614" ? { ...c, expertConfirmedCondition: "downy_mildew" } : c,
    );
    const after = outbreakScore(cl, confirmed);
    expect(after.score).toBeCloseTo(71.5, 5);
    expect(after.status).toBe("VERIFIED");
    expect(after.verifiedCount).toBe(3);
    expect(after.explanation).toMatch(/3\/5 member cases/);
  });
  it("duplicate-heavy CL-2602 is DISMISSED with a visible penalty", () => {
    const seed = freshSeed();
    const cl = seed.clusters.find((c) => c.id === "CL-2602")!;
    const r = outbreakScore(cl, seed.cases);
    expect(r.status).toBe("DISMISSED");
    expect(r.duplicatePenalty).toBeGreaterThan(0.5);
    expect(r.explanation).toMatch(/duplicate penalty/);
  });
});

describe("supporting determinism", () => {
  it("haversine Jodhpur→Nagaur ≈ 129 km", () => {
    expect(haversineKm(26.2389, 73.0243, 27.2074, 73.7409)).toBeCloseTo(129.1, 0);
  });
  it("expert priority ranks high-spread escalation above an abstained unknown", () => {
    const seed = freshSeed();
    const high = seed.cases.find((c) => c.id === "C-2611")!; // high-spread downy mildew lead
    const abstained = seed.cases.find((c) => c.id === "C-2624")!; // out-of-distribution abstain
    const ph = expertPriority(high);
    const pa = expertPriority(abstained);
    expect(ph.score).toBeGreaterThan(pa.score);
    expect(ph.reason).toMatch(/high-spread-risk/);
    expect(pa.reason).toMatch(/abstained/);
  });
  it("representative order prefers unverified members first, then nearest", () => {
    const seed = freshSeed();
    const cl = seed.clusters.find((c) => c.id === "CL-2601")!;
    const order = representativeOrder(cl, seed.cases, 3);
    expect(order).toHaveLength(3);
    for (const id of order) {
      const c = seed.cases.find((x) => x.id === id)!;
      expect(c.expertConfirmedCondition).not.toBe("downy_mildew"); // unverified first
    }
  });
});
