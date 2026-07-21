// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { GOV_INFRA_STEPS } from "../src/components/GovInfraPath";
import glossary from "@data/reference/regional-glossary.json";
import whitelistEvidence from "@data/reference/imd-whitelist-evidence.json";

describe("Judge Mode — Government Infrastructure chapter", () => {
  it("has exactly 12 steps, each fully specified", () => {
    expect(GOV_INFRA_STEPS.length).toBe(12);
    for (const s of GOV_INFRA_STEPS) {
      expect(s.title.length).toBeGreaterThan(8);
      expect(s.presenter.length).toBeGreaterThan(40);
      expect(s.judges.length).toBeGreaterThan(40);
    }
    expect(new Set(GOV_INFRA_STEPS.map((s) => s.title)).size).toBe(12);
  });

  it("covers every WS2 integration surface", () => {
    const all = GOV_INFRA_STEPS.map((s) => `${s.title} ${s.presenter} ${s.judges}`).join("\n");
    for (const needle of [
      "IMD", "whitelist", "Bhashini", "ULCA", "AGMARKNET", "KVK",
      "Soil Health Card", "AgriStack", "e-Dharti", "SAMPLE", "CONTRACT_DEFINED",
      "48", "kvk-referral-pack/v1",
    ]) {
      expect(all).toContain(needle);
    }
  });

  it("closes on the degraded-truth statement (no live adapter claimed)", () => {
    const last = GOV_INFRA_STEPS[GOV_INFRA_STEPS.length - 1];
    expect(last.judges).toContain("LIVE");
    expect(last.judges.toLowerCase()).toContain("no adapter");
    expect(last.title.toLowerCase()).toContain("truthful");
  });

  it("evidence artefacts used by the chapter are the genuine captures", () => {
    expect(whitelistEvidence.response.httpStatus).toBe(401);
    expect(whitelistEvidence.response.bodyExcerpt.toLowerCase()).toContain("whitelist");
    expect(glossary.meta.dialectAsrClaim).toContain("NONE");
    expect(glossary.meta.status).toContain("DRAFT");
  });
});
