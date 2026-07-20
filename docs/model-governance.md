# Model Governance

## Registry (as shown on `/governance`)

| Model | Kind | Status | Honest note |
|---|---|---|---|
| `demo-rules-0.1.0` | deterministic-demo | ACTIVE (demo provider) | Rule-based scores from `taxonomy.json`; **no accuracy measured — none claimed** |
| `fieldnet-bajra-v0` | planned-ml | PLANNED — EVALUATION REQUIRED | Blocked until dataset licensing, provenance review and an offline evaluation harness exist (Task 002) |

The registry is deliberately unglamorous: it exists so that *anyone* can answer "what produced this number?" in one click.

## Deterministic provider contract

- **Inputs:** crop, symptom category, capture checklist, (seeded) cluster signals.
- **Outputs:** ranked candidates with `simConfidence`, reasons, missing evidence, margin, routing decision, thresholds used, and a fixed note: *"Simulated scores from deterministic demo rules — not measured model accuracy."*
- **Provenance:** every inference carries `provenance: "SIMULATED"` and `modelVersion`; both render on screen.

## Decision policy (`data/demo/policy.json`)

| Policy | Value | Rationale |
|---|---|---|
| Autonomous close requires score ≥ 0.85 **and** margin ≥ 0.40 | never met by the golden case (0.62 / 0.35) | consequential decisions default to humans |
| High-spread candidates never auto-close | `highSpreadRiskMinScore` 0.5 + escalation flag | downy mildew-class diseases always see an expert |
| Abstain when lead is `unknown` ≥ 0.50 | out-of-distribution honesty | better to say "we don't know" than to be confidently wrong |
| Missing secondary views penalise lead score by 0.08 | evidence quality shapes confidence | weak evidence → weaker claim → expert |

## Abstention & correction as first-class behaviours

- **Abstain** routes to expert with recommended next evidence; the case can close as `CLOSED_UNKNOWN` — a respected outcome, not a failure.
- **Correction** records previous → corrected condition, writes an `expert_corrected` audit event, and re-scores affected clusters. Corrections are the labelled-data flywheel for the future model: every correction is training signal with provenance.

## Path to a real model (activation gates for Task 002)

1. Licensed dataset with provenance review (no scraped imagery).
2. Offline evaluation harness: per-crop accuracy, calibration, abstention quality, and **expert-agreement rate** against KVK reviewers.
3. Shadow mode: real model scores alongside demo provider; no user-facing change until gates pass.
4. Rollback: provider is a config switch; the deterministic provider remains the fallback forever.
