import { describe, expect, it } from "vitest";
import type { Referral } from "@contracts";
import { buildDecisionIntelligence } from "../src/lib/decisionIntelligence";
import { outbreakScore } from "../src/lib/engine";
import { freshSeed } from "../src/lib/seed";

function fixture() {
  const seed = freshSeed();
  const clusters = seed.clusters.map((cluster) => ({
    ...cluster,
    score: outbreakScore(cluster, seed.cases),
  }));
  const queueLength = seed.cases.filter((item) =>
    ["READY_FOR_TRIAGE", "TRIAGED", "NEEDS_RECAPTURE", "AWAITING_EXPERT"].includes(item.state)
    || item.diagnosis?.routing.decision === "expert",
  ).length;
  const pendingSync = seed.cases.filter((item) => item.pendingSync).length;
  return { seed, clusters, queueLength, pendingSync };
}

function referralAt(caseId: string, now: number, dueOffsetHours: number): Referral {
  return {
    id: `REF-TEST-${dueOffsetHours}`,
    caseId,
    kvkId: "KVK-JODHPUR-1",
    reason: "Test",
    note: "Test",
    urgency: "URGENT",
    createdBy: "district_officer",
    createdAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
    status: "READY_TO_SHARE",
    statusHistory: [],
    channel: "in_app_pack",
    slaTargetHours: 24,
    dueAt: new Date(now + dueOffsetHours * 60 * 60 * 1000).toISOString(),
  };
}

describe("explainable decision intelligence", () => {
  it("produces a deterministic seven-day trend, three-day forecast and ranked actions", () => {
    const { seed, clusters, queueLength, pendingSync } = fixture();
    const result = buildDecisionIntelligence({
      cases: seed.cases,
      clusters,
      missions: seed.missions,
      referrals: seed.referrals,
      demoNow: seed.meta.demoNow,
      queueLength,
      pendingSync,
    });

    expect(result.forecastHorizonHours).toBe(72);
    expect(result.signalTrend).toHaveLength(10);
    expect(result.signalTrend.slice(0, 7).every((item) => item.kind === "observed")).toBe(true);
    expect(result.signalTrend.slice(7).every((item) => item.kind === "forecast")).toBe(true);
    expect(result.expertLoad72h).toBeGreaterThanOrEqual(queueLength);
    expect(result.estimatedMinutesAvoided).toBeGreaterThan(0);
    expect(result.actions.length).toBeGreaterThanOrEqual(1);
    expect(result.actions.length).toBeLessThanOrEqual(3);
    expect(result.assumptions.join(" ")).toMatch(/deterministic pilot dataset/i);
  });

  it("puts an imminent KVK SLA breach first without calling it overdue", () => {
    const { seed, clusters, queueLength, pendingSync } = fixture();
    const now = Date.parse(seed.meta.demoNow);
    const referral = referralAt(seed.cases[0].id, now, 2);

    const result = buildDecisionIntelligence({
      cases: seed.cases,
      clusters,
      missions: seed.missions,
      referrals: [referral],
      demoNow: seed.meta.demoNow,
      queueLength,
      pendingSync,
    });

    expect(result.kvkOverdue).toBe(0);
    expect(result.kvkSlaRisk24h).toBe(1);
    expect(result.actions[0]).toMatchObject({ id: "kvk-sla-risk", priority: "CRITICAL", href: "/support" });
  });

  it("separates overdue KVK work from future SLA risk", () => {
    const { seed, clusters, queueLength, pendingSync } = fixture();
    const now = Date.parse(seed.meta.demoNow);
    const referral = referralAt(seed.cases[0].id, now, -2);

    const result = buildDecisionIntelligence({
      cases: seed.cases,
      clusters,
      missions: seed.missions,
      referrals: [referral],
      demoNow: seed.meta.demoNow,
      queueLength,
      pendingSync,
    });

    expect(result.kvkOverdue).toBe(1);
    expect(result.kvkSlaRisk24h).toBe(0);
    expect(result.actions[0]).toMatchObject({ id: "kvk-overdue", priority: "CRITICAL", href: "/support" });
  });

  it("advances operational windows when interactive events occur after the seed clock", () => {
    const { seed, clusters, queueLength, pendingSync } = fixture();
    const mutationAt = new Date(Date.parse(seed.meta.demoNow) + 30 * 24 * 60 * 60 * 1000).toISOString();
    const cases = seed.cases.map((item, index) => index === 0
      ? { ...item, createdAt: mutationAt, updatedAt: mutationAt }
      : item);

    const result = buildDecisionIntelligence({
      cases,
      clusters,
      missions: seed.missions,
      referrals: seed.referrals,
      demoNow: seed.meta.demoNow,
      queueLength,
      pendingSync,
    });

    expect(result.generatedAt).toBe(mutationAt);
    expect(result.signalTrend.slice(0, 7).some((item) => item.value > 0)).toBe(true);
  });

  it("does not invent a rising-district recommendation when recent flow is flat", () => {
    const { seed, clusters, queueLength, pendingSync } = fixture();
    const now = Date.parse(seed.meta.demoNow);
    const cases = seed.cases.map((item) => ({
      ...item,
      createdAt: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString(),
    }));

    const result = buildDecisionIntelligence({
      cases,
      clusters,
      missions: seed.missions,
      referrals: seed.referrals,
      demoNow: seed.meta.demoNow,
      queueLength,
      pendingSync,
    });

    expect(result.districtsTrendingUp).toBe(0);
    expect(result.topRisingDistrict).toBeNull();
    expect(result.actions.some((item) => item.id === "rising-district")).toBe(false);
  });
});
