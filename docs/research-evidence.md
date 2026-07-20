# Research & Public-Data Evidence Register

Machine-readable form: [`data/reference/research-evidence.json`](../data/reference/research-evidence.json) · Accessed **2026-07-20**.

Every material design choice in FarmGraph Rakshak is anchored to **verifiable public government or institutional sources** — not vibes. Each entry below states the claim, the source, how the prototype uses it, and an honesty note about what is *not* claimed.

## Climate & pilot-district grounding

- **IMD station normals, Jodhpur 42339** — annual mean rainfall **370.2 mm**, July **119.7 mm** + August **113.5 mm** (≈63% of the year's rain in two months), ~20.9 rainy days/year ([IMD Jaipur station data](https://mausam.imd.gov.in/jaipur/mcdata/extreme_jodhpur.pdf)). *Used for:* the weather-suitability rationale in outbreak scoring — downy-mildew-class risk concentrates in the Jul–Aug humid window, which is exactly when the golden demo case is dated. *Not claimed:* a live IMD feed (adapter is `PUBLIC_DATA_ONLY`; the component is a seeded, labelled placeholder).
- **CGWB Jodhpur district report** — IMD normal **314 mm**, 44-year average **373.7 mm**, Jul–Aug ≈68% of rainfall, documented drought years ([CGWB publication](https://cgwb.gov.in/sites/default/files/2022-11/jodhpur.pdf)). *Used for:* problem research — surveillance here must assume drought-stressed crops and compressed scouting windows.

## Agronomic content lineage (why the safe advisory says what it says)

- **ICAR-AICPMIP pearl millet disease management** ([aicpmip.res.in](http://www.aicpmip.res.in/pathogolical.html)) recommends, among integrated measures: resistant cultivars, hybrid/variety rotation, and **roguing infected plants with burying/burning**. The golden advisory `ADV-2601` "Do now" steps mirror these published cultural controls. *Not claimed:* any chemical dose — the cited chemical treatments stay behind the lock.
- **ICRISAT downy mildew monograph** ([oar.icrisat.org](https://oar.icrisat.org/9411/1/Downy%20mildew%20of%20pearl%20millet%20and%20its%20management.pdf)) documents humidity-driven sporulation and IDM modules (host resistance + reduced-dose seed treatment + bioagents such as *Bacillus pumilus* INR 7, *Trichoderma harzianum*, chitosan) validated across AICPMIP locations. *Used for:* modelling downy mildew as a **high-spread-risk condition that always escalates**, and the 48-hour re-inspection monitoring cadence.
- **JAU Jamnagar three-year kharif trial (2021–23)** ([Chaudhari et al. 2024](https://www.researchtrend.net/bfij/pdf/Management-of-Pearl-Millet-Downy-Mildew-Disease-by-Organic-Practices-RJ-CHAUDHARI-11.pdf)) found *Trichoderma harzianum* seed treatment statistically at par with metalaxyl for DM incidence. *Used for:* confidence that non-chemical immediate steps are genuinely useful while chemical content remains locked.

## Existing government digital infrastructure we design against

- **data.gov.in (OGD Platform India, NIC)** — 100,000+ datasets as REST resources (`api.data.gov.in/resource/{index}`) behind a **free registered API key** ([data.gov.in](https://www.data.gov.in/)). This is the strongest *real* integration available at prototype stage: AGMARKNET market data is reachable today without any MoU. The adapter stays `PUBLIC_DATA_ONLY` (no key committed, no live calls), with the concrete path documented.
- **Bhashini / ULCA (MeitY)** — published pipeline API flow (search → config → compute; ASR/NMT/TTS task sequences) ([API docs](https://bhashini.gitbook.io/bhashini-apis), [bhashini.gov.in](https://bhashini.gov.in/)). *Used for:* the voice-adapter contract shape. *Not claimed:* Marwari/Mewari ASR — independent 2026 assessments place dialect voice at research stage; the prototype ships Hindi/English with typed regional vocabulary and says so.
- **Natural Earth** — public-domain 1:10m admin-1 boundaries ([naturalearthdata.com](https://www.naturalearthdata.com/)) used for the Rajasthan outline. District polygons deliberately omitted (no licence-clean, survey-quality source established).

## Rule

If a design element cannot be traced to this register, to the challenge brief, or to an explicit labelled assumption, it does not ship.
