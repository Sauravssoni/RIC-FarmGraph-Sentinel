// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  KVKS, KVK_META, REFERRAL_FLOW, canTransitionReferral, contactStatus,
  mapsDirectionsUrl, nearestKvks, referralSlaStatus, specialityMatch,
} from "../src/lib/kvk";
import { DemoStore } from "../src/lib/store";

describe("KVK directory (official-source contacts)", () => {
  it("covers all three pilot districts with real sourced contacts", () => {
    const districts = new Set(KVKS.map((k) => k.district));
    expect(districts).toEqual(new Set(["Jodhpur", "Nagaur", "Jalore"]));
    for (const k of KVKS) {
      expect(k.phone.length).toBeGreaterThan(5);
      expect(k.email).toContain("@");
      expect(k.source.length).toBeGreaterThan(10);
      expect(k.coordsApproximate).toBe(true); // honestly labelled
    }
    expect(KVK_META.sourceUrls.length).toBeGreaterThan(0);
  });

  it("nearest routing prefers same district then distance", () => {
    // Balesar, Jodhpur (golden plot area)
    const m = nearestKvks(26.36, 73.06, "Jodhpur", 3);
    expect(m[0].district).toBe("Jodhpur");
    expect(m[0].distanceKm).toBeLessThan(50);
    expect(m[0].sameDistrict).toBe(true);
  });

  it("crop-speciality match is defensible and crop-aware", () => {
    const jodhpur1 = KVKS.find((k) => k.id === "KVK-JODHPUR-1")!;
    expect(specialityMatch(jodhpur1, "bajra")).toBe(true); // listed speciality
    expect(specialityMatch(jodhpur1, "cumin")).toBe(false); // not listed
  });

  it("contact status handles missing contacts honestly", () => {
    const k = KVKS[0];
    expect(contactStatus(k)).toBe("DIRECTORY_CONTACT_LISTED");
    expect(contactStatus({ phone: "", email: "" })).toBe("MISSING_CONTACT");
    expect(contactStatus({ phone: "  ", email: k.email })).toBe("DIRECTORY_CONTACT_LISTED");
  });

  it("map directions URL carries the approximate coordinates", () => {
    const k = KVKS[0];
    const url = mapsDirectionsUrl(k);
    expect(url).toContain(`${k.lat},${k.lon}`);
    expect(url).toContain("maps/dir");
  });
});

describe("referral lifecycle rules (mirror of the FastAPI repository)", () => {
  it("flow covers all seven states and rejects skips/backwards moves", () => {
    expect(Object.keys(REFERRAL_FLOW).sort()).toEqual(
      ["ACKNOWLEDGED", "CLOSED", "DRAFT", "ESCALATED", "READY_TO_SHARE", "RESPONDED", "SHARED"].sort());
    expect(canTransitionReferral("DRAFT", "READY_TO_SHARE")).toBe(true);
    expect(canTransitionReferral("READY_TO_SHARE", "ACKNOWLEDGED")).toBe(false); // skip
    expect(canTransitionReferral("RESPONDED", "SHARED")).toBe(false); // backwards
    expect(canTransitionReferral("SHARED", "ESCALATED")).toBe(true);
    expect(canTransitionReferral("ESCALATED", "CLOSED")).toBe(true);
    expect(canTransitionReferral("CLOSED", "DRAFT")).toBe(false);
  });

  it("SLA states: within → due soon → overdue; completed when responded", () => {
    const base = { status: "SHARED" as const };
    const now = new Date("2026-07-21T12:00:00Z");
    const in48h = { ...base, dueAt: new Date(now.getTime() + 48 * 3600e3).toISOString() };
    expect(referralSlaStatus(in48h, now)).toBe("WITHIN_SLA");
    const in6h = { ...base, dueAt: new Date(now.getTime() + 6 * 3600e3).toISOString() };
    expect(referralSlaStatus(in6h, now)).toBe("DUE_SOON");
    const past = { ...base, dueAt: new Date(now.getTime() - 3600e3).toISOString() };
    expect(referralSlaStatus(past, now)).toBe("OVERDUE");
    expect(referralSlaStatus({ ...past, status: "RESPONDED" }, now)).toBe("COMPLETED");
    expect(referralSlaStatus({ ...past, status: "CLOSED" }, now)).toBe("COMPLETED");
  });
});

