# Model Card — FarmGraph Rakshak inference stack (Task 002)

**Scope.** This card covers every component that produces a class-like output in
the prototype. None of them is a trained crop-disease model, and the UI says so
wherever their output appears.

## 1. pixfeat-v0 — interpretable pixel-feature scorer (`EDGE_HEURISTIC`)

| | |
|---|---|
| Version | `pixfeat-v0.2.0` (`data/models/pixfeat-v0.json`) |
| Type | Linear softmax over 5 hand-engineered pixel features |
| Weights | Hand-set, published in the repo; recalibrated v0.1→v0.2 after synthetic-pattern probes |
| Features | greenCoverage (ExG), chlorosisIdx, whiteningIdx, lesionIdx, textureEnergy — computed by `apps/web/src/lib/pixelQuality.ts` |
| Classes | healthy, downy_mildew_suspect, leaf_lesion_suspect, nutrient_stress_suspect, unknown_unsupported |
| Crop support | bajra, mustard (all classes); guar, cumin (no downy class) — enforced at inference |

**Intended use:** demonstrate a genuine pixel-processing inference path with
interpretable inputs, published weights, and a conservative abstention policy.
**Not intended for:** any agronomic decision. Scores are labelled *raw* and
*research preview*; **no accuracy has been measured** because no labelled
field dataset exists for these crops in this prototype.

**Abstention policy** (any trigger → abstain + reasons + recommendedNext):
top raw score < 0.45 · vegetation coverage < 8% · blur below threshold ·
top class not supported for the crop. High-spread-risk classes always route to
expert. Abstention behaviour is unit-tested (`tests/pixel.test.ts`) and
e2e-tested via the Judge Mode negative path.

## 2. MobileNetV2-7 (ImageNet) — optional OOD screening (`EDGE_MODEL`)

| | |
|---|---|
| Source | onnx/models zoo, Apache-2.0 |
| Role | Screens whether a frame looks plant-like at all (ImageNet plant subset) |
| Hard rule | Its ImageNet labels are **never shown as crop-disease output**; it only informs the OOD note |

The model file (14,246,826 bytes, verified by loading + inference) is bundled
at `apps/web/public/models/mobilenetv2-7.onnx`; the app still HEAD-checks the
path and degrades gracefully if it is absent. `onnxruntime-web` and its WASM
runtime ship with the app.

## 3. Deterministic rules engine (`DETERMINISTIC_FALLBACK`)

The Task 001 triage/outbreak engine (Python + TypeScript dual implementation
driven by shared `policy.json`/`taxonomy.json`). Outputs are labelled
`SIMULATED`; it is the safety net that keeps the demo deterministic and is the
provider of record for the golden path.

## 4. Lifecycle states

Tracked on `/learning` and `/governance`: REGISTERED → CANDIDATE → EVALUATING
→ CHALLENGER → CHAMPION → RETIRED. Current registry: pixfeat CHAMPION
(research preview), mobilenetv2-7 REGISTERED (screening only),
fieldnet-bajra-v0 CANDIDATE (placeholder for a future trained model — no
weights exist, honestly labelled).

## 5. Learning flywheel

Expert confirm/correct/unknown produces a `LearningRecord` with provenance
`EXPERT_VERIFIED_REVIEW`, the AI↔expert delta, consent flag, and
`usedInModelVersion: null`. **No automatic training occurs.** A record is
consumed only by a reviewed, versioned model-update cycle.

## 6. Known failure modes (tested)

Blurred/dark frames, non-plant frames, corrupt files, duplicate evidence,
patterns outside a crop's support set — all rejected or abstained; see the
Judge Mode negative path (9 live checks) and `apps/api/tests/test_api_phase2.py`.
