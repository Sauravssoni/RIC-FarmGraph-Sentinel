# Bhashini (ULCA) Hindi PoC — setup guide

FarmGraph Rakshak integrates Bhashini for **Hindi ASR** (voice-note
transcription) and **Hindi TTS** (allowlisted non-chemical spoken messages).
The adapter is backend-only: no credentials, keys or inference headers ever
reach the frontend, the static build, logs or repository history.

## Current state

Without credentials the API reports exactly:

```
BHASHINI_CREDENTIALS_REQUIRED
```

and every compute endpoint returns `409 {"code": "BHASHINI_CREDENTIALS_REQUIRED"}`.
The web UI shows `BHASHINI — CREDENTIALS REQUIRED`, keeps the recorded voice
note safely on-device (IndexedDB, consent attached), and continues to offer
typed Hindi input and the explicitly-labelled browser dictation fallback
(`BROWSER_DICTATION_FALLBACK` — never presented as Bhashini).

## Obtaining access (official route)

1. Register on the Bhashini/ULCA platform (MeitY): https://bhashini.gov.in
   (ULCA onboarding issues a `userID` and `ulcaApiKey`).
2. Use the MeitY consolidated pipeline id for inference, or request pipeline
   access for ASR/TTS in Hindi.
3. Configure the environment variables below on the **API host only**
   (Render service env, or `infra/.env` for docker-compose — never commit
   real values; `infra/.env.example` documents names only).

## Environment variables

| Variable | Purpose | Default |
|---|---|---|
| `BHASHINI_ENABLED` | `1`/`true` to attempt live calls | unset (off) |
| `BHASHINI_USER_ID` | ULCA user id (`userID` header) | — |
| `BHASHINI_API_KEY` | ULCA api key (`ulcaApiKey` header) | — |
| `BHASHINI_PIPELINE_ID` | pipeline id for config requests | — |
| `BHASHINI_CONFIG_URL` | pipeline config endpoint | `https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline` |
| `BHASHINI_TIMEOUT_SEC` | per-request timeout | `12` |
| `BHASHINI_CONFIG_CACHE_SEC` | pipeline-config cache TTL | `300` |

## Call sequence implemented (documented ULCA flow)

1. **Pipeline configuration** — `POST $BHASHINI_CONFIG_URL` with the pipeline
   id; response carries `pipelineInferenceAPIEndPoint.callbackUrl` and a
   runtime `inferenceApiKey`. Cached for `BHASHINI_CONFIG_CACHE_SEC` so every
   request does not repeat configuration.
2. **Pipeline compute** — `POST callbackUrl` with the issued auth header:
   - ASR: `inputData.audio[0].audioContent` (base64) → `pipelineResponse[0].output[0].source`
   - TTS: `inputData.input[0].source` → `pipelineResponse[0].audio[0].audioContent`

A labelled official-shape sample of the full sequence lives at
`data/reference/bhashini-sample-request.json`.

## Honesty contract

- ASR transcripts return `confirmationStatus: UNREVIEWED`, `verified: false`.
  The transcript enters a case only after the field worker confirms or edits
  it (`POST /api/v1/cases/{id}/voice-transcript`, audited).
- TTS accepts only allowlisted message kinds rendered from fixed Hindi
  templates (`recapture_guidance`, `case_received`, `expert_review_needed`,
  `safe_non_chemical_instruction`, `follow_up_reminder`). **There is no
  free-text TTS endpoint**, so unlocked chemical advisories can never be
  spoken.
- No Marwari/Mewari ASR is claimed. Regional voice notes are preserved and
  routed: `REGIONAL SPEECH — HUMAN REVIEW REQUIRED`.
- Failure states are exact: `BHASHINI_CREDENTIALS_REQUIRED`,
  `BHASHINI_CONFIGURATION_ERROR`, `BHASHINI_TIMEOUT`, `BHASHINI_UNAVAILABLE`.
