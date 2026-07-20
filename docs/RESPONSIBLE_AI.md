# Responsible AI Statement — FarmGraph Rakshak

## 1. Truth rules (enforced in code and review)

1. **No fabricated capability.** Every record carries a provenance label
   (`SIMULATED`, `EXPERT_VERIFIED_REVIEW`, `REFERENCE_DATA`, `RESEARCH_PREVIEW`,
   `CACHED`). Anything not live says so at the point of display.
2. **No score is called accuracy.** The pixel scorer's note states *"no
   accuracy has been measured"* — asserted by unit test. Raw scores are
   labelled raw; uncertainty (1 − margin) is always shown beside them.
3. **No fabricated government access.** The integrations matrix shows
   readiness statuses only; data.gov.in is `KEY_REQUIRED`; Bhashini dialect
   ASR (Marwari/Mewari) is explicitly **not** claimed.

## 2. Human-in-the-loop by design

- Abstention is a first-class outcome: low confidence, low vegetation
  coverage, blur, or an unsupported crop pattern all route to an expert with
  reasons and a recommended next step — never a forced label.
- Expert review supports confirm / correct / **mark-unknown**; unknown closes
  the case as CLOSED_UNKNOWN instead of forcing a class.
- Advisory issuance is gated server-side by seven invariants (approved,
  current, not superseded, crop-matched, condition-matched, expert-reviewed)
  with machine-readable rejection codes.
- The learning flywheel records expert decisions for a **governed** future
  model update; no automatic training exists anywhere in the system.

## 3. Safety boundaries

- Chemical advisory content is LOCKED until approved, versioned expert
  content exists (CIB&RC-aligned adapter is contract-defined, not connected).
- The deterministic rules engine — not the research-preview pixel scorer — is
  the provider of record for anything that advances a case.
- Outbreak scores are explainable sums of published components; the twin
  simulator is compute-only and labelled "not a biological prediction".

## 4. Privacy & data dignity

- Explicit consent before any report; the API rejects consentless cases (422).
- Images are re-encoded on-device, stripping EXIF/GPS by construction; voice
  notes require consent and are deletable; farmers are pseudonyms.
- Evidence lives on the device (IndexedDB) until the user syncs; sync is
  idempotent so retries never duplicate a farmer's report.

## 5. Security posture (demo, clearly labelled)

Demo RBAC via `X-Demo-Role` (no credentials exist — labelled in `/health` and
the OpenAPI description), restricted CORS origins, security headers
(nosniff/DENY/no-referrer/no-store), per-IP write rate limiting, upload
type/size validation, advisory scans in CI. Threat model: `docs/threat-model.md`.

## 6. Fairness & inclusion

- Hindi UI with large touch targets, low-bandwidth mode, and offline-first
  flows for low-connectivity districts.
- Voice notes and TTS recapture guidance for low-literacy users; Hindi
  dictation is labelled unreviewed machine transcription.
- Learning-balance dashboard (class/crop/district) exists precisely so a
  future training cycle can see representation gaps before they become bias.

## 7. Accountability

Every mutation writes an append-only audit event (actor, type, summary)
reconstructable on `/governance`; the demo reset restores a deterministic,
inspectable state. Model lifecycle states are public in the UI. Known
limitations are documented in `docs/known-limitations.md` and linked from the
evaluator guide.
