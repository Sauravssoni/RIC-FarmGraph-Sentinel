# FarmGraph Rakshak — Two-Minute Evaluator Demo Script

## Presenter objective

Demonstrate the outcome and operational system first. Government-integration readiness and technical honesty support the story; they do not dominate it.

## 0:00–0:12 — Rajasthan Command Centre

**On screen:** `/command-centre/`

**Say:**

“FarmGraph Rakshak is Rajasthan’s offline crop-health and outbreak-response grid. Instead of stopping at an image label, it connects field evidence, expert and KVK verification, Farm Digital Twins, outbreak intelligence, safe advisories and measurable follow-up.”

Show:

- active cases;
- suspected/verified clusters;
- expert queue;
- mission and sync status;
- Rajasthan pilot map.

## 0:12–0:30 — Offline field evidence

**On screen:** `/field/scan/` or Judge Mode golden path.

**Say:**

“A field worker can report from a low-connectivity village. The application stores the draft, photographs and voice note on the device. It checks the actual pixels for blur, exposure, contrast and vegetation coverage before any screening.”

Demonstrate:

- simulated offline mode;
- one poor image rejected;
- clear recapture instruction;
- a usable image accepted.

## 0:30–0:43 — Honest edge intelligence

**Say:**

“The prototype runs real browser image processing and a replaceable edge provider. Every provider, version, uncertainty and abstention is visible. The current crop-pattern scorer is a research heuristic—not a claimed field-accuracy model—and consequential cases always route to an expert.”

Show:

- provider badge;
- candidate pattern;
- uncertainty;
- expert-verification-required message.

## 0:43–0:56 — Voice and connected evidence proof

**On screen:** `/release-proof/`

**Say:**

“Hindi voice evidence can be recorded offline. When Bhashini credentials are available, the backend can request Hindi transcription; otherwise the recording remains safe and a human confirms the transcript. This connected proof preserves the exact image hash, pixel-quality result, edge provider, voice hash and transcript confirmation through FastAPI.”

Show:

- real voice note;
- consent;
- connected handoff result.

## 0:56–1:12 — KVK referral

**Say:**

“The case is matched to the nearest sourced KVK, with crop speciality, call, email and directions. The referral has a guarded lifecycle, a 48-hour SLA and a privacy-masked evidence pack. We do not falsely claim automated delivery.”

Show:

- nearest KVK;
- referral ID/SLA;
- downloadable `kvk-referral-pack/v2`.

## 1:12–1:28 — Farm Digital Twin and outbreak intelligence

**On screen:** `/digital-twins/RJ-DEMO-PLOT-118/`

**Say:**

“Every plot becomes a Farm Digital Twin carrying crop stage, evidence, expert decisions, KVK support, weather/market context, advisories and outcomes. When compatible verified cases appear nearby, the explainable cluster score changes and officers can generate a representative field mission.”

Show:

- Twin timeline;
- government-data rail;
- cluster relationship;
- before/after score;
- mission action.

## 1:28–1:42 — Safety and learning

**Say:**

“Only approved, valid, crop- and condition-matched advisories can be issued. Chemical content is locked. Every expert confirmation or correction becomes a governed learning record, but no model retrains or promotes itself automatically.”

Show:

- approved advisory;
- chemical lock;
- learning record/model lifecycle.

## 1:42–1:54 — Government interoperability

**On screen:** `/integrations/`

**Say:**

“FarmGraph complements Raj Kisan, AgriStack, NPSS, IMD, Bhashini and Soil Health Card. Every connector is labelled live, cached, public-directory, credentials-required or awaiting authority. No integration is fabricated.”

Show only:

- Bhashini state;
- IMD state;
- AGMARKNET state;
- KVK public directory;
- Raj Kisan/AgriStack awaiting-authority contracts.

## 1:54–2:00 — Close

**Return to Command Centre.**

**Say:**

“The edge model detects the first signal. FarmGraph Rakshak is the operating system that helps Rajasthan verify it, contain the outbreak and learn safely from every field.”

## Backup path

When the API or external services are unavailable:

- use the standalone deterministic Judge Mode;
- show exact degraded state labels;
- use bundled government evidence/sample contracts;
- do not pause the story to troubleshoot credentials;
- finish with the KVK, Twin, outbreak and safety flow.

## Claims to avoid

Never say:

- “100% accurate”;
- “production deployed across Rajasthan”;
- “live Raj Kisan/AgriStack integration”;
- “Marwari/Mewari ASR”;
- “IMD live” when the state is whitelist-required;
- “KVK received the referral” unless actual delivery is verified;
- “trained Rajasthan disease model” for the current heuristic.
