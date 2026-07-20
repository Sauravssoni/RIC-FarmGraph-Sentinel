# Product Vision — FarmGraph Rakshak

**Offline Crop Health & Outbreak Intelligence Grid for Rajasthan.**
*Every field seen. Every outbreak contained.*

## The problem in one paragraph

Rajasthan's smallholders farm some of India's most climate-stressed land — bajra, guar, mustard and cumin across Jodhpur, Nagaur and Jalore — with the worst connectivity, the smallest holdings and the longest distance to expert advice. When downy mildew or a pest flush starts, the first days decide whether a village loses a crop or contains an outbreak. Today those first days are lost to travel, guesswork, and advice that arrives after the damage is done. The State does not lack schemes; it lacks **verified, geotagged, timely field evidence** and a disciplined loop from observation → expert → advisory → outcome.

## What FarmGraph Rakshak is

A field-to-command-centre grid with four convictions:

1. **The field comes first.** The capture experience is offline-first, voice-friendly, Hindi/English, usable on a ₹8,000 Android phone in bright sun with one thumb. If it doesn't work in Balesar with no signal, it doesn't exist.
2. **AI assists; experts decide.** Deterministic triage never closes a consequential case alone. Margins below policy thresholds route to experts; out-of-distribution cases **abstain** rather than guess. Every AI output is visibly labelled *simulated* in this prototype.
3. **Outbreaks are a district object, not a farmer object.** Individual cases roll up into explainable cluster scores (verified ratio, spatial density, temporal growth, crop/stage compatibility, weather suitability, severity, duplicate penalty) that a district officer can act on under an SLA.
4. **Advisories are governed content.** Nothing chemical reaches a farmer until an approved, versioned advisory exists. The lock is policy, not a UI nicety.

## Who it serves

| Persona | Need | What they get |
|---|---|---|
| Farmer (pseudonymous) | "What is wrong with my crop, what do I do today?" | A case, a safe advisory, a follow-up visit |
| Field worker | Structured capture that works offline | Quality-gated capture, drafts, outbox, missions |
| Expert (KVK) | High-signal review queue, not noise | Priority-ranked queue with evidence, scores and nearby cases |
| District officer | Early, trustworthy outbreak signal | Cluster scores with explanations, missions, SLA clock |
| State admin | Assurance the system is honest | Governance: model registry, advisory lifecycle, audit stream |

## Non-goals (Task 001)

- No trained ML model (Task 002, gated on dataset licensing + evaluation harness).
- No live government integration (all 17 adapters contract-defined or awaiting authority).
- No real farmer PII — pseudonymous demo data only.
- No duplication of NPSS / AgriStack / Raj Kisan: FarmGraph Rakshak is an evidence-and-response layer that would feed them.

## Why this wins

Most submissions will demo a model. FarmGraph Rakshak demos an **operating system for outbreak response**: quality-gated evidence, honest abstention, explainable outbreak math, mission logistics, governed advisories, and an audit trail a CAG could read — running fully offline, in two languages, on deterministic data a judge can reset and re-run. The model is a replaceable component; the grid is the product.
