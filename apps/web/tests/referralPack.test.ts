// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { buildReferralPack, packToPrintableHtml } from "../src/lib/referralPack";
import { KVKS } from "../src/lib/kvk";
import { DemoStore } from "../src/lib/store";

const REQUIRED_KEYS = [
  "packVersion", "generatedAt", "referralId", "referralStatus", "caseId",
  "farmerRef", "plotRef", "district", "block", "coordinates", "crop", "cropStage",
  "symptomSummary", "imageHashes", "imageQuality", "inference",
  "verificationStatement", "expertReviewState", "urgency", "outbreakRelationship",
  "requestedAction", "originatingRole", "consentStatus", "createdAt", "sla",
  "auditReference", "farmgraphContact", "kvk", "provenance",
] as const;

function makePack(caseId: string) {
  const s = new DemoStore();
  const ref = s.createReferral(caseId, { kvkId: "KVK-JODHPUR-1", reason: "local follow-up", note: "needs field visit", urgency: "URGENT" })!;
  const kase = s.getCase(caseId)!;
  const cluster = s.getState().clusters.find((c) => c.memberCaseIds.includes(caseId));
  const pack = buildReferralPack({
    kase,
    referral: ref,
    kvk: KVKS.find((k) => k.id === ref.kvkId),
    outbreakRelationship: cluster
      ? `Member of cluster ${cluster.id} (${cluster.name}, status ${cluster.status})`
      : "Not part of any outbreak cluster",
    generatedAt: "2026-07-21T06:00:00.000Z",
  });
  return { pack, ref, kase };
}

describe("referral evidence pack (kvk-referral-pack/v1)", () => {
  beforeEach(() => localStorage.clear());

  it("contains every required field with the right values", () => {
    const { pack, ref } = makePack("C-2614");
    for (const k of REQUIRED_KEYS) expect(pack, `missing ${k}`).toHaveProperty(k);
    expect(pack.packVersion).toBe("kvk-referral-pack/v1");
    expect(pack.referralId).toBe(ref.id);
    expect(pack.referralStatus).toBe("READY_TO_SHARE");
    expect(pack.urgency).toBe("URGENT");
    expect(pack.kvk.id).toBe("KVK-JODHPUR-1");
    expect(pack.kvk.phone).toBeTruthy();
    expect(pack.requestedAction).toContain("needs field visit");
    expect(pack.sla.targetHours).toBe(48);
    expect(pack.sla.status).toBe("WITHIN_SLA");
    expect(pack.auditReference).toMatch(/^EV-/);
    expect(pack.provenance).toContain("SIMULATED DEMO PACK");
  });

  it("states UNVERIFIED for unreviewed cases and expert-reviewed for confirmed ones", () => {
    const { pack: unverified } = makePack("C-2614"); // AWAITING flow, no expert confirm in seed path used
    expect(unverified.verificationStatement).toContain("UNVERIFIED");
    const { pack: verified } = makePack("C-2601"); // expertConfirmedCondition = alternaria_blight
    expect(verified.verificationStatement).toContain("Expert-reviewed");
  });

  it("masks privacy: rounded coordinates, pseudonymous refs, no identity numbers", () => {
    const { pack, kase } = makePack("C-2614");
    expect(pack.coordinates.lat).toBe(Math.round(kase.lat * 100) / 100);
    expect(pack.coordinates.precisionNote.toLowerCase()).toContain("privacy");
    expect(pack.farmerRef).toBe(kase.farmerId); // pseudonymous ID only
    const blob = JSON.stringify(pack).toLowerCase();
    expect(blob).not.toContain("aadhaar");
    expect(blob).not.toContain("jan aadhaar");
  });

  it("carries evidence references and inference provenance", () => {
    const { pack } = makePack("C-2614");
    expect(Array.isArray(pack.imageHashes)).toBe(true);
    expect(pack.inference.provider).toBeTruthy();
    expect(pack.inference.version).toBeTruthy();
  });

  it("printable HTML carries the demo banner and escapes injected markup", () => {
    const { pack } = makePack("C-2614");
    pack.symptomSummary = '<script>alert("x")</script>';
    const html = packToPrintableHtml(pack);
    expect(html).toContain("DEMO PROTOTYPE — SYNTHETIC FARMER DATA");
    expect(html).toContain(pack.referralId);
    expect(html).not.toContain('<script>alert("x")</script>');
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("@media print"); // PDF-friendly
  });
});
