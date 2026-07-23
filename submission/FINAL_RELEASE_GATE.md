# FarmGraph Rakshak — Final Submission Release Gate

**Applicant:** Syntheon Technology Private Limited  
**DPIIT:** DIPP213187  
**Competition:** Rajasthan Innovation Challenge  
**Challenge:** AI-Based Crop Disease & Pest Detection for Smallholder Farmers  
**Submission branch:** `main`  
**Portal status:** Submitted by the applicant on 23 July 2026  
**Production URL:** https://ric-farm-graph-sentinel-web.vercel.app/

This is the authoritative post-submission release record for the prototype and public demonstration. Product scope is frozen; subsequent changes are limited to deployment reliability, defect correction and evidence preservation.

## 1. Final source state

All thirteen FarmGraph pull requests are merged into `main`. The original `kimi/farmgraph-winning-release` branch contains no unmerged work and is behind `main`.

Implemented release scope:

- government command centre with explainable Decision Intelligence;
- five-act evaluator demonstration;
- offline image and voice evidence workflow;
- evidence-quality rejection and conservative screening with abstention;
- expert-controlled case review and governed learning records;
- Farm Digital Twins and outbreak-response workflow;
- nearest-KVK routing, privacy-masked referral packs and SLA states;
- field missions, safe advisories, outcomes and audit history;
- truthful government/public-data integration states;
- model-evaluation and model-promotion contracts;
- Pixel-class PWA and hard-offline automated proof.

## 2. Production routes to verify

- Command centre: https://ric-farm-graph-sentinel-web.vercel.app/command-centre/
- Evaluator demo: https://ric-farm-graph-sentinel-web.vercel.app/demo/
- Field capture: https://ric-farm-graph-sentinel-web.vercel.app/field/scan/
- Integrations: https://ric-farm-graph-sentinel-web.vercel.app/integrations/
- Support / KVK: https://ric-farm-graph-sentinel-web.vercel.app/support/
- Digital Twins: https://ric-farm-graph-sentinel-web.vercel.app/digital-twins/
- Release proof: https://ric-farm-graph-sentinel-web.vercel.app/release-proof/

The Vercel project must use `apps/web` as the Root Directory, Node.js 24.x, static/Other framework mode, `npm run build`, and `out` as the Output Directory.

## 3. Primary evaluator path

1. **Operational picture and forecast** — pilot-district map, four decision KPIs, priority rail, observed trend, 72-hour expert-load forecast, KVK SLA risk and ranked actions.
2. **Offline evidence before AI** — capture-quality rejection, guided recapture, sync and uncertainty-aware screening.
3. **Expert control and local learning** — expert confirmation creates a governed learning record.
4. **Mission, KVK and advisory** — representative mission, nearest sourced KVK referral in `READY_TO_SHARE`, approved non-chemical advisory.
5. **Measured outcome** — follow-up and retained audit chain.

Expected evaluator duration: approximately three minutes. Reset before every demonstration.

## 4. Challenge requirement matrix

| Challenge expectation | Implemented proof |
|---|---|
| Offline image recognition for Rajasthan crops | Offline evidence store, image processing, quality gate, conservative screening and optional ONNX OOD screen |
| Hindi and regional voice access | Recorder, local retention, Bhashini Hindi adapter path and human-review route for dialect recordings |
| Nearest KVK / support linkage | Sourced KVK records, distance matching, contact actions, SLA lifecycle and privacy-masked referral pack |
| Local feedback and improvement loop | Expert-labelled learning record, provenance, evaluation protocol and reviewed promotion gate |

## 5. Explainable Decision Intelligence

The command centre provides:

- seven observed daily signal counts and a transparent three-day forecast;
- forecast expert-decision load;
- rising-district detection only when the recent trend is genuinely positive;
- overdue and due-soon KVK referral separation;
- ranked next-best actions linked to actual workflows;
- estimated coordination time avoided with disclosed assumptions.

This layer supports operational coordination. It does not diagnose disease, issue chemical guidance, override experts or mark external delivery complete.

## 6. Safety and claim boundaries

Safe claims:

- working offline-first prototype;
- browser image processing, hashing and quality checks;
- voice-note recording and local retention;
- conservative research screening with abstention;
- expert-controlled decisions;
- explainable operational forecasting and ranked actions;
- deterministic outbreak-response workflow;
- sourced nearest-KVK routing and referral-pack preparation;
- governed expert-labelled learning records;
- versioned government integration contracts and truthful access states.

Not claimable without new evidence:

- measured field disease accuracy;
- Rajasthan-trained disease neural model;
- field-validated epidemiological forecast;
- measured officer-hours saved;
- completed physical Android field validation;
- live Raj Kisan, AgriStack or RajSSO integration;
- Marwari or Mewari automatic speech recognition;
- KVK receipt when only a pack was prepared;
- production deployment across Rajasthan;
- green CI without executed jobs and retained artifacts.

## 7. Post-submission production gate

The release is considered verified only when all of the following are observed on the production URL:

- root and nested routes return successfully;
- command centre displays **AI Decision Intelligence — Next 72 hours**;
- seven observed bars, three forecast bars and ranked actions render;
- demo resets and completes 0/5 to 5/5;
- field scan opens on mobile viewport;
- integration states remain truthfully labelled;
- manifest, service worker, icons, ONNX and WASM assets load;
- nested-route refresh works without a 404;
- no visible horizontal overflow or blocking console/runtime error.

## 8. Final evaluator framing

> An image model can flag a pattern. FarmGraph Rakshak is the operating system that helps Rajasthan forecast workload, capture trustworthy evidence offline, put experts in control, detect emerging clusters, coordinate field and KVK response, measure outcomes and safely convert every verified correction into future local intelligence.
