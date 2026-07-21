/**
 * Real pixel-based image-quality analysis (Phase B2).
 * Operates on raw ImageData — no server, no cloud. Every check is measurable
 * and unit-testable. Thresholds are prototype policy, not validated agronomic
 * thresholds; they are tuned to reject unusable field captures and explained
 * to the user as recapture instructions.
 */

export interface PixelCheck {
  id: string;
  label: string;
  value: number;
  pass: boolean;
  detail: string;
}

export interface PixelQualityResult {
  score: number; // 0..1 composite
  pass: boolean;
  checks: PixelCheck[];
  recaptureInstructions: string[];
  features: PixelFeatures;
}

export interface PixelFeatures {
  width: number;
  height: number;
  blurScore: number;      // variance of Laplacian, normalised 0..1 (higher = sharper)
  brightness: number;     // mean luma 0..255
  contrast: number;       // stddev of luma
  overexposedFrac: number;
  underexposedFrac: number;
  greenCoverage: number;  // ExG-threshold leaf/vegetation fraction 0..1
  chlorosisIdx: number;   // yellowing fraction 0..1
  whiteningIdx: number;   // pale/whitish low-saturation fraction 0..1
  lesionIdx: number;      // brown/dark necrotic fraction 0..1
  textureEnergy: number;  // high-frequency energy 0..1
}

export interface PixelPolicy {
  minWidth: number;
  minHeight: number;
  blurMin: number;            // normalised blur score floor
  brightnessMin: number;
  brightnessMax: number;
  contrastMin: number;
  overexposedMax: number;
  underexposedMax: number;
  greenCoverageMin: number;
  passScore: number;
}

export const PIXEL_POLICY: PixelPolicy = {
  minWidth: 320,
  minHeight: 240,
  blurMin: 0.12,
  brightnessMin: 35,
  brightnessMax: 225,
  contrastMin: 18,
  overexposedMax: 0.25,
  underexposedMax: 0.3,
  greenCoverageMin: 0.08,
  passScore: 0.55,
};

/** Extract all pixel features from ImageData (single pass + gradient pass). */
export function extractFeatures(img: ImageData): PixelFeatures {
  const { width: w, height: h, data } = img;
  const n = w * h;
  const luma = new Float32Array(n);
  let sum = 0, sumSq = 0;
  let over = 0, under = 0, green = 0, chloro = 0, white = 0, lesion = 0;

  for (let i = 0; i < n; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    const L = 0.299 * r + 0.587 * g + 0.114 * b;
    luma[i] = L;
    sum += L; sumSq += L * L;
    if (L >= 250) over++;
    if (L <= 8) under++;
    const exg = 2 * g - r - b;
    if (exg > 24 && g > 60) green++;
    // yellowing: red≈green, both clearly above blue, mid brightness
    if (r > 110 && g > 100 && b < 0.72 * Math.min(r, g) && Math.abs(r - g) < 60) chloro++;
    // whitish/downy: bright, low saturation
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (L > 150 && (mx - mn) < 42) white++;
    // brown/necrotic: red>green>blue, dark-ish
    if (r > g && g >= b && L < 130 && r - b > 24) lesion++;
  }

  const brightness = sum / n;
  const contrast = Math.sqrt(Math.max(0, sumSq / n - brightness * brightness));

  // Laplacian variance (blur) + gradient energy (texture)
  let lapSum = 0, lapSq = 0, gradSum = 0;
  let count = 0;
  for (let y = 1; y < h - 1; y += 2) { // stride 2 for speed
    for (let x = 1; x < w - 1; x += 2) {
      const i = y * w + x;
      const lap =
        luma[i - 1] + luma[i + 1] + luma[i - w] + luma[i + w] - 4 * luma[i];
      lapSum += lap; lapSq += lap * lap;
      gradSum += Math.abs(luma[i + 1] - luma[i - 1]) + Math.abs(luma[i + w] - luma[i - w]);
      count++;
    }
  }
  const lapMean = lapSum / count;
  const lapVar = lapSq / count - lapMean * lapMean;
  // Empirical normalisation: sharp photos score >> 200; blurry < 30.
  const blurScore = Math.min(1, lapVar / 220);
  const textureEnergy = Math.min(1, gradSum / count / 90);

  return {
    width: w, height: h,
    blurScore,
    brightness,
    contrast,
    overexposedFrac: over / n,
    underexposedFrac: under / n,
    greenCoverage: green / n,
    chlorosisIdx: chloro / n,
    whiteningIdx: white / n,
    lesionIdx: lesion / n,
    textureEnergy,
  };
}

