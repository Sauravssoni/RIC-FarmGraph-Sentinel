// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { analyzePixels, extractFeatures, PIXEL_POLICY } from "../src/lib/pixelQuality";

const TEST_POLICY = { ...PIXEL_POLICY, minWidth: 128, minHeight: 96 }; // synthetic test images are small by design
import { scoreWithPixfeat } from "../src/lib/edgeModel";

/** Build a synthetic ImageData with controlled colour composition + noise. */
function synthImage(
  w: number, h: number,
  paint: (x: number, y: number) => [number, number, number],
  noise = 0,
): ImageData {
  const img = new ImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const [r, g, b] = paint(x, y);
      const nz = noise ? (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453 % 1) * noise : 0;
      img.data[i] = Math.max(0, Math.min(255, r + nz));
      img.data[i + 1] = Math.max(0, Math.min(255, g + nz));
      img.data[i + 2] = Math.max(0, Math.min(255, b + nz));
      img.data[i + 3] = 255;
    }
  }
  return img;
}

const GREEN: [number, number, number] = [60, 140, 60];
const WHITE_DOWNY: [number, number, number] = [215, 218, 212];
const YELLOW: [number, number, number] = [190, 175, 70];

describe("pixel feature extraction (real ImageData)", () => {
  it("sharp textured green leaf: high blur score, high green coverage, passes", () => {
    const img = synthImage(128, 96, (x, y) => ((x + y) % 7 === 0 ? [40, 110, 40] : GREEN), 40);
    const f = extractFeatures(img);
    expect(f.greenCoverage).toBeGreaterThan(0.7);
    expect(f.blurScore).toBeGreaterThan(0.3);
    const q = analyzePixels(img, TEST_POLICY);
    expect(q.pass).toBe(true);
    expect(q.checks.every((c) => c.pass)).toBe(true);
  });

  it("flat uniform blur: fails sharpness with steady-camera instruction", () => {
    const img = synthImage(128, 96, () => [120, 150, 110]); // flat, no texture
    const q = analyzePixels(img, TEST_POLICY);
    const blur = q.checks.find((c) => c.id === "blur")!;
    expect(blur.pass).toBe(false);
    expect(q.recaptureInstructions.some((r) => /steady/i.test(r))).toBe(true);
    expect(q.pass).toBe(false);
  });

  it("blown-out glare: fails overexposure with glare instruction", () => {
    const img = synthImage(128, 96, (x, y) => (x > 60 ? [255, 255, 255] : GREEN), 20);
    const q = analyzePixels(img, TEST_POLICY);
    expect(q.checks.find((c) => c.id === "overexposure")!.pass).toBe(false);
    expect(q.recaptureInstructions.some((r) => /glare/i.test(r))).toBe(true);
  });

  it("dark underexposed: fails brightness with better-light instruction", () => {
    const img = synthImage(128, 96, () => [14, 20, 14]);
    const q = analyzePixels(img, TEST_POLICY);
    expect(q.checks.find((c) => c.id === "brightness")!.pass).toBe(false);
    expect(q.recaptureInstructions.some((r) => /light/i.test(r))).toBe(true);
  });

  it("non-plant frame: fails green coverage with framing instruction", () => {
    const img = synthImage(128, 96, () => [160, 160, 165], 30); // grey concrete-ish
    const q = analyzePixels(img, TEST_POLICY);
    expect(q.checks.find((c) => c.id === "greenCoverage")!.pass).toBe(false);
    expect(q.recaptureInstructions.some((r) => /leaf\/plant|vegetation/i.test(r))).toBe(true);
  });

  it("small image: fails dimension check against the production threshold", () => {
    const img = synthImage(200, 150, () => GREEN, 30);
    const q = analyzePixels(img); // production policy: min 320×240
    expect(q.checks.find((c) => c.id === "dimensions")!.pass).toBe(false);
  });
});

describe("pixfeat heuristic scorer (research preview, not a trained NN)", () => {
  it("whitish-downy pattern leads to downy_mildew_suspect for bajra", () => {
    const img = synthImage(128, 96, (x, y) => ((x + y) % 5 === 0 ? WHITE_DOWNY : GREEN), 30);
    const f = extractFeatures(img);
    const out = scoreWithPixfeat(f, "bajra");
    expect(out.providerKind).toBe("EDGE_HEURISTIC");
    expect(out.topClass).toBe("downy_mildew_suspect");
    expect(out.candidates[0].spreadRisk).toBe("high");
    expect(out.provenance).toBe("RESEARCH_PREVIEW");
    expect(out.note).toMatch(/NOT a trained neural network/);
  });

  it("uniform yellowing leads to nutrient_stress_suspect", () => {
    const img = synthImage(128, 96, () => YELLOW, 8);
    const f = extractFeatures(img);
    const out = scoreWithPixfeat(f, "bajra");
    expect(out.topClass).toBe("nutrient_stress_suspect");
  });

  it("clean green leaf leads to healthy", () => {
    const img = synthImage(128, 96, () => GREEN, 10);
    const f = extractFeatures(img);
    const out = scoreWithPixfeat(f, "mustard");
    expect(out.topClass).toBe("healthy");
  });

  it("non-plant frame abstains instead of guessing", () => {
    const img = synthImage(128, 96, () => [150, 150, 155], 25);
    const f = extractFeatures(img);
    const out = scoreWithPixfeat(f, "bajra");
    expect(out.abstain).toBe(true);
    expect(out.abstainReasons.length).toBeGreaterThan(0);
  });

  it("downy-mildew-type pattern is not offered for guar (unsupported crop)", () => {
    const img = synthImage(128, 96, (x, y) => ((x + y) % 5 === 0 ? WHITE_DOWNY : GREEN), 30);
    const f = extractFeatures(img);
    const out = scoreWithPixfeat(f, "guar");
    const dm = out.candidates.find((c) => c.classId === "downy_mildew_suspect")!;
    expect(dm.supportedForCrop).toBe(false);
  });

  it("scores are never labelled accuracy and uncertainty is reported", () => {
    const img = synthImage(128, 96, (x, y) => ((x + y) % 4 === 0 ? YELLOW : GREEN), 20);
    const out = scoreWithPixfeat(extractFeatures(img), "bajra");
    expect(out.uncertainty).toBeGreaterThanOrEqual(0);
    expect(out.uncertainty).toBeLessThanOrEqual(1);
    expect(out.note).toMatch(/no accuracy has been measured/i);
    expect(Object.keys(out.candidates[0])).not.toContain("accuracy");
  });
});
