# Problem Research — Crop Disease & Pest Detection for Rajasthan Smallholders

## Context

- **Crops in scope (pilot):** bajra (pearl millet), guar (cluster bean), mustard, cumin — chosen because they dominate the arid western districts and have distinct, photographable symptom signatures (e.g. bajra downy mildew: pale streaking → white downy growth on lower leaf surfaces).
- **Districts in scope (pilot):** Jodhpur (Balesar, Luni, Osian), Nagaur (Nagaur, Merta), Jalore (Jalore, Bhinmal) — rainfed, smallholdings, patchy 4G.
- **Seasonal rhythm:** kharif (bajra, guar; sown ~late June) and rabi (mustard, cumin; sown ~November). The golden demo is kharif-2026 bajra at vegetative stage — the highest-leverage detection window for downy mildew.

## What field reality demands

1. **Offline is the default, not the exception.** Field capture must complete with zero connectivity: draft on device, outbox queue, explicit sync state, and a pending-sync count the worker can trust.
2. **Evidence quality is the bottleneck, not model quality.** A blurry single photo defeats any model. The capture **quality gate** (close-up of affected leaf + at least one secondary view — lower leaf surface or whole plant — plus acceptable lighting, coverage ≥ 0.6) is the single highest-value "AI-adjacent" feature in the system.
3. **Experts are scarce; attention must be rationed.** The review queue is priority-ranked (high-spread-risk candidates, escalations, abstentions, very low lead scores) so a KVK expert's hour goes to the cases that matter.
4. **Advice can harm.** A wrong chemical recommendation is worse than none. Hence the chemical lock and the rule that only approved, versioned advisories issue.
5. **Duplicate and junk reports will happen.** Outbreak scoring includes an explicit duplicate penalty; dismissed clusters stay visible with their reason (cluster CL-2602 demonstrates this).

## Design implications (how research became features)

| Finding | Feature |
|---|---|
| Connectivity is intermittent | Dexie drafts + outbox, pending-sync chip, low-bandwidth mode, SW-cached shell |
| First attempts are often unusable | Quality gate with recapture requests; golden demo's first capture *fails* on purpose |
| Workers speak Hindi/Marwari | Full Hindi/English UI toggle; voice *affordance* with typed fallback (no fake ASR claims) |
| Experts distrust black boxes | Every score shows candidates, margin, reasons, missing evidence, thresholds used |
| District needs defensible signal | Explainable outbreak score with visible component weights and duplicate penalty |
| Scheme-fatigue / duplication risk | Integrations positioned as *feeding* NPSS/AgriStack/Raj Kisan, never replacing |

## Honest uncertainty

- No accuracy claims exist in this prototype because no model exists yet. The deterministic provider's scores are **policy-shaped placeholders** that keep the loop testable; Task 002 defines the evaluation harness a real model must pass before activation.
- Weather suitability is a documented placeholder (IMD adapter `PUBLIC_DATA_ONLY` / not wired into scoring beyond a seeded component).
