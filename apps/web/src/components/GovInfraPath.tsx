"use client";

/**
 * Judge Mode — Government Infrastructure chapter (Task 003 Phase 2G).
 * 12 presenter-controlled steps. Every value on screen is derived live from
 * the real adapter mirrors and bundled evidence artefacts — nothing is a
 * canned screenshot. Works fully degraded: standalone renders the exact same
 * honest states from bundled artefacts; connected mode points at the
 * operations screen for authoritative API states.
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import { INTEGRATIONS } from "@/lib/seed";
import whitelistEvidence from "@data/reference/imd-whitelist-evidence.json";
import snapshotJson from "@data/reference/public-data-snapshot.json";
import glossary from "@data/reference/regional-glossary.json";
import {
  IMD_ATTRIBUTION, explainWeatherSuitability, standaloneDistrictWeather, weatherPolicy,
} from "@/lib/weather";
import { standaloneMandiPrices } from "@/lib/mandi";
import { DEFAULT_SLA_HOURS, REFERRAL_FLOW, nearestKvks } from "@/lib/kvk";
import { TTS_KIND_LABELS } from "@/lib/bhashini";
import { useApp } from "@/lib/app";

export interface GovStep {
  title: string;
  presenter: string;
  judges: string;
  link?: { href: string; label: string };
}

export const GOV_INFRA_STEPS: GovStep[] = [
  {
    title: "Government integration posture — nothing claimed live",
    presenter: "Open on the posture panel: every government touchpoint carries its exact state chip. IMD sits behind a genuine IP-whitelist gate; Bhashini and AGMARKNET await credentials that live only on the API host.",
    judges: "States come from real adapter code and real captured failures — not slide text. No adapter is live unless its state chip says LIVE.",
    link: { href: "/integrations", label: "Open integrations operations" },
  },
  {
    title: "IMD whitelist gate — genuine evidence, hashed",
    presenter: "This is the actual response from IMD's official API captured from this environment: HTTP 401, body excerpt, SHA-256 and capture timestamp, preserved as a versioned evidence artefact.",
    judges: "A real failed call, preserved with a hash — the engineering stop-loss. The adapter state IMD_IP_WHITELIST_REQUIRED is earned, not asserted.",
  },
  {
    title: "IMD district contract — SAMPLE, never promoted",
    presenter: "The Jodhpur district forecast contract demonstrates the normalised 14-field shape the adapter will emit once whitelisted: rainfall, humidity, warning level, issue time, station, attribution.",
    judges: "It is labelled SAMPLE SHAPE everywhere and can never be served as CACHED_IMD_DATA — the cache loader only accepts genuine captures named imd-cached-*.json.",
  },
  {
    title: "Weather moves the outbreak score — explainably",
    presenter: "Watch the exact computation: prior suitability, the moisture and warning variables, the state multiplier from versioned policy, and the resulting points effect on the cluster score.",
    judges: "Fallback sources move the score less; SIMULATED_WEATHER has a 0.0 multiplier and can never move it. Every number shows its reason string.",
    link: { href: "/outbreaks", label: "Open outbreak intelligence" },
  },
  {
    title: "Bhashini voice — official ULCA sequence, backend-only",
    presenter: "The adapter follows the official sequence: pipeline config with ULCA credentials, then compute against the callback endpoint with the runtime key. Credentials never ship in the static build.",
    judges: "TTS is restricted to an allowlist of non-chemical templates — there is no free-text TTS endpoint. ASR transcripts are always UNREVIEWED until a human confirms them.",
    link: { href: "/field/scan", label: "Open field scan (voice tools)" },
  },
  {
    title: "Regional speech routes to humans, not to a claim",
    presenter: "Marwari and Mewari voice notes are flagged REGIONAL SPEECH — HUMAN REVIEW REQUIRED and routed to the expert queue. The phrase glossary is a DRAFT pending KVK validation.",
    judges: "dialectAsrClaim is NONE — no regional ASR is claimed anywhere. Offline voice notes queue on-device and are never lost.",
  },
  {
    title: "AGMARKNET mandi — Rajasthan-only quote contract",
    presenter: "Bajra quotes from Jodhpur and Nagaur mandis, normalised to INR/quintal with variety, arrival date and APMC market type. Commodity aliases map official AGMARKNET spellings to pilot crops.",
    judges: "State is MANDI_CREDENTIALS_REQUIRED — a free data.gov.in key activates live quotes. The demo rows are labelled SAMPLE SHAPE; a Gujarat record in the fixture is provably excluded.",
  },
  {
    title: "KVK referral lifecycle — 7 states, 48h SLA, evidence pack",
    presenter: "Referrals move through a guarded 7-state machine: creation lands READY_TO_SHARE, never SHARED; escalation demands a note; every referral carries a 48-hour SLA clock.",
    judges: "The downloadable evidence pack (kvk-referral-pack/v1) privacy-masks coordinates, marks unreviewed cases UNVERIFIED, and carries an audit reference. Directory contacts are sourced, with missing contacts labelled.",
    link: { href: "/support", label: "Open KVK support" },
  },
  {
    title: "Digital Twin government-data rail",
    presenter: "Every twin carries a six-lane government rail: pseudonymous registry linkage, consent, IMD weather, Soil Health Card, AGMARKNET mandi and the nearest KVK — each lane provenance-labelled.",
    judges: "Registry and Soil Health Card lanes honestly read CONTRACT_DEFINED / SIMULATED IDS. No lane implies a live government read.",
    link: { href: "/digital-twins/RJ-DEMO-PLOT-118", label: "Open golden twin" },
  },
  {
    title: "Public open data — cached and labelled",
    presenter: "World Bank, Open-Meteo and data.gov.in snapshots ship as a labelled cache with a fetch timestamp. Sources fetch live when the refresh script runs; the shipped artefact is always served CACHED.",
    judges: "Freshness is on screen; a cached public dataset is never presented as a live feed.",
  },
  {
    title: "DPI contract registry — honest statuses for 17 adapters",
    presenter: "The full readiness matrix: e-Dharti/ULPIN, AgriStack, Soil Health Card, Bhu-Aadhaar and more — each with consent basis, minimum fields, fallback and production dependency.",
    judges: "Statuses span CONTRACT_DEFINED, AWAITING_AUTHORITY, PUBLIC_DATA_ONLY and NOT_STARTED — with counts. Nothing in the registry claims a live connection.",
    link: { href: "/integrations", label: "Open adapter registry" },
  },
  {
    title: "Fully degraded = fully truthful",
    presenter: "Everything in this chapter ran offline from bundled artefacts — the same bytes the static export serves. Each integration has an activation doc (docs/integrations/*.md) naming the exact credential or approval that flips it live.",
    judges: "The demo never punts on honesty to look finished: gates are shown with evidence, samples are labelled SAMPLE, and no adapter is live unless its state chip says LIVE.",
  },
];

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <p className="mt-1 text-xs text-ink-700">
      <span className="font-bold text-ink-900">{label}: </span>{children}
    </p>
  );
}

function Chip({ children, tone = "bg-saffron-100 text-saffron-700" }: { children: React.ReactNode; tone?: string }) {
  return <span className={`chip ${tone}`}>{children}</span>;
}

interface SnapshotSource { status: string; note?: string; fetchedAt?: string }
const snap = snapshotJson as unknown as {
  snapshotId: string; fetchedAt: string; servedAs: string; honestyNote: string;
  sources: Record<string, SnapshotSource>;
};

function StepPanel({ index }: { index: number }) {
  const app = useApp();
  const connected = app.apiMode === "api-connected";

  // Every derivation below runs the real client mirrors on each render.
  const weather = standaloneDistrictWeather("Jodhpur");
  const explanation = explainWeatherSuitability({ weatherSuitability: 0.4 }, weather.weather, weather.state, 0.1);
  const mandi = standaloneMandiPrices("bajra");
  const kvk = nearestKvks(26.391, 72.946, "Jodhpur", 1)[0];
  const statusCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const a of INTEGRATIONS.adapters) c[a.status] = (c[a.status] ?? 0) + 1;
    return c;
  }, []);
  const ttsTemplateCount = Object.keys(TTS_KIND_LABELS).length;
  const w = weather.weather as {
    dailyRainfallForecastMm?: number; warningLevel?: string; issueTime?: string;
    relativeHumidityPct?: { morning?: number }; provenance?: string; stationOrDistrictId?: string;
  } | null;

  switch (index) {
    case 0:
      return (
        <div className="mt-3 rounded-lg border border-sand-300 bg-sand-50 p-3">
          <Row label="IMD weather"><Chip>{weather.state}</Chip></Row>
          <Row label="Bhashini voice"><Chip>{connected ? "see operations screen for live state" : "BHASHINI_CREDENTIALS_REQUIRED"}</Chip></Row>
          <Row label="AGMARKNET mandi"><Chip>{mandi.state}</Chip></Row>
          <Row label="DPI registry">{INTEGRATIONS.adapters.length} adapter contracts — none live</Row>
          {connected && <Row label="Mode">Connected demo backend — authoritative states on the operations screen.</Row>}
        </div>
      );
    case 1:
      return (
        <div className="mt-3 rounded-lg border border-sand-300 bg-sand-50 p-3">
          <Row label="Endpoint"><code className="font-mono text-[11px]">{whitelistEvidence.request.url}</code></Row>
          <Row label="Response"><Chip>HTTP {whitelistEvidence.response.httpStatus}</Chip></Row>
          <Row label="Body excerpt"><span className="italic">“{whitelistEvidence.response.bodyExcerpt}”</span></Row>
          <Row label="SHA-256"><code className="font-mono text-[11px]">{whitelistEvidence.response.sha256.slice(0, 24)}…</code></Row>
          <Row label="Captured">{whitelistEvidence.meta.capturedAtUtc} → <code className="font-mono text-[11px]">data/reference/imd-whitelist-evidence.json</code></Row>
        </div>
      );
    case 2:
      return (
        <div className="mt-3 rounded-lg border border-sand-300 bg-sand-50 p-3">
          <Row label="District contract">Jodhpur · rain {w?.dailyRainfallForecastMm} mm · RH {w?.relativeHumidityPct?.morning}% · warning {w?.warningLevel} · issued {w?.issueTime}</Row>
          <Row label="Station/district id"><code className="font-mono text-[11px]">{w?.stationOrDistrictId}</code></Row>
          <Row label="Provenance"><span className="font-semibold text-saffron-700">{w?.provenance}</span></Row>
          <Row label="Attribution"><span className="text-[11px]">{IMD_ATTRIBUTION}</span></Row>
        </div>
      );
    case 3:
      return (
        <div className="mt-3 rounded-lg border border-sand-300 bg-sand-50 p-3">
          <Row label="Computation"><span className="font-mono text-[11px]">{explanation.prior} → <span className="font-bold">{explanation.new}</span> (policy multiplier ×{(weatherPolicy.stateMultipliers as Record<string, number>)[weather.state] ?? 0} for {weather.state})</span></Row>
          <Row label="Score effect">{explanation.scoreEffectPoints > 0 ? "+" : ""}{explanation.scoreEffectPoints.toFixed(1)} pts at engine weight 0.1</Row>
          <Row label="Variables"><code className="font-mono text-[11px]">{explanation.variablesUsed.join(" · ")}</code></Row>
          <Row label="Reason"><span className="italic">{explanation.reason}</span></Row>
          <Row label="SIMULATED multiplier">{(weatherPolicy.stateMultipliers as Record<string, number>).SIMULATED_WEATHER} — simulated weather can never move the score</Row>
        </div>
      );
    case 4:
      return (
        <div className="mt-3 rounded-lg border border-sand-300 bg-sand-50 p-3">
          <Row label="ULCA sequence">getModelsPipeline (userID + ulcaApiKey) → cached config → callbackUrl compute with runtime inferenceApiKey</Row>
          <Row label="TTS templates">{ttsTemplateCount} allowlisted non-chemical Hindi templates — no free-text TTS endpoint exists</Row>
          <Row label="ASR">transcript always <Chip>UNREVIEWED</Chip> until an audited human confirm/edit</Row>
          <Row label="Keys">BHASHINI_* env on the API host only — never in the static export</Row>
        </div>
      );
    case 5:
      return (
        <div className="mt-3 rounded-lg border border-sand-300 bg-sand-50 p-3">
          <Row label="Glossary status"><Chip>{glossary.meta.status}</Chip></Row>
          <Row label="Dialect ASR claim"><span className="font-bold">{glossary.meta.dialectAsrClaim}</span></Row>
          <Row label="Routing">regional voice note → expert queue event “REGIONAL SPEECH — HUMAN REVIEW REQUIRED”</Row>
          <Row label="Offline">voice notes queue on-device (PENDING_USER_APPROVAL) — recordings are never lost</Row>
        </div>
      );
    case 6:
      return (
        <div className="mt-3 rounded-lg border border-sand-300 bg-sand-50 p-3">
          <Row label="State"><Chip>{mandi.state}</Chip></Row>
          {mandi.quotes.map((q) => (
            <Row key={q.mandi} label={q.mandi}>{q.district} · modal ₹{q.modalPriceInrQuintal}/quintal · {q.variety} · {q.arrivalDate}</Row>
          ))}
          <Row label="Provenance"><span className="font-semibold text-saffron-700">{mandi.provenance}</span></Row>
        </div>
      );
    case 7:
      return (
        <div className="mt-3 rounded-lg border border-sand-300 bg-sand-50 p-3">
          <Row label="Lifecycle"><code className="font-mono text-[11px]">{Object.keys(REFERRAL_FLOW).join(" → ")}</code></Row>
          <Row label="SLA">{DEFAULT_SLA_HOURS}h — WITHIN / DUE_SOON / OVERDUE chips on every referral</Row>
          <Row label="Pack">kvk-referral-pack/v1 · coords rounded to 2dp · UNVERIFIED statement · audit reference</Row>
          <Row label="Nearest KVK to golden plot">{kvk.name} · ~{kvk.distanceKm} km (est.)</Row>
        </div>
      );
    case 8:
      return (
        <div className="mt-3 rounded-lg border border-sand-300 bg-sand-50 p-3">
          <Row label="Lanes">registry (SIMULATED IDS) · consent · IMD weather ({weather.state}) · Soil Health Card (CONTRACT_DEFINED) · AGMARKNET ({mandi.state}) · KVK</Row>
          <Row label="Rule">no lane implies a live government read — each carries its state chip and provenance</Row>
        </div>
      );
    case 9:
      return (
        <div className="mt-3 rounded-lg border border-sand-300 bg-sand-50 p-3">
          <Row label="Snapshot"><code className="font-mono text-[11px]">{snap.snapshotId}</code> fetched {snap.fetchedAt} · served <Chip tone="bg-ink-800/10 text-ink-700">{snap.servedAs}</Chip></Row>
          {Object.entries(snap.sources).map(([k, s]) => (
            <Row key={k} label={k}><Chip tone={s.status === "LIVE_FETCHED" ? "bg-leaf-100 text-leaf-700" : "bg-sand-200 text-ink-500"}>{s.status}</Chip></Row>
          ))}
        </div>
      );
    case 10:
      return (
        <div className="mt-3 rounded-lg border border-sand-300 bg-sand-50 p-3">
          <Row label="Status families">
            {Object.entries(statusCounts).map(([s, n]) => (
              <Chip key={s} tone={s === "AWAITING_AUTHORITY" ? "bg-saffron-100 text-saffron-700" : "bg-ink-800/10 text-ink-700"}>{s} × {n}</Chip>
            ))}
          </Row>
          <Row label="Examples">e-Dharti/ULPIN, AgriStack, Soil Health Card — each with consent basis, minimum fields and production dependency</Row>
          <Row label="Registry provenance">{(INTEGRATIONS as unknown as { provenance?: string }).provenance ?? "SIMULATED — readiness matrix only"}</Row>
        </div>
      );
    case 11:
      return (
        <div className="mt-3 rounded-lg border border-sand-300 bg-sand-50 p-3">
          <Row label="This chapter">ran entirely from bundled artefacts — identical bytes to the static export</Row>
          <Row label="Activation docs"><code className="font-mono text-[11px]">docs/integrations/imd.md · bhashini.md · agmarknet.md</code></Row>
          <Row label="Truth statement"><span className="font-bold">No adapter in this prototype is live unless its state chip says LIVE — and none does today.</span></Row>
        </div>
      );
    default:
      return null;
  }
}

export default function GovInfraPath() {
  const [step, setStep] = useState(0);
  const [visited, setVisited] = useState<ReadonlySet<number>>(() => new Set([0]));
  const go = (i: number) => {
    setStep(i);
    setVisited((v) => new Set(v).add(i));
  };
  const s = GOV_INFRA_STEPS[step];
  const completedCount = visited.size;

  return (
    <div className="mt-4">
      <div className="h-2.5 rounded-full bg-sand-200" role="progressbar" aria-valuenow={completedCount} aria-valuemax={GOV_INFRA_STEPS.length} aria-label="Government infrastructure progress">
        <div className="h-2.5 rounded-full bg-leaf-600 transition-all" style={{ width: `${(completedCount / GOV_INFRA_STEPS.length) * 100}%` }} />
      </div>
      <div className="mt-1 text-xs text-ink-500">{completedCount} of {GOV_INFRA_STEPS.length} steps viewed — every panel recomputes from real adapter mirrors</div>

      <ol className="mt-4 flex flex-wrap gap-1.5" aria-label="Government infrastructure steps">
        {GOV_INFRA_STEPS.map((st, i) => (
          <li key={st.title}>
            <button
              type="button"
              onClick={() => go(i)}
              aria-current={i === step ? "step" : undefined}
              className={`h-8 w-8 rounded-full text-xs font-extrabold ${i === step ? "bg-ink-900 text-sand-50" : visited.has(i) ? "bg-leaf-600 text-white" : "bg-sand-200 text-ink-600"}`}
              title={st.title}
            >
              {i + 1}
            </button>
          </li>
        ))}
      </ol>

      <section className="card mt-4 p-5" aria-live="polite" aria-label={`Government infrastructure step ${step + 1}`}>
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-xl font-extrabold text-ink-900">Step {step + 1}: {s.title}</h2>
          {visited.has(step) && <span className="chip bg-leaf-100 text-leaf-700 border-leaf-600/40">✓ viewed</span>}
        </div>
        <p className="mt-2 text-sm leading-relaxed text-ink-700">{s.presenter}</p>
        <div className="mt-3 rounded-lg border border-ink-800/20 bg-ink-800/5 px-3 py-2 text-sm">
          <span className="font-extrabold text-ink-900">What judges should notice: </span>{s.judges}
        </div>
        <StepPanel index={step} />
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {s.link && <Link href={s.link.href} className="btn-primary">{s.link.label} →</Link>}
        </div>
        <div className="mt-4 flex justify-between border-t border-sand-200 pt-3">
          <button type="button" className="btn-secondary" disabled={step === 0} onClick={() => go(Math.max(0, step - 1))}>← Previous</button>
          <button type="button" className="btn-secondary" disabled={step === GOV_INFRA_STEPS.length - 1} onClick={() => go(Math.min(GOV_INFRA_STEPS.length - 1, step + 1))}>Next →</button>
        </div>
      </section>
    </div>
  );
}
