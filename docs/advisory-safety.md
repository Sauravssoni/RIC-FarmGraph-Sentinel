# Advisory Safety

## The rule

> **No chemical recommendation reaches a farmer until an approved, versioned expert advisory exists — and even then, the chemical section renders locked against CIB&RC-aligned content.**

This is enforced by data, not by promises: every advisory record carries `chemical: { locked: true, note }`, the UI renders a dashed red **LOCKED** box, and unit tests assert the lock on every seeded advisory.

## Lifecycle (governed content)

`DRAFT → EXPERT_REVIEWED → APPROVED → (EXPIRED | WITHDRAWN)`, with supersession (`ADV-2601-v0.1 → v0.2 → v0.3`).

- Only `APPROVED` advisories can be **issued** to a case (the case-detail action lists nothing else).
- Every version is retained — governance history is visible on `/governance`, including the empty draft that started the chain.
- Issuing writes `advisory_issued` to the case timeline and the global audit stream.

## Content structure (safe by construction)

| Section | Content rule |
|---|---|
| **Do now** | Non-chemical, immediately actionable: roguing, irrigation timing, drainage, isolation |
| **Monitor** | What to watch and how often; photograph the same marked plants |
| **Escalate when** | Explicit triggers that send the case back to expert attention |
| **Chemical** | Locked. Note explains the unlock condition (approved advisory + CIB&RC-aligned content) |

## Why this matters to the challenge

Smallholders act on advice. A prototype that casually shows pesticide names is manufacturing risk at scale. FarmGraph Rakshak demonstrates the **machinery of safe advice** — lifecycle, versioning, locking, escalation triggers — which is what a government deployment actually needs, and what most demos skip.

## Task 002 (not built yet)

- CIB&RC adapter (contract defined): dose, PHI, registered-product matching by crop/condition.
- Unlock workflow: chemical section drafts visible **only to experts**, published only through the same approval lifecycle.
- Advisory effectiveness measurement: follow-up outcome rates per advisory version (the seed already versions advisories so this is measurable).
