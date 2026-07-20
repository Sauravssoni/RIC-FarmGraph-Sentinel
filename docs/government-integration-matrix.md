# Government Integration Matrix

**Truth rule:** no adapter is live in Task 001. Every row is one of `SIMULATED` (demo behaviour standing in), `CONTRACT_DEFINED` (fields/direction agreed on paper), `PUBLIC_DATA_ONLY` (public datasets usable without MoU), `AWAITING_AUTHORITY` (needs a government decision), `NOT_STARTED`. The `/integrations` route renders this exact matrix from `data/demo/integrations.json`, each with purpose, direction, minimum fields, consent basis, production dependency, fallback and owner.

| Adapter | Status (Task 001) | Role in the grid | Honest note |
|---|---|---|---|
| RajSSO | AWAITING_AUTHORITY | Officer/expert SSO | Persona switcher is a demo stand-in, explicitly labelled "not production authentication" |
| Jan Aadhaar | AWAITING_AUTHORITY | Farmer identity verification | Farmers are pseudonymous references until authority grants verification |
| e-Dharti | CONTRACT_DEFINED | Plot/land-record linkage | Plot IDs are demo strings; field list drafted |
| Girdawari | CONTRACT_DEFINED | Crop-inspection (girdawari) cross-check | Would corroborate outbreak clusters |
| Raj Kisan Saathi | CONTRACT_DEFINED | Scheme advisories channel | Complement, not duplicate |
| Rajdhara | AWAITING_AUTHORITY | State GIS layers | Pilot map uses Natural Earth instead (licence-clean) |
| NPSS | CONTRACT_DEFINED | National pest surveillance feed | FarmGraph would *contribute* verified incidents to NPSS |
| Kisan e-Mitra | CONTRACT_DEFINED | Farmer grievance/Q&A escalation | Fallback: advisory card phone guidance |
| Bhashini | CONTRACT_DEFINED | Translation/voice for Marwari/Mewari | No fake ASR: typed fallback always present |
| KVK | SIMULATED | Expert roster & review workflow | Expert persona is a demo KVK expert |
| IMD | PUBLIC_DATA_ONLY | Weather suitability component | Currently a seeded placeholder; district-level API wiring is Task 002 |
| SHC (Soil Health Card) | CONTRACT_DEFINED | Soil context for nutrient-stress differentiation | Would sharpen downy-mildew vs N-stress separation |
| SATHI | NOT_STARTED | Seed-traceability context | Listed for completeness |
| CIB&RC | CONTRACT_DEFINED | Registered-chemical reference for advisory unlock | The chemical lock opens only against approved, CIB&RC-aligned content |
| RajSampark | CONTRACT_DEFINED | Grievance escalation path | Fallback: in-app escalation note |
| e-Mitra | CONTRACT_DEFINED | Assisted-service delivery for farmers without phones | Field worker acts as the assisted channel in pilot |
| AGMARKNET | PUBLIC_DATA_ONLY | Market context (outbreak → price signals) | Read-only context, no workflow dependency |

## Integration principles

1. **Feed, don't fork.** Where a state/national system exists (NPSS, AgriStack, Raj Kisan), FarmGraph Rakshak produces structured, expert-verified evidence *for* it.
2. **Degrade gracefully.** Every adapter names a fallback that works with zero integration — the pilot is useful on day one without a single MoU.
3. **Consent travels with data.** Each adapter records its consent basis; nothing leaves the device/store without a recorded basis.
4. **Status honesty is a feature.** Judges should be able to ask "is any of this live?" and get a one-word truthful answer: *no* — plus exactly what each connection needs to become live.
