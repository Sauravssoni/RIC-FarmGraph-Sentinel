# Pilot Measurement Plan

## North-star metric

**Median hours from field report → expert decision** (target ≤ 24 h in pilot; seed demo median is visible on the command centre KPI).

## Metric tree

### 1. Evidence quality
- Capture first-pass rate (target ≥ 85% by week 3 of each wave) — the recapture loop should *teach*.
- Views-per-observation distribution; recapture-request mix (which checklist items fail most).

### 2. Triage honesty (deterministic provider era)
- Routing mix: autonomous / expert / abstain (autonomous should be ~0% in pilot — thresholds are intentionally strict).
- Abstention rate and its outcomes (unknown closures vs later-identified).

### 3. Expert operations
- Queue depth and age (p95 wait); decisions per expert-day.
- **Expert-agreement rate**: % of triaged leads the expert confirms (baseline for the future model; corrections are the flywheel).
- Correction mix (previous → corrected condition) — becomes labelled training data with provenance.

### 4. Outbreak response
- Time from cluster SUSPECTED → mission created (target ≤ 48 h); mission completion inside SLA (5 d).
- Cluster precision: % of mission-verified clusters that were real (dismissed-cluster rate should stay low but non-zero — zero means the duplicate penalty is miscalibrated).

### 5. Advisory outcomes
- Follow-up completion % (KPI exists); improving/resolved share per advisory version.
- Not-improving escalation rate per crop/condition.

### 6. System integrity
- Sync failure rate (outbox attempts); offline-created share of cases.
- Audit completeness: 100% of state transitions carry timeline + audit events (enforced by construction; sampled in review).

## Instrumentation (already in the prototype)

The seed and store already record everything needed: timestamps on every event, review deltas, follow-up outcomes, sync flags. The command-centre KPIs are the pilot dashboard in miniature; `/governance` is the weekly review surface.

## Baselines & honesty

No baseline accuracy numbers exist (no model). The pilot's job is to produce **operational baselines** (speed, quality, agreement, response) that any future model must improve — and the labelled, provenance-complete dataset to evaluate it.
