// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { KVKS, nearestKvks, KVK_META } from "../src/lib/kvk";
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
});

describe("KVK referral lifecycle", () => {
  beforeEach(() => localStorage.clear());

  it("create → status transitions → audited on the case timeline", () => {
    const s = new DemoStore();
    const ref = s.createReferral("C-2614", { kvkId: "KVK-JODHPUR-1", reason: "local follow-up", note: "bajra DM suspected" })!;
    expect(ref.id).toMatch(/^REF-/);
    expect(ref.status).toBe("SHARED");
    s.updateReferralStatus(ref.id, "ACKNOWLEDGED");
    s.updateReferralStatus(ref.id, "RESPONDED", "visit scheduled");
    const after = s.getState().referrals.find((r) => r.id === ref.id)!;
    expect(after.status).toBe("RESPONDED");
    expect(after.statusHistory).toHaveLength(3);
    const timeline = s.getCase("C-2614")!.timeline;
    expect(timeline.some((e) => e.type === "kvk_referral")).toBe(true);
    expect(timeline.some((e) => e.type === "kvk_referral_update")).toBe(true);
  });

  it("persists referrals through the overlay", () => {
    const s = new DemoStore();
    s.createReferral("C-2609", { kvkId: "KVK-JODHPUR-1", reason: "escalation", note: "" });
    const reloaded = new DemoStore();
    expect(reloaded.getState().referrals.length).toBe(1);
  });
});
