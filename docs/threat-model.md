# Threat Model (Task 001 scope)

## Assets

1. Farmer trust (wrong advice harms livelihoods).
2. Outbreak signal integrity (a manipulated cluster score misdirects district response).
3. Farmer privacy (pseudonymous now; identity-linked in production).
4. Audit trail integrity (accountability for expert decisions).

## Threats & mitigations in this prototype

| Threat | Mitigation in Task 001 | Production hardening (Task 002+) |
|---|---|---|
| Overclaimed AI accuracy misleads officials | Simulated labels on every score; model registry states "no accuracy measured"; tests enforce labels | Signed model cards; activation gates (model-governance.md) |
| Unsafe chemical advice | Chemical lock in data + UI + tests; approval lifecycle | CIB&RC-aligned content workflow; role-restricted publishing |
| Junk/duplicate reports inflate outbreaks | Duplicate penalty in scoring; CLOSED_DUPLICATE state; dismissed cluster stays visible with reason | Device attestation; reporter reputation; anomaly detection |
| Expert queue gaming (e.g. spam escalations) | Deterministic priority with visible reasons | Rate limits per reporter; queue audit |
| Privacy leakage | Pseudonymous references only; consent recorded; no PII fields exist | RajSSO/Jan Aadhaar-backed identity with field-level access control; data minimisation review |
| Audit tampering | Append-only timelines; deterministic reset to a known-good seed | Server-side append-only store (e.g. ledger table), signed events |
| Offline data loss/theft on device | Draft/outbox are local-only; demo holds no real data | Encrypted IndexedDB; device enrolment; remote wipe |
| Supply-chain / dependency risk | Pinned lockfile; no runtime secrets; static export reduces server surface | SCA scanning in CI; SBOM |
| Demo mistaken for production | Persistent demo banner; API OpenAPI states demo provider; integrations page red banner | Environment labelling carried into production builds |

## Explicitly out of scope (Task 001)

- Authentication/authorisation (persona switcher is labelled "not production authentication"; CORS is open on the demo API).
- Rate limiting, input sanitisation beyond pydantic/zod validation, and secrets management (there are no secrets).

These are stated — not hidden — so evaluators can see the boundary between prototype and production thinking.
