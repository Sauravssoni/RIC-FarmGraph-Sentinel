// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { DemoStore } from "../src/lib/store";

const GOLDEN = "C-2614";
const OBS = { symptomCategory: "pale_streaking", symptomNote: "streaks", checklist: { leafClose: true, lowerLeaf: true, wholePlant: true, lightingOk: true } };

describe("learning flywheel", () => {
  beforeEach(() => localStorage.clear());

  it("confirm/correct/unknown each create provenance-labelled learning records", () => {
    const s = new DemoStore();
    expect(s.getState().learningRecords).toHaveLength(0);
    s.addObservation(GOLDEN, OBS);
    s.triage(GOLDEN);
    s.review(GOLDEN, { decision: "confirm", conditionId: "downy_mildew", note: "confirmed" });
    const lr = s.getState().learningRecords;
    expect(lr).toHaveLength(1);
    expect(lr[0]).toMatchObject({
      caseId: GOLDEN, crop: "bajra", aiLabel: "downy_mildew",
      expertLabel: "downy_mildew", reviewAction: "confirm",
      provenance: "EXPERT_VERIFIED_REVIEW", usedInModelVersion: null,
    });
  });

  it("correction records the ai→expert delta and audits it", () => {
    const s = new DemoStore();
    s.addObservation(GOLDEN, OBS);
    s.triage(GOLDEN);
    s.review(GOLDEN, { decision: "correct", conditionId: "nutrient_n", note: "uniform chlorosis" });
    const lr = s.getState().learningRecords[0];
    expect(lr.aiLabel).toBe("downy_mildew");
    expect(lr.expertLabel).toBe("nutrient_n");
    expect(s.getCase(GOLDEN)!.timeline.some((e) => e.type === "learning_recorded")).toBe(true);
  });

  it("expert decisions without evidence review do NOT create records", () => {
    const s = new DemoStore();
    s.review("C-2609", { decision: "field_visit", note: "need ground truth" });
    expect(s.getState().learningRecords).toHaveLength(0);
  });
});
