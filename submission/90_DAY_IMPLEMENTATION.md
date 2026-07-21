# FarmGraph Rakshak — 90-Day Government Pilot Implementation Plan

## Pilot objective

Demonstrate that Rajasthan can move from a low-connectivity field crop-health report to structured expert verification, KVK support, outbreak intelligence, safe advisory action and measurable follow-up through one auditable system.

## Proposed geography and coverage

- **Districts:** Jodhpur, Nagaur and Jalore.
- **Blocks:** six, selected with the Department/KVKs.
- **Villages:** approximately 30.
- **Farms/plots:** up to 1,500.
- **Priority crops:** bajra, mustard, guar and cumin.
- **Users:** 12 field facilitators, six expert reviewers, three district coordinators and one state programme cell.

All quantities are proposed planning targets and will be finalised with the implementing authority.

## Governance structure

### State steering group

- Department programme owner.
- State nodal agriculture officer.
- Government IT/integration representative.
- KVK/ICAR nominee.
- Responsible-AI/privacy nominee.
- Syntheon programme lead.

Responsibilities:

- approve scope and data policy;
- approve advisory and escalation policy;
- resolve institutional blockers;
- accept milestones;
- decide expansion.

### District operations group

- district agriculture representative;
- district coordinator;
- KVK/agronomy reviewer;
- field facilitator lead;
- technical support representative.

Responsibilities:

- monitor queues and SLAs;
- validate village coverage;
- coordinate field missions;
- review data quality and escalations;
- verify outcomes.

## Workstreams

1. Field evidence and offline operation.
2. Expert/KVK workflow.
3. Rajasthan dataset and model evaluation.
4. Farm Digital Twin and outbreak operations.
5. Government interoperability.
6. Safety, privacy and security.
7. Monitoring and evaluation.
8. Training and change management.

## Phase 0 — Pre-start readiness

Before Day 1:

- named government programme owner;
- KVK and district participation confirmed;
- pilot blocks/villages agreed;
- consent and data-retention text approved;
- advisory approval authority identified;
- no prohibited chemical content in the demo;
- hosting and security mode accepted;
- baseline data collection plan approved.

## Days 1–15 — Mobilisation and controlled launch

### Activities

- Kick-off and challenge-outcome workshop.
- Validate crop, symptom and evidence protocol.
- Verify KVK directory and escalation contacts.
- Configure districts, blocks, roles and SLAs.
- Establish helpdesk and incident process.
- Train trainers, coordinators and reviewers.
- Baseline farmer/field-worker usability assessment.
- Validate Hindi and regional voice-note workflows.
- Finalise Rajasthan evidence annotation guide.
- Security, privacy and responsible-AI review.

### Deliverables

- approved pilot charter;
- role and responsibility matrix;
- consent and retention protocol;
- advisory safety policy;
- training materials;
- baseline report;
- deployed pilot environment;
- district/KVK referral map;
- initial model/data evaluation protocol.

### Acceptance gate

- users can complete offline report, sync, expert review and KVK pack;
- no critical security or consent defect;
- all demo and sample data visibly labelled;
- owner accepts the golden and negative demo paths.

## Days 16–30 — Field operation and quality stabilisation

### Activities

- Enrol first villages and plots.
- Run assisted field capture.
- Monitor image-quality failure reasons.
- Tune user guidance, not hidden model thresholds.
- Review Hindi transcripts and regional voice-note routing.
- Operate expert queue and KVK referrals.
- Test offline sync and duplicate handling.
- Record follow-up completeness.
- Begin consent-aware dataset review.

### Deliverables

- first operational evidence report;
- image-quality and recapture dashboard;
- expert response and referral SLA report;
- synchronisation reliability report;
- first reviewed dataset manifest;
- usability issue register and fixes.

### Acceptance gate

- at least 65% first-pass usable images during early operation;
- no evidence loss through connected handoff;
- at least 90% sync success after retry;
- all high-risk/uncertain cases route to expert review.

## Days 31–45 — Outbreak and mission validation

### Activities

- Review cluster membership and score explanations.
- Conduct representative field missions.
- Compare suspected clusters with expert findings.
- Test duplicate penalties and dismissal workflow.
- Validate district dashboard action queues.
- Audit advisory issuance and chemical locks.
- Run KVK referral-pack exercises.

### Deliverables

- cluster validation report;
- field mission completion report;
- false-signal and missed-signal review;
- advisory safety audit;
- district command-centre acceptance notes.

