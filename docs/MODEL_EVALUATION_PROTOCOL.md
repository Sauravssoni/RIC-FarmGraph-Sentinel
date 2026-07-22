# Rajasthan Field Model Evaluation Protocol

## Purpose

FarmGraph Rakshak does **not** claim measured disease-model accuracy in the current prototype. This protocol defines the evidence required before a future regional model may move from `CANDIDATE` to `CHALLENGER` or appear in any government-facing accuracy claim.

The protocol is executable through:

```bash
python3 scripts/evaluate_model.py \
  --input <expert-labelled-predictions.jsonl> \
  --output <evaluation-report.json> \
  --split test \
  --high-spread-labels downy_mildew \
  --require-field-provenance

python3 scripts/model_promotion_gate.py \
  --report <evaluation-report.json> \
  --output <promotion-decision.json>
```

## Dataset contract

Every row must include:

- `sample_id`: immutable image/evidence identifier;
- `source_group`: farm/plot/collection-session group used for leakage control;
- `split`: `train`, `validation` or `test`;
- `crop`: bajra, mustard, guar or cumin;
- `district`: collection district;
- `y_true`: expert-confirmed class;
- `y_pred`: model output class;
- `confidence`: calibrated probability in `[0,1]`;
- `abstained`: whether the model declined to classify;
- `provenance`: `FIELD_EXPERT_VERIFIED` for claimable evidence.

A `source_group` may appear in only one split. The evaluator fails immediately on duplicate sample IDs or farm/session leakage across splits.

## Test-set construction

1. Freeze the taxonomy and collection protocol before labelling.
2. Split by farm/plot/session, never by individual image.
3. Keep the test set sealed from training, threshold tuning and prompt/model selection.
4. Require expert adjudication for disagreements and preserve reviewer IDs and dates outside the public pack.
5. Report class support, district support, device type, crop stage and capture conditions.
6. Version the manifest and hash the exact test file used for every report.

## Metrics

The evaluator reports:

- end-to-end macro F1 and macro recall;
- per-class precision, recall and F1;
- high-spread-condition recall;
- coverage and abstention rate;
- selective accuracy on non-abstained cases;
- expected calibration error and Brier score;
- confusion matrix with abstention as an explicit outcome;
- crop and district subgroup performance;
- deterministic bootstrap 95% confidence intervals.

Abstentions count as false negatives in end-to-end recall. This prevents a model from appearing strong by refusing difficult cases.

## Internal promotion gate

A model remains `CANDIDATE` unless all checks pass:

| Gate | Default threshold |
|---|---:|
| Expert-verified field provenance | 100% of evaluated rows |
| Source-group leakage | None |
| Support per evaluated class | ≥ 50 |
| End-to-end macro F1 | ≥ 0.80 |
| High-spread-condition recall | ≥ 0.90 with ≥ 50 examples |
| Expected calibration error | ≤ 0.08 |
| Prediction coverage | ≥ 0.60 |
| Maximum district end-to-end accuracy gap | ≤ 0.15 |

These are FarmGraph's internal pilot gates, not government-certified thresholds. Rajasthan/KVK partners may tighten them by crop, disease and season.

Passing these gates advances a model only to `CHALLENGER`. Champion promotion additionally requires:

- independent agronomy/KVK review;
- shadow-mode comparison against the current champion;
- safety review of high-spread false negatives;
- rollback package and model hash;
- approved model card and change log.

## Synthetic CI fixture

`data/validation/model-contract-fixture.jsonl` exists only to prove that the pipeline computes metrics, detects leakage and **rejects synthetic evidence from promotion**. Its scores must never be quoted as model accuracy.

## Claim language

Allowed only after a field report passes the promotion gate:

> On the locked expert-verified test set version `<hash>`, model `<version>` achieved `<metric>` with `<95% CI>`, at `<coverage>` coverage. Performance varies by crop, district and capture condition; consequential advisories remain expert-controlled.

Never claim:

- “100% accurate”;
- “Rajasthan-trained” without documented Rajasthan field data;
- synthetic-fixture metrics as field performance;
- autonomous agronomic decision-making;
- performance without class supports and confidence intervals.
