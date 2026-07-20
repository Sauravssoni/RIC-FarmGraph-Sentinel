"use client";

import { useState } from "react";
import { INTEGRATIONS } from "@/lib/seed";
import snapshotJson from "@data/reference/public-data-snapshot.json";
import imdSample from "@data/reference/imd-sample-district-forecast.json";
import whitelistEvidence from "@data/reference/imd-whitelist-evidence.json";
import { DemoBanner, SectionTitle } from "@/components/bits";
import { IMD_ATTRIBUTION, WEATHER_STATE_CHIP } from "@/lib/weather";
import type { IntegrationStatus } from "@contracts";

interface PublicDataSnapshot {
  snapshotId: string;
  fetchedAt: string;
  servedAs: string;
  honestyNote: string;
  sources: Record<string, {
    status: "LIVE_FETCHED" | "KEY_REQUIRED" | "UNREACHABLE";
    url?: string;
    note: string;
    indicators?: { id: string; label: string; latest: { date: string; value: number } | null }[];
    current?: Record<string, number | string>;
  }>;
}
const SNAPSHOT = snapshotJson as unknown as PublicDataSnapshot;
const SOURCE_STATUS_CLS: Record<string, string> = {
  LIVE_FETCHED: "bg-leaf-100 text-leaf-700 border-leaf-600/40",
  KEY_REQUIRED: "bg-saffron-100 text-saffron-700 border-saffron-500/40",
  UNREACHABLE: "bg-alert-50 text-alert-700 border-alert-600/40",
};

const STATUS_CLS: Record<IntegrationStatus, string> = {
  SIMULATED: "bg-saffron-100 text-saffron-700 border-saffron-500/40",
  CONTRACT_DEFINED: "bg-ink-800/10 text-ink-800 border-ink-800/20",
  PUBLIC_DATA_ONLY: "bg-leaf-100 text-leaf-700 border-leaf-600/40",
  AWAITING_AUTHORITY: "bg-saffron-100 text-saffron-700 border-saffron-500/40",
  NOT_STARTED: "bg-sand-200 text-slate2 border-sand-300",
};

type Adapter = (typeof INTEGRATIONS.adapters)[number];

export default function Integrations() {
  const [open, setOpen] = useState<Adapter | null>(null);
  const adapters = INTEGRATIONS.adapters;

  return (
    <div className="mx-auto max-w-[1440px] px-3 py-4 sm:px-5">
      <SectionTitle title="Government-integration readiness matrix" sub={`${adapters.length} typed adapter contracts — none live, no credentials exist in this prototype.`} />
      <div className="mb-3 rounded-lg border border-alert-600/40 bg-alert-50 px-3.5 py-2 text-sm font-semibold text-alert-700" role="note">
        No adapter on this page is live. Rakshak does not claim RajSSO, Jan Aadhaar, e-Dharti, Bhashini, IMD or KVK connectivity. Statuses show readiness, not access.
      </div>
      <DemoBanner />

      <div className="card mt-3 overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="bg-sand-100">
              <th className="th">System</th><th className="th">Purpose</th><th className="th">Direction</th>
              <th className="th">Status</th><th className="th">Fallback</th><th className="th">Last checked</th><th className="th"></th>
            </tr>
          </thead>
          <tbody>
            {adapters.map((a) => (
              <tr key={a.id} className="hover:bg-sand-50">
                <td className="td font-bold">{a.name}</td>
                <td className="td text-sm max-w-[280px]">{a.purpose}</td>
                <td className="td text-xs">{a.direction}</td>
                <td className="td"><span className={`chip ${STATUS_CLS[a.status as IntegrationStatus]}`}>{a.status}</span></td>
                <td className="td text-xs max-w-[220px]">{a.fallback}</td>
                <td className="td text-xs">{INTEGRATIONS.lastChecked}</td>
                <td className="td"><button type="button" className="btn-secondary !min-h-[36px] px-2.5 text-xs" onClick={() => setOpen(a)}>Details</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
          <span className="chip bg-ink-800/10 text-ink-800 border-ink-800/20">CACHED · fetched {SNAPSHOT.fetchedAt}</span>
        </div>
        <p className="mt-1 text-xs text-ink-500">{SNAPSHOT.honestyNote}</p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {Object.entries(SNAPSHOT.sources).map(([name, src]) => (
            <div key={name} className="rounded-lg border border-sand-300 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-ink-900">{name}</span>
                <span className={`chip ${SOURCE_STATUS_CLS[src.status]}`}>{src.status}</span>
              </div>
              {src.indicators && (
                <ul className="mt-2 space-y-1 text-xs text-ink-700">
                  {src.indicators.map((ind) => (
                    <li key={ind.id}>
                      {ind.label}: <span className="font-bold tabular-nums">{ind.latest ? `${ind.latest.value.toFixed(1)} (${ind.latest.date})` : "—"}</span>
                    </li>
                  ))}
                </ul>
              )}
              {src.current && (
                <p className="mt-2 text-xs text-ink-700">
                  Golden plot now: <span className="font-bold tabular-nums">{String(src.current.temperature_2m)}°C · RH {String(src.current.relative_humidity_2m)}% · wind {String(src.current.wind_speed_10m)} km/h</span>
                </p>
              )}
              <p className="mt-2 text-[11px] leading-snug text-ink-500">{src.note}</p>
              {src.url && <p className="mt-1 break-all font-mono text-[10px] text-ink-400">{src.url}</p>}
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-ink-500">
          Refresh with <code className="font-mono">python3 scripts/fetch_public_data.py</code> (optionally with <code className="font-mono">DATAGOVIN_API_KEY=…</code>). The API serves the same snapshot at <code className="font-mono">/api/v1/public-data</code>.
        </p>
      </section>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/40 p-3 sm:items-center" role="dialog" aria-modal="true" aria-label={`${open.name} adapter details`} onClick={() => setOpen(null)}>
          <div className="card max-h-[85vh] w-full max-w-lg overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-lg font-extrabold">{open.name}</h3>
              <span className={`chip ${STATUS_CLS[open.status as IntegrationStatus]}`}>{open.status}</span>
            </div>
            <dl className="mt-3 space-y-2 text-sm">
              <div><dt className="font-bold text-ink-700">Purpose</dt><dd>{open.purpose}</dd></div>
              <div><dt className="font-bold text-ink-700">Data direction</dt><dd>{open.direction}</dd></div>
              <div><dt className="font-bold text-ink-700">Minimum fields</dt><dd className="font-mono text-xs">{open.minFields.join(", ")}</dd></div>
              <div><dt className="font-bold text-ink-700">Consent / legal basis</dt><dd>{open.consentBasis}</dd></div>
              <div><dt className="font-bold text-ink-700">Production dependency</dt><dd>{open.productionDependency}</dd></div>
              <div><dt className="font-bold text-ink-700">Fallback mode</dt><dd>{open.fallback}</dd></div>
              <div><dt className="font-bold text-ink-700">Owner</dt><dd>{open.owner}</dd></div>
            </dl>
            <button type="button" className="btn-primary mt-4 w-full" onClick={() => setOpen(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
