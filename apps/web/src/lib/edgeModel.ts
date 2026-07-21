"use client";
/**
 * Edge inference providers (Phase B3).
 *
 * Three clearly-identified providers:
 *  - OnnxScreeningProvider  → EDGE_MODEL: real MobileNetV2 (ImageNet) running
 *    in onnxruntime-web. Honest narrow role: out-of-distribution screening
 *    ("is this plant material?"), NOT crop-disease classification.
 *  - PixelFeatureProvider   → EDGE_HEURISTIC: classical-CV linear scorer over
 *    interpretable pixel features (data/models/pixfeat-v0.json). Research
 *    preview; NOT a trained network; no accuracy measured.
 *  - The deterministic rules engine (engine.ts) remains the safety/fallback
 *    policy layer and is labelled DETERMINISTIC_FALLBACK wherever it decides.
 *
 * No provider output is ever displayed as "accuracy".
 */
import pixfeat from "@data/models/pixfeat-v0.json";
import type { PixelFeatures } from "./pixelQuality";
import { withBase } from "./basePath";

export type ProviderKind = "EDGE_MODEL" | "EDGE_HEURISTIC" | "DETERMINISTIC_FALLBACK" | "EXPERT_ONLY";

export interface InferenceCandidate {
  classId: string;
  label: string;
  rawScore: number;        // softmax probability (uncalibrated — labelled raw)
  spreadRisk: "low" | "medium" | "high";
  supportedForCrop: boolean;
}

export interface InferenceOutput {
  providerId: string;
  providerKind: ProviderKind;
  modelVersion: string;
  runtime: string;
  durationMs: number;
  candidates: InferenceCandidate[];
  topClass: string;
  topScore: number;
  uncertainty: number;     // 1 − margin(top1, top2)
  abstain: boolean;
  abstainReasons: string[];
  featuresUsed?: Partial<PixelFeatures>;
  screening?: ScreeningResult;
  qualityScore?: number;
  reasons: string[];
  recommendedNext: string[];
  provenance: "RESEARCH_PREVIEW" | "SIMULATED";
  note: string;
  at: string;
}

export interface ScreeningResult {
  topLabel: string;
  topProb: number;
  plantLike: boolean;
  plantProb: number; // summed probability over plant-like ImageNet classes
}

// ---------------------------------------------------------------------------
// Pixel-feature heuristic scorer
// ---------------------------------------------------------------------------

interface PixfeatClass {
  id: string; labelEn: string; spreadRisk: "low" | "medium" | "high";
  weights: Record<string, number>; bias: number;
}
const MODEL = pixfeat as unknown as {
  id: string; version: string; classes: PixfeatClass[];
  cropSupport: Record<string, string[]>;
  policy: { abstainMaxProbBelow: number; abstainGreenCoverageBelow: number; expertAlwaysIfSpreadRisk: string };
};

const FEATURE_KEYS = ["greenCoverage", "chlorosisIdx", "whiteningIdx", "lesionIdx", "textureEnergy"] as const;