/** Assess capture quality from pixels. Returns explicit recapture instructions. */
export function analyzePixels(img: ImageData, policy: PixelPolicy = PIXEL_POLICY): PixelQualityResult {
  const f = extractFeatures(img);
  const checks: PixelCheck[] = [
    {
      id: "dimensions", label: "Resolution", value: Math.min(f.width, f.height),
      pass: f.width >= policy.minWidth && f.height >= policy.minHeight,
      detail: `${f.width}×${f.height}px (min ${policy.minWidth}×${policy.minHeight})`,
    },
    {
      id: "blur", label: "Sharpness", value: Math.round(f.blurScore * 100) / 100,
      pass: f.blurScore >= policy.blurMin,
      detail: f.blurScore >= policy.blurMin ? "Image is sharp enough" : "Image is blurry",
    },
    {
      id: "brightness", label: "Exposure", value: Math.round(f.brightness),
      pass: f.brightness >= policy.brightnessMin && f.brightness <= policy.brightnessMax,
      detail: f.brightness < policy.brightnessMin ? "Too dark" : f.brightness > policy.brightnessMax ? "Too bright" : "Exposure acceptable",
    },
    {
      id: "contrast", label: "Contrast", value: Math.round(f.contrast),
      pass: f.contrast >= policy.contrastMin,
      detail: f.contrast >= policy.contrastMin ? "Detail is distinguishable" : "Flat / low contrast",
    },
    {
      id: "overexposure", label: "Glare", value: Math.round(f.overexposedFrac * 1000) / 10,
      pass: f.overexposedFrac <= policy.overexposedMax,
      detail: `${(f.overexposedFrac * 100).toFixed(1)}% blown-out pixels`,
    },
    {
      id: "underexposure", label: "Shadow crush", value: Math.round(f.underexposedFrac * 1000) / 10,
      pass: f.underexposedFrac <= policy.underexposedMax,
      detail: `${(f.underexposedFrac * 100).toFixed(1)}% near-black pixels`,
    },
    {
      id: "greenCoverage", label: "Plant material in frame", value: Math.round(f.greenCoverage * 1000) / 10,
      pass: f.greenCoverage >= policy.greenCoverageMin,
      detail: `${(f.greenCoverage * 100).toFixed(1)}% vegetation detected`,
    },
  ];

  const failed = checks.filter((c) => !c.pass);
  const passRatio = checks.filter((c) => c.pass).length / checks.length;
  // Composite score: pass ratio weighted by how close failures came.
  const closeness = checks.reduce((acc, c) => {
    if (c.pass) return acc + 1;
    if (c.id === "blur") return acc + Math.min(1, f.blurScore / policy.blurMin);
    if (c.id === "greenCoverage") return acc + Math.min(1, f.greenCoverage / policy.greenCoverageMin);
    if (c.id === "contrast") return acc + Math.min(1, f.contrast / policy.contrastMin);
    return acc + 0.3;
  }, 0) / checks.length;
  const score = Math.round(((passRatio + closeness) / 2) * 100) / 100;

  const recaptureInstructions: string[] = [];
  for (const c of failed) {
    switch (c.id) {
      case "dimensions": recaptureInstructions.push("Move closer or use the camera's full resolution"); break;
      case "blur": recaptureInstructions.push("Hold the camera steady and tap to focus before shooting"); break;
      case "brightness": recaptureInstructions.push(f.brightness < PIXEL_POLICY.brightnessMin ? "Move into better light — avoid shade on the leaf" : "Avoid direct harsh sunlight / flash glare"); break;
      case "contrast": recaptureInstructions.push("Fill the frame with the affected leaf against a plain background"); break;
      case "overexposure": recaptureInstructions.push("Tilt the leaf to avoid glare; shoot in diffused light"); break;
      case "underexposure": recaptureInstructions.push("Brighten the scene — do not photograph in deep shade"); break;
      case "greenCoverage": recaptureInstructions.push("Frame the affected leaf/plant so vegetation fills most of the image"); break;
    }
  }
  if (failed.some((c) => c.id === "blur" || c.id === "greenCoverage")) {
    recaptureInstructions.push("Also photograph the lower leaf surface and the whole plant");
  }

  return { score, pass: failed.length === 0 && score >= policy.passScore, checks, recaptureInstructions, features: f };
}
