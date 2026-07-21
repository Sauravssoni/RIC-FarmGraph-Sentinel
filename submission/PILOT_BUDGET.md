# FarmGraph Rakshak — Indicative 90-Day Pilot Budget

**Scope:** Jodhpur, Nagaur and Jalore · 6 blocks · 30 villages · up to 1,500 farms/plots  
**Period:** 90 days  
**Total indicative budget:** **₹48.60 lakh**  
**Status:** Planning estimate for government review; not an incurred-cost statement.

## Budget summary

| Workstream | Amount (₹ lakh) | Share | Deliverable |
|---|---:|---:|---|
| Product hardening, hosting and observability | 5.80 | 11.9% | Stable field PWA, connected API, uptime/error monitoring, backups and release support |
| Rajasthan evidence dataset and model evaluation | 8.50 | 17.5% | Governed labelled dataset, source-separated test set, candidate edge model and model card |
| Field operations personnel | 10.80 | 22.2% | 12 facilitators across 3 districts for capture, follow-up and farmer support |
| Agronomy/KVK review and advisory validation | 4.50 | 9.3% | Six reviewers, validation sessions, escalation coverage and safe advisory review |
| District coordination and programme management | 3.90 | 8.0% | Three district coordinators and state programme-cell support |
| Devices, accessories and connectivity | 4.20 | 8.6% | Shared Android devices, power banks, protective kits and data connectivity |
| Training, language and field materials | 2.40 | 4.9% | Hindi/regional materials, evidence-capture training and refresher sessions |
| Travel and field logistics | 3.60 | 7.4% | Village visits, KVK coordination, verification missions and logistics |
| Monitoring, evaluation and independent review | 2.50 | 5.1% | Baseline/endline, data-quality audit, usability study and impact assessment |
| Privacy, security and responsible-AI review | 1.80 | 3.7% | Threat review, consent audit, retention policy and release assurance |
| Contingency | 0.60 | 1.2% | Controlled reserve with written approval for use |
| **Total** | **48.60** | **100%** | |

## Cost assumptions

### Field operations

- 12 field facilitators for three months.
- Six blocks, typically two facilitators per block.
- Facilitators use shared devices and work with existing farmer networks, local institutions and government-approved field channels.
- Cost includes remuneration, statutory/administrative overhead and supervised reporting.

### Agronomy and KVK review

- Six part-time reviewers covering crop and district queues.
- Review capacity is allocated to high-risk, uncertain and non-improving cases rather than every routine report.
- Institutional terms, honoraria or service arrangements remain subject to government/KVK approval.

### Dataset and model work

The budget does not assume that the existing research heuristic is production-ready. It funds:

- consent and training-eligibility checks;
- image/evidence quality review;
- expert labels and adjudication;
- class and district balance analysis;
- train/validation/test separation by source and location;
- candidate model training;
- macro-F1 and per-class recall;
- calibration and abstention evaluation;
- low-end Android latency and memory testing;
- shadow-mode comparison;
- model-card and failure-case publication.

### Devices and connectivity

Indicative pool:

- 12 field Android devices or approved reuse of existing devices with allowance for replacement units;
- power banks and field-protection accessories;
- mobile data for synchronisation and support;
- no high-cost sensor procurement is assumed.

## Indicative unit economics

Based on the proposed maximum coverage:

| Metric | Indicative value |
|---|---:|
| Cost per farm/plot enrolled | ₹3,240 |
| Cost per district | ₹16.20 lakh |
| Cost per village | ₹1.62 lakh |
| Cost per block | ₹8.10 lakh |

These are pilot economics and include one-time product, model, training and evaluation work. Recurrent per-plot cost should fall materially during expansion because the core platform, evidence protocol and model-evaluation infrastructure are reused.

## Payment and milestone structure

| Milestone | Timing | Payment share | Acceptance evidence |
|---|---|---:|---|
| M1 — Pilot mobilisation | Day 0–15 | 20% | Approved protocol, districts/blocks, consent and advisory policy, trained cohort |
| M2 — Operational launch | Day 16–30 | 20% | Working deployed system, field capture, expert queue, KVK referral and dashboards |
| M3 — Mid-pilot evidence | Day 31–60 | 25% | Quality report, response SLAs, dataset manifest, candidate model baseline |
| M4 — Shadow evaluation | Day 61–75 | 20% | Model comparison, safety review, integration workshop and mid-course actions |
| M5 — Final acceptance | Day 76–90 | 15% | Independent evaluation, impact report, handoff package and scale recommendation |

## Financial controls

- Separate pilot cost centre.
- Monthly utilisation statement.
- Evidence-backed procurement and travel records.
- Written approval for contingency use.
- No farmer data monetisation.
- No commission-based input-dealer recommendation.
- No chemical product promotion within the pilot budget.
- Any material scope change requires government approval.

## Items excluded

- State-wide production hosting and 24×7 operations.
- RajSSO/Jan Aadhaar or other authority integration fees not yet specified.
- High-resolution commercial satellite imagery.
- Permanent government staffing.
- Farmer compensation except approved participation/travel arrangements.
- Full-scale procurement beyond the 90-day pilot.
