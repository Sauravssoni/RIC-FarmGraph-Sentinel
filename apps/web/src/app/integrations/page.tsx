"use client";
import { useEffect, useMemo, useState } from "react";
import { INTEGRATIONS } from "@/lib/seed";
import snapshotJson from "@data/reference/public-data-snapshot.json";
import imdSample from "@data/reference/imd-sample-district-forecast.json";
import whitelistEvidence from "@data/reference/imd-whitelist-evidence.json";
import { DemoBanner, SectionTitle } from "@/components/bits";
import { IMD_ATTRIBUTION, WEATHER_STATE_CHIP } from "@/lib/weather";
import { useApp } from "@/lib/app";
import { getJson } from "@/lib/httpProvider";
import type { IntegrationStatus } from "@contracts";

const CHIP: Record<IntegrationStatus, string> = {
  SIMULATED: "bg-sand-200 text-ink-500",
  CONTRACT_DEFINED: "bg-ink-800/10 text-ink-700",
  AWAITING_AUTHORITY: "bg-saffron-100 text-saffron-700",
  NOT_STARTED: "bg-sand-200 text-ink-500",
  PUBLIC_DATA_ONLY: "bg-ink-800/10 text-ink-700",
};

interface SnapshotSource { status: string; note?: string; indicators?: Record<string, { value: number | null; year: string }[]>; fetchedAt?: string; location?: { lat: number; lon: number }; current?: Record<string, number>; url?: string }
const snap = snapshotJson as unknown as { snapshotId: string; fetchedAt: string; servedAs: string; honestyNote: string; sources: Record<string, SnapshotSource> };

/** Live-adapter row: exact state from the API when connected, else the honest
 * known state with the reason (credentials live on the API host). */
function LiveAdapterRow({ name, state, detail, endpoint }: { name: string; state: string; detail: string; endpoint: string }) {
  return (
    <li className="rounded-lg border border-sand-300 px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold text-ink-900">{name}</span>
        <span className="chip bg-saffron-100 text-saffron-700">{state}</span>
        <code className="font-mono text-[10px] text-ink-500">{endpoint}</code>
      </div>
      <p className="mt-0.5 text-xs text-ink-600">{detail}</p>
    </li>
  );
}