### Acceptance gate

- every outbreak score has traceable member cases and components;
- mission generation avoids duplicate open missions;
- unsafe advisory attempts are rejected;
- dismissed clusters retain reasons and audit history.

## Days 46–60 — Candidate model and integration evaluation

### Activities

- Freeze reviewed dataset version 1.
- Separate train/validation/test by source, location and farmer/plot where possible.
- Train/evaluate a compact bajra/mustard candidate model.
- Measure macro-F1, per-class recall, calibration, abstention, size and device latency.
- Compare candidate with current research heuristic.
- Keep candidate in shadow mode.
- Conduct Raj Kisan/AgriStack/UFSI/NPSS integration workshop.
- Activate Bhashini/IMD/data.gov.in only where credentials/authority permit.

### Deliverables

- dataset card v1;
- model card v1;
- failure-case gallery;
- shadow comparison report;
- integration decision log;
- approved interface changes.

### Acceptance gate

- no model promoted solely on overall accuracy;
- target-condition recall and abstention reviewed by agronomy authority;
- privacy and consent eligibility verified;
- integration status remains truthful.

## Days 61–75 — Expansion rehearsal and mid-pilot review

### Activities

- Expand to remaining planned villages.
- Exercise higher queue and sync load.
- Test district-to-state escalation.
- Evaluate KVK acknowledgement and response patterns.
- Conduct farmer comprehension checks.
- Review non-improving cases and re-escalation.
- Run recovery and backup exercise.
- Review cost per plot/case.

### Deliverables

- mid-pilot performance report;
- adoption and comprehension findings;
- load/reliability report;
- KVK workflow review;
- unit-economics update;
- corrective-action plan.

### Acceptance gate

- no unresolved critical safety issue;
- priority-case median review time trending below four working hours;
- clear ownership for unresolved operational queues;
- recurrent cost trajectory supports expansion.

## Days 76–90 — Independent evaluation and handoff

### Activities

- Complete follow-up and outcome collection.
- Conduct independent data-quality and safety review.
- Evaluate pilot metrics against baseline.
- Produce district and state outbreak briefs.
- Complete security/privacy closure review.
- Finalise operating SOPs and support model.
- Present expansion scenarios and costs.
- Conduct government acceptance demonstration.

### Deliverables

- final impact and operations report;
- model/data evidence package;
- privacy and safety report;
- audited referral/advisory sample;
- government integration roadmap;
- district operating toolkit;
- state-scale architecture and budget;
- go/no-go recommendation.

## Proposed key performance indicators

| KPI | Proposed 90-day target |
|---|---:|
| First-pass usable image evidence | ≥75% after training stabilises |
| Offline reports recovered without loss | 100% of test cases |
| Successful sync after retry | ≥90% |
| Priority report to expert review | Median <4 working hours |
| KVK referral acknowledgement | ≥80% within agreed SLA where participation is active |
| Advisory follow-up completion | ≥85% |
| Consequential cases with complete provenance | 100% |
| Chemical advice issued outside approved gate | 0 |
| Critical privacy/security incidents | 0 |
| Farmer/field-worker task completion | ≥85% in assisted usability test |

## Data and model gates

A candidate model remains in shadow mode unless:

- dataset provenance and consent are complete;
- test data is separated from training sources;
- macro-F1 and class-wise recall are reported;
- high-spread-risk recall is acceptable to the expert authority;
- calibration and abstention are reviewed;
- unknown/OOD performance is tested;
- device latency and memory are practical;
- bias/failure analysis is documented;
- rollback is available;
- steering group approves promotion.

## Safety gates

- No automatic chemical recommendation.
- No advisory without approved status, crop/condition match and validity.
- Unknown and unsupported cases route to humans.
- Regional speech remains human-reviewed until benchmarked.
- Exact farmer identity is not exposed in general dashboards.
- Referral packs use pseudonymous IDs and privacy-rounded coordinates.
- Evidence upload requires consent.
- Government integrations activate only under applicable authority.

## Exit decisions

### Proceed to Stage 2

Proceed when operational, safety, evidence and cost gates are met and the government/KVK operating model is accepted.

### Extend pilot

Extend selectively when the workflow is useful but a specific crop, integration, language or district operating issue requires more evidence.

### Stop or redesign

Stop or redesign when safety cannot be governed, field evidence remains unusable, institutional ownership is absent, or recurrent costs do not support public value.