describe("KVK referral lifecycle (standalone DemoStore)", () => {
  beforeEach(() => localStorage.clear());

  it("creation lands at READY_TO_SHARE with a 48h SLA — never implies delivery", () => {
    const s = new DemoStore();
    const ref = s.createReferral("C-2614", { kvkId: "KVK-JODHPUR-1", reason: "local follow-up", note: "bajra DM suspected" })!;
    expect(ref.id).toMatch(/^REF-/);
    expect(ref.status).toBe("READY_TO_SHARE");
    expect(ref.urgency).toBe("PRIORITY");
    expect(ref.slaTargetHours).toBe(48);
    const gapH = (new Date(ref.dueAt).getTime() - new Date(ref.createdAt).getTime()) / 3600e3;
    expect(gapH).toBe(48);
    expect(ref.statusHistory[0].note).toContain("not automated");
  });

  it("full path with escalation branch → audited on the case timeline", () => {
    const s = new DemoStore();
    const ref = s.createReferral("C-2614", { kvkId: "KVK-JODHPUR-1", reason: "local follow-up", note: "" })!;
    s.updateReferralStatus(ref.id, "SHARED");
    s.updateReferralStatus(ref.id, "ESCALATED", "no response in 48h");
    s.updateReferralStatus(ref.id, "RESPONDED", "visit scheduled");
    s.updateReferralStatus(ref.id, "CLOSED");
    const after = s.getState().referrals.find((r) => r.id === ref.id)!;
    expect(after.status).toBe("CLOSED");
    expect(after.statusHistory).toHaveLength(5);
    const timeline = s.getCase("C-2614")!.timeline;
    expect(timeline.some((e) => e.type === "kvk_referral")).toBe(true);
    expect(timeline.some((e) => e.type === "kvk_referral_update")).toBe(true);
  });

  it("invalid transitions are rejected without mutating state", () => {
    const s = new DemoStore();
    const ref = s.createReferral("C-2609", { kvkId: "KVK-JODHPUR-1", reason: "escalation", note: "" })!;
    expect(s.updateReferralStatus(ref.id, "ACKNOWLEDGED")).toBeUndefined(); // skip
    expect(s.updateReferralStatus(ref.id, "ESCALATED")).toBeUndefined(); // not allowed from READY_TO_SHARE
    expect(s.getState().referrals.find((r) => r.id === ref.id)!.status).toBe("READY_TO_SHARE");
    // escalation requires a note
    s.updateReferralStatus(ref.id, "SHARED");
    expect(s.updateReferralStatus(ref.id, "ESCALATED", "")).toBeUndefined();
    expect(s.updateReferralStatus(ref.id, "ESCALATED", "overdue")).toBeDefined();
  });

  it("overdue SLA surfaces on standalone referrals", () => {
    const s = new DemoStore();
    const ref = s.createReferral("C-2609", { kvkId: "KVK-JODHPUR-1", reason: "x", note: "", slaTargetHours: 1 })!;
    const stored = s.getState().referrals.find((r) => r.id === ref.id)!;
    stored.dueAt = new Date(Date.now() - 3600e3).toISOString(); // backdate
    expect(referralSlaStatus(stored)).toBe("OVERDUE");
  });

  it("persists referrals through the overlay", () => {
    const s = new DemoStore();
    s.createReferral("C-2609", { kvkId: "KVK-JODHPUR-1", reason: "escalation", note: "" });
    const reloaded = new DemoStore();
    expect(reloaded.getState().referrals.length).toBe(1);
    expect(reloaded.getState().referrals[0].slaTargetHours).toBe(48);
  });
});