export default function IntegrationsPage() {
  const app = useApp();
  const connected = app.apiMode === "api-connected";
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [liveStates, setLiveStates] = useState<Record<string, string>>({});

  // Connected mode: pull exact live states from the API (authoritative).
  useEffect(() => {
    if (!connected) return;
    const pull = async () => {
      const out: Record<string, string> = {};
      try { out.bhashini = (await getJson<{ state: string }>("/api/v1/bhashini/status")).state; } catch { /* keep default */ }
      try { out.imd = (await getJson<{ state: string }>("/api/v1/integrations/weather?district=Jodhpur")).state; } catch { /* keep */ }
      try { out.mandi = (await getJson<{ state: string }>("/api/v1/integrations/mandi?crop=bajra")).state; } catch { /* keep */ }
      setLiveStates(out);
    };
    void pull();
  }, [connected]);

  const statuses = useMemo(() => ["ALL", ...Array.from(new Set(INTEGRATIONS.adapters.map((a) => a.status))).sort()], []);
  const filtered = INTEGRATIONS.adapters.filter((a) => statusFilter === "ALL" || a.status === statusFilter);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const a of INTEGRATIONS.adapters) c[a.status] = (c[a.status] ?? 0) + 1;
    return c;
  }, []);

  return (
    <main className="mx-auto max-w-6xl px-3 py-4 sm:px-5">
      <DemoBanner />
      <SectionTitle title="Integrations operations" sub="Every government touchpoint with its exact state — live adapters first, then DPI adapter contracts. Nothing here fabricates a connection." />

      {/* Live adapters — exact states */}
      <section className="card mt-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-extrabold text-ink-900">Live adapters ({connected ? "states from the connected demo backend" : "standalone — known states from bundled evidence"})</h2>
          <span className={`chip ${connected ? "bg-leaf-100 text-leaf-700" : "bg-ink-800/10 text-ink-700"}`}>{connected ? "CONNECTED DEMO BACKEND" : "STANDALONE"}</span>
        </div>
        <ul className="mt-3 space-y-2">
          <LiveAdapterRow name="IMD weather (primary government source)" endpoint="GET /api/v1/integrations/weather?district=…"
            state={liveStates.imd ?? "IMD_IP_WHITELIST_REQUIRED"}
            detail={liveStates.imd ? "Live state from the connected backend." : `Genuine HTTP 401 whitelist gate captured ${whitelistEvidence.meta.capturedAtUtc.slice(0, 10)} (data/reference/imd-whitelist-evidence.json). Labelled SAMPLE shape demonstrates the district contract.`} />
          <LiveAdapterRow name="Bhashini Hindi PoC (ASR/TTS)" endpoint="GET /api/v1/bhashini/status"
            state={liveStates.bhashini ?? "BHASHINI_CREDENTIALS_REQUIRED"}
            detail="ULCA credentials live on the API host only (BHASHINI_USER_ID/API_KEY/PIPELINE_ID — docs/integrations/bhashini.md). Voice notes stay on-device; browser dictation is a labelled fallback." />
          <LiveAdapterRow name="AGMARKNET mandi prices (data.gov.in)" endpoint="GET /api/v1/integrations/mandi?crop=…"
            state={liveStates.mandi ?? "MANDI_CREDENTIALS_REQUIRED"}
            detail="Free DATAGOV_API_KEY activates live Rajasthan mandi quotes (docs/integrations/agmarknet.md). Labelled SAMPLE shape demonstrates the quote contract." />
          <LiveAdapterRow name="Public-data connector (World Bank + Open-Meteo)" endpoint="GET /api/v1/public-data"
            state={`CACHED — snapshot ${snap.snapshotId}`}
            detail={`Genuinely fetched ${snap.fetchedAt}; served cached with per-source status below.`} />
        </ul>
      </section>

      {/* IMD government weather — source hierarchy with genuine evidence */}
      <section className="card mt-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-extrabold text-ink-900">IMD weather adapter — government source hierarchy</h2>
          <span className={`chip ${WEATHER_STATE_CHIP["IMD_IP_WHITELIST_REQUIRED"]}`}>IMD_IP_WHITELIST_REQUIRED</span>
        </div>
        <p className="mt-1 text-xs text-ink-500">{IMD_ATTRIBUTION}</p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-saffron-500/50 bg-saffron-50 p-3">
            <p className="text-sm font-bold text-ink-900">① Official IMD API</p>
            <p className="mt-1 text-xs text-ink-700">
              Documented endpoint <code className="font-mono text-[10px]">mausam.imd.gov.in/api/current_wx_api.php</code> answered
              <span className="font-bold"> HTTP 401 — IP/domain whitelisting required</span> (genuine capture:
              <code className="font-mono text-[10px]"> data/reference/imd-whitelist-evidence.json</code>,
              {` ${whitelistEvidence.meta.capturedAtUtc.slice(0, 10)}`}).
            </p>
            <p className="mt-1 text-[11px] text-ink-500">Activation: IMD IP whitelisting, or DATAGOV_API_KEY for the OGD-hosted IMD product (docs/integrations/imd.md).</p>
          </div>
          <div className="rounded-lg border border-sand-300 p-3">
            <p className="text-sm font-bold text-ink-900">② District contract — labelled SAMPLE SHAPE</p>
            <p className="mt-1 text-xs text-ink-700">
              Jodhpur: rain {imdSample.days[0].rainfallForecastMm} mm · RH {imdSample.days[0].rhMorningPct}% · wind {imdSample.days[0].windKmh} km/h · warning {imdSample.warnings[0].level} ({imdSample.warnings[0].type}).
            </p>
            <p className="mt-1 text-[11px] font-semibold text-saffron-700">
              SAMPLE SHAPE — awaiting first whitelisted capture. Never labelled CACHED_IMD_DATA; demonstrates parsing + the explainable outbreak-score component only.
            </p>
          </div>
          <div className="rounded-lg border border-sand-300 p-3">
            <p className="text-sm font-bold text-ink-900">③ Fallback — Open-Meteo</p>
            <span className={`chip ${WEATHER_STATE_CHIP["NON_GOVERNMENT_WEATHER_FALLBACK"]}`}>NON_GOVERNMENT_WEATHER_FALLBACK</span>
            <p className="mt-1 text-xs text-ink-700">
              Open-Meteo (open data, CC-BY 4.0) is an operational fallback only — <span className="font-bold">not a government source</span>, never promoted to an IMD label, and it moves the outbreak score less than official data (policy multiplier).
            </p>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-ink-500">
          Live evaluation: <code className="font-mono">GET /api/v1/integrations/weather?district=Jodhpur</code> · per-cluster explanation: <code className="font-mono">GET /api/v1/outbreaks/CL-2601/weather-context</code> · also visible on the Outbreaks page per cluster.
        </p>
      </section>

      {/* Public-data connector — genuinely fetched snapshot, served CACHED */}
      <section className="card mt-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-extrabold text-ink-900">Public-data connector — cached snapshot</h2>
          <span className="chip bg-ink-800/10 text-ink-700">{snap.servedAs} · fetched {snap.fetchedAt}</span>
        </div>
        <p className="mt-1 text-xs text-ink-500">{snap.honestyNote}</p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {Object.entries(snap.sources).map(([key, s]) => (
            <div key={key} className="rounded-lg border border-sand-300 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-ink-900">{key.replace(/_/g, " ")}</p>
                <span className={`chip ${s.status === "LIVE_FETCHED" ? "bg-leaf-100 text-leaf-700" : "bg-saffron-100 text-saffron-700"}`}>{s.status}</span>
              </div>
              {s.indicators && (
                <ul className="mt-2 space-y-1 text-xs text-ink-700">
                  {Object.entries(s.indicators).map(([code, rows]) => (
                    <li key={code}><span className="font-mono">{code}</span>: {rows[0]?.value ?? "n/a"} ({rows[0]?.year})</li>
                  ))}
                </ul>
              )}
              {s.current && (
                <ul className="mt-2 space-y-1 text-xs text-ink-700">
                  <li>🌡 {s.current.temperature_2m} °C · 💧 {s.current.relative_humidity_2m}% RH · 🌧 {s.current.precipitation} mm · 💨 {s.current.wind_speed_10m} km/h</li>
                  <li className="text-ink-500">golden plot ({s.location?.lat}, {s.location?.lon}) · {s.fetchedAt}</li>
                </ul>
              )}
              {s.note && <p className="mt-2 text-[11px] text-ink-500">{s.note}</p>}
              {s.url && <p className="mt-1 break-all font-mono text-[10px] text-ink-400">{s.url}</p>}
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-ink-500">
          Refresh: <code className="font-mono">python3 scripts/fetch_public_data.py</code> (data.gov.in activates with a free DATAGOV_API_KEY — honest KEY_REQUIRED until then).
        </p>
      </section>

      {/* DPI adapter contracts with status filters */}
      <section className="mt-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-extrabold text-ink-900">DPI adapter contracts ({filtered.length} of {INTEGRATIONS.adapters.length})</h2>
          <span className="text-[11px] text-ink-500">contracts v{INTEGRATIONS.version} · checked {INTEGRATIONS.lastChecked}</span>
        </div>
        <p className="mt-1 rounded-md bg-sand-100 px-2 py-1 text-[11px] font-semibold text-ink-700">
          No adapter on this page is live unless its state chip says LIVE — every contract below shows its exact status, production dependency and honest fallback.
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Filter by status">
          {statuses.map((s) => (
            <button key={s} type="button" onClick={() => setStatusFilter(s)}
              className={`chip border ${statusFilter === s ? "border-ink-800 bg-ink-800 text-sand-50" : "border-sand-300 bg-sand-100 text-ink-700"}`}
              aria-pressed={statusFilter === s}>
              {s}{s !== "ALL" ? ` (${counts[s as IntegrationStatus] ?? 0})` : ""}
            </button>
          ))}
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {filtered.map((i) => (
            <article key={i.id} className="card p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-extrabold text-ink-900">{i.name}</h3>
                <span className={`chip ${CHIP[i.status as IntegrationStatus]}`}>{i.status}</span>
              </div>
              <p className="mt-1 text-xs text-ink-600">{i.purpose}</p>
              <p className="mt-1 text-[11px] text-ink-500"><span className="font-semibold">Needs:</span> {i.minFields.join(", ")}</p>
              <p className="mt-0.5 text-[11px] text-ink-500"><span className="font-semibold">Consent:</span> {i.consentBasis}</p>
              <p className="mt-0.5 text-[11px] text-ink-500"><span className="font-semibold">Production dependency:</span> {i.productionDependency}</p>
              <p className="mt-1 text-[11px] font-semibold text-leaf-700">Fallback now: {i.fallback}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
