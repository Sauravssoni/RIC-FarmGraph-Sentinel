import { describe, expect, it } from "vitest";
import { SEED, INTEGRATIONS, POLICY } from "../src/lib/seed";
import { STATE_META } from "../src/lib/format";

describe("truth labels & provenance invariants", () => {
  it("every triaged case carries SIMULATED provenance and the demo model version", () => {
    const withDiag = SEED.cases.filter((c) => c.diagnosis);
    expect(withDiag.length).toBeGreaterThan(10);
    for (const c of withDiag) {
      expect(c.diagnosis!.provenance).toBe("SIMULATED");
      expect(c.diagnosis!.modelVersion).toContain("demo");
      expect(c.diagnosis!.note).toMatch(/not measured model accuracy/i);
    }
  });
  it("all cases are pseudonymous and consented", () => {
    const farmerIds = new Set(SEED.farmers.map((f) => f.id));
    for (const c of SEED.cases) {
      expect(c.farmerId).toMatch(/^RJ-DEMO-F\d+$/);
      expect(farmerIds.has(c.farmerId)).toBe(true);
      expect(c.consent.given).toBe(true);
      expect(c.consent.purposeNote.length).toBeGreaterThan(0);
    }
    for (const f of SEED.farmers) expect(f.pseudonym.length).toBeGreaterThan(0);
  });
  it("seed covers the required variety: correction, unknown, duplicate, pending-sync, escalation, resolved", () => {
    const has = (fn: (c: (typeof SEED.cases)[number]) => boolean) => SEED.cases.some(fn);
    expect(has((c) => c.reviews.some((r) => r.decision === "correct"))).toBe(true);
    expect(has((c) => c.state === "CLOSED_UNKNOWN")).toBe(true);
    expect(has((c) => c.state === "CLOSED_DUPLICATE")).toBe(true);
    expect(has((c) => c.pendingSync)).toBe(true);
    expect(has((c) => c.followUps.some((f) => f.status === "not_improving"))).toBe(true);
    expect(has((c) => c.state === "RESOLVED")).toBe(true);
    expect(SEED.clusters.some((cl) => cl.status === "DISMISSED")).toBe(true);
    expect(SEED.advisories.some((a) => a.status === "APPROVED")).toBe(true);
    expect(SEED.cases.length).toBeGreaterThanOrEqual(24);
  });
  it("no integration adapter is ever LIVE", () => {
    const allowed = ["SIMULATED", "CONTRACT_DEFINED", "PUBLIC_DATA_ONLY", "AWAITING_AUTHORITY", "NOT_STARTED"];
    for (const a of INTEGRATIONS.adapters) expect(allowed).toContain(a.status);
    expect(INTEGRATIONS.adapters.length).toBeGreaterThanOrEqual(15);
  });
  it("chemical lock and simulated-confidence labels are present in policy", () => {
    expect(POLICY.labels.chemicalLocked).toMatch(/locked/i);
    expect(POLICY.labels.simulatedConfidence).toMatch(/[Ss]imulated/);
    expect(POLICY.labels.demoBanner).toMatch(/Demo data/i);
  });
  it("STATE_META covers every seeded case state with label + glyph (status never by colour alone)", () => {
    for (const s of new Set(SEED.cases.map((c) => c.state))) {
      expect(STATE_META[s]).toBeDefined();
      expect(STATE_META[s].glyph.length).toBeGreaterThan(0);
      expect(STATE_META[s].label.length).toBeGreaterThan(0);
    }
  });
  it("chemical section stays locked on every advisory; issued advisories carry safe steps", () => {
    for (const a of SEED.advisories) {
      expect(a.chemical.locked).toBe(true);
      if (a.status === "APPROVED" || a.status === "EXPERT_REVIEWED") {
        expect(a.immediateSteps.length).toBeGreaterThan(0);
        expect(a.escalateWhen.length).toBeGreaterThan(0);
      }
    }
  });
});