export function scoreWithPixfeat(features: PixelFeatures, crop: string): InferenceOutput {
  const t0 = performance.now();
  const supported = new Set(MODEL.cropSupport[crop] ?? MODEL.cropSupport.bajra);
  const logits = MODEL.classes.map((c) => {
    let z = c.bias;
    for (const k of FEATURE_KEYS) z += (c.weights[k] ?? 0) * (features[k] ?? 0);
    return { c, z };
  });
  const maxZ = Math.max(...logits.map((l) => l.z));
  const exps = logits.map((l) => Math.exp(l.z - maxZ));
  const sum = exps.reduce((a, b) => a + b, 0);
  const candidates: InferenceCandidate[] = logits
    .map((l, i) => ({
      classId: l.c.id,
      label: l.c.labelEn,
      rawScore: Math.round((exps[i] / sum) * 1000) / 1000,
      spreadRisk: l.c.spreadRisk,
      supportedForCrop: supported.has(l.c.id),
    }))
    .sort((a, b) => b.rawScore - a.rawScore);

  const top = candidates[0];
  const second = candidates[1] ?? { rawScore: 0 };
  const uncertainty = Math.round((1 - (top.rawScore - second.rawScore)) * 1000) / 1000;

  const abstainReasons: string[] = [];
  if (features.greenCoverage < MODEL.policy.abstainGreenCoverageBelow) {
    abstainReasons.push(`Vegetation covers only ${(features.greenCoverage * 100).toFixed(1)}% of the frame — recapture with the leaf filling the frame`);
  }
  if (top.rawScore < MODEL.policy.abstainMaxProbBelow) {
    abstainReasons.push(`Top pixel-pattern score ${top.rawScore.toFixed(2)} is below the abstention threshold ${MODEL.policy.abstainMaxProbBelow} — patterns are ambiguous`);
  }
  if (!top.supportedForCrop) {
    abstainReasons.push(`Pattern "${top.label}" is not a supported target for ${crop} in this prototype`);
  }
  if (features.blurScore < 0.12) {
    abstainReasons.push("Image sharpness is too low for reliable pixel patterns");
  }
  const abstain = abstainReasons.length > 0;

  const reasons: string[] = [
    `vegetation coverage ${(features.greenCoverage * 100).toFixed(1)}%`,
    `yellowing ${(features.chlorosisIdx * 100).toFixed(1)}%`,
    `whitish/downy pixels ${(features.whiteningIdx * 100).toFixed(1)}%`,
    `necrotic pixels ${(features.lesionIdx * 100).toFixed(1)}%`,
  ];
  const recommendedNext: string[] = [];
  if (top.classId === "downy_mildew_suspect") recommendedNext.push("Photograph the lower leaf surface in diffused light", "Include the whole plant for spread assessment");
  if (top.classId === "leaf_lesion_suspect") recommendedNext.push("Take a second close-up of a different lesion", "Photograph the field edge for distribution context");
  if (top.classId === "nutrient_stress_suspect") recommendedNext.push("Photograph several plants — nutrient patterns are usually uniform across plants");
  if (abstain) recommendedNext.push("Recapture following the quality instructions, or submit for expert review");

  return {
    providerId: MODEL.id,
    providerKind: "EDGE_HEURISTIC",
    modelVersion: MODEL.version,
    runtime: "typescript-canvas",
    durationMs: Math.round(performance.now() - t0),
    candidates,
    topClass: top.classId,
    topScore: top.rawScore,
    uncertainty,
    abstain,
    abstainReasons,
    featuresUsed: {
      greenCoverage: features.greenCoverage, chlorosisIdx: features.chlorosisIdx,
      whiteningIdx: features.whiteningIdx, lesionIdx: features.lesionIdx,
      textureEnergy: features.textureEnergy, blurScore: features.blurScore,
    },
    reasons,
    recommendedNext,
    provenance: "RESEARCH_PREVIEW",
    note: "Classical-CV pixel-feature scorer with published hand-set weights — NOT a trained neural network. Scores are uncalibrated research-preview values; no accuracy has been measured. Expert verification required.",
    at: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// ONNX MobileNetV2 screening (optional, real deep-learning inference)
// ---------------------------------------------------------------------------

const PLANT_LIKE = new Set([
  "cardoon", "broccoli", "cauliflower", "cabbage", "head cabbage", "corn", "rapeseed",
  "daisy", "acorn", "buckeye", "coral fungus", "agaric", "gyromitra", "stinkhorn",
  "earthstar", "hen-of-the-woods", "bolete", "leaf beetle", "leafhopper", "grasshopper",
  "leafhopper", "weevil", "pot", "flower", "banana", "pineapple", "fig", "ear",
]);

let sessionPromise: Promise<unknown> | null = null;
let labelsPromise: Promise<string[]> | null = null;

async function loadLabels(): Promise<string[]> {
  if (!labelsPromise) {
    labelsPromise = fetch(withBase("/models/imagenet_classes.txt")).then((r) => r.text()).then((t) => t.split("\n").map((s) => s.trim()).filter(Boolean));
  }
  return labelsPromise;
}

export async function onnxScreeningAvailable(): Promise<boolean> {
  try {
    const res = await fetch(withBase("/models/mobilenetv2-7.onnx"), { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Run MobileNetV2 ImageNet screening on pixel data. Returns null when the
 * runtime or model is unavailable — callers must treat this as optional.
 */
export async function runOnnxScreening(img: ImageData): Promise<ScreeningResult | null> {
  try {
    const ort = await import("onnxruntime-web");
    ort.env.wasm.wasmPaths = withBase("/ort/"); // bundled runtime — works fully offline after first cache
    // Force the NON-threaded wasm binary: static hosts (GitHub Pages) cannot
    // send the COOP/COEP headers SharedArrayBuffer needs, so the threaded
    // build is unusable there. Single-thread SIMD is fast enough for 224×224.
    ort.env.wasm.numThreads = 1;
    if (!sessionPromise) {
      sessionPromise = ort.InferenceSession.create(withBase("/models/mobilenetv2-7.onnx"), { executionProviders: ["wasm"] });
    }
    const session = (await sessionPromise) as import("onnxruntime-web").InferenceSession;

    // Preprocess: resize to 224×224, normalise to [0,1], CHW float32.
    const canvas = document.createElement("canvas");
    canvas.width = 224; canvas.height = 224;
    const ctx = canvas.getContext("2d")!;
    const src = document.createElement("canvas");
    src.width = img.width; src.height = img.height;
    src.getContext("2d")!.putImageData(img, 0, 0);
    ctx.drawImage(src, 0, 0, 224, 224);
    const d = ctx.getImageData(0, 0, 224, 224).data;
    const input = new Float32Array(3 * 224 * 224);
    for (let i = 0; i < 224 * 224; i++) {
      input[i] = d[i * 4] / 255;
      input[224 * 224 + i] = d[i * 4 + 1] / 255;
      input[2 * 224 * 224 + i] = d[i * 4 + 2] / 255;
    }
    const tensor = new ort.Tensor("float32", input, [1, 3, 224, 224]);
    const inputName = session.inputNames[0];
    const out = await session.run({ [inputName]: tensor });
    const logits = out[session.outputNames[0]].data as Float32Array;
    const max = Math.max(...logits);
    const exps = Array.from(logits, (v) => Math.exp(v - max));
    const sum = exps.reduce((a, b) => a + b, 0);
    const probs = exps.map((e) => e / sum);
    const topIdx = probs.indexOf(Math.max(...probs));
    const labels = await loadLabels();
    let plantProb = 0;
    labels.forEach((label, i) => { if (PLANT_LIKE.has(label.toLowerCase())) plantProb += probs[i] ?? 0; });
    return {
      topLabel: labels[topIdx] ?? `#${topIdx}`,
      topProb: Math.round(probs[topIdx] * 1000) / 1000,
      plantLike: plantProb >= 0.15,
      plantProb: Math.round(plantProb * 1000) / 1000,
    };
  } catch {
    return null;
  }
}
