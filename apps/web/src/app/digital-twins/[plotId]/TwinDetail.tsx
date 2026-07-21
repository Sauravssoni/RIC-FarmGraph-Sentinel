"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useDemoStore } from "@/lib/store";
import { deriveTwin, simulateScenario, TWIN_STATE_META, type TwinState } from "@/lib/twin";
import { DemoBanner, StatusChip } from "@/components/bits";
import { Timeline } from "@/components/Timeline";
import { TwinGovRail } from "@/components/TwinGovRail";
import { fmtDate, fmtDateTime } from "@/lib/format";

const SCENARIOS = [
  { id: "rainfall", label: "🌧 Rainfall/humidity increases" },
  { id: "nearby_case", label: "📍 Similar case appears within 6 km" },
  { id: "expert_confirm", label: "✔ Expert confirms the condition" },
  { id: "mark_duplicate", label: "⧉ A member case is marked duplicate" },
  { id: "intervention_success", label: "↗ Intervention succeeds" },
  { id: "intervention_failure", label: "↘ Intervention fails" },
] as const;

export default function TwinDetail({ plotId }: { plotId: string }) {
  const state = useDemoStore((s) => s.getState());
  const twin = useMemo(() => deriveTwin(plotId, state), [plotId, state]);
  const [scenario, setScenario] = useState<(typeof SCENARIOS)[number]["id"] | null>(null);

  if (!twin) {
    return (
      <main className="mx-auto max-w-3xl px-3 py-8">
        <p className="text-sm text-ink-600">No digital twin exists for plot <span className="font-mono">{plotId}</span> in the demo dataset. <Link className="font-bold underline" href="/digital-twins/">← All twins</Link></p>
      </main>
    );
  }

  const meta = TWIN_STATE_META[twin.state as TwinState];
  const result = scenario ? simulateScenario(scenario, twin, state.cases) : null;

  return (
    <main className="mx-auto max-w-6xl px-3 py-4 sm:px-5">
      <DemoBanner />
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-ink-500"><Link href="/digital-twins/" className="underline">Digital Twins</Link> / {twin.plot.id}</p>
          <h1 className="mt-0.5 text-xl font-extrabold tracking-tight text-ink-950">
            {twin.season ? `${twin.season.crop.toUpperCase()} · ${twin.season.stage}` : "Plot"} — {twin.plot.block}, {twin.plot.district}
          </h1>
          <p className="text-sm text-ink-600">
            {twin.farmer?.pseudonym ?? twin.plot.farmerId} (pseudonymous) · {twin.plot.areaAcres} acres · {twin.plot.lat.toFixed(3)}, {twin.plot.lon.toFixed(3)}
            {twin.season && <> · sown {fmtDate(twin.season.sownOn)} · {twin.season.season}</>}
          </p>
        </div>
        <div className="text-right">
          <span className={`chip text-sm ${meta.cls}`}><span aria-hidden>{meta.glyph}</span> Twin state: {meta.label}</span>
          <p className="mt-1 max-w-xs text-xs text-ink-600">{twin.stateReason}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="min-w-0 space-y-4 lg:col-span-2">
          {/* field view */}
          <section className="card p-4">
            <h2 className="text-base font-extrabold text-ink-900">Field view <span className="text-xs font-semibold text-ink-500">(demo polygon — not a surveyed boundary)</span></h2>
            <svg viewBox="0 0 400 220" className="mt-2 w-full rounded-lg border border-sand-300 bg-sand-100" role="img" aria-label="Stylised demo field plot">
              <rect x="0" y="0" width="400" height="220" fill="#eef0e6" />
              <polygon points="70,40 330,55 345,180 60,190" fill={twin.state === "STABLE" || twin.state === "IMPROVING" ? "#d9ead9" : twin.state === "VERIFIED_ISSUE" || twin.state === "UNRESOLVED" ? "#f6d9d6" : "#f7e8c8"} stroke="#6b7b53" strokeWidth="2" strokeDasharray="6 4" />
              <text x="200" y="115" textAnchor="middle" fontSize="13" fontWeight="700" fill="#42506b">{twin.plot.areaAcres} acres · {twin.season?.crop ?? "fallow"}</text>
              <text x="200" y="200" textAnchor="middle" fontSize="10" fill="#5b6472">Demo polygon for illustration — ULPIN/e-Dharti boundary adapter is CONTRACT_DEFINED, not live.</text>
            </svg>
            <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
              <p className="rounded-md bg-sand-100 px-2 py-1.5"><span className="font-bold">Soil context:</span> {twin.soilNote}</p>
              <p className="rounded-md bg-sand-100 px-2 py-1.5"><span className="font-bold">Weather context:</span> {twin.weatherNote}</p>
            </div>
          </section>

          {/* government data rail — every lane provenance-labelled */}
          <TwinGovRail twin={twin} />

          {/* cases & evidence */}
          <section className="card p-4">
            <h2 className="text-base font-extrabold text-ink-900">Cases on this plot</h2>
            {twin.cases.length === 0 && <p className="mt-2 text-sm text-ink-500">No cases recorded.</p>}
            <ul className="mt-2 space-y-2">
              {twin.cases.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-sand-300 px-3 py-2">
                  <div>
                    <Link href={`/cases/${c.id}/`} className="font-mono text-sm font-bold text-ink-900 underline">{c.id}</Link>
                    <span className="ml-2 text-xs text-ink-500">{c.crop} · {c.cropStage} · {fmtDate(c.createdAt)}</span>
                    {c.expertConfirmedCondition && <span className="ml-2 chip bg-leaf-100 text-leaf-800">{c.expertConfirmedCondition}</span>}
                  </div>
                  <StatusChip state={c.state} />
                </li>
              ))}
            </ul>
          </section>

          {/* advisories + missions */}
          <section className="card p-4">
            <h2 className="text-base font-extrabold text-ink-900">Advisories & missions</h2>
            {twin.advisories.length === 0 && twin.missions.length === 0 && <p className="mt-2 text-sm text-ink-500">None yet.</p>}
            {twin.advisories.map((a) => (
              <p key={a.id} className="mt-2 rounded-lg border border-sand-300 px-3 py-2 text-sm">
                <span className="font-bold">{a.id}</span> · {a.conditionId} · status {a.status}
                <span className="ml-2 chip bg-alert-100 text-alert-700">chemical LOCKED</span>
              </p>
            ))}
            {twin.missions.map((m) => (
              <p key={m.id} className="mt-2 rounded-lg border border-sand-300 px-3 py-2 text-sm">
                <span className="font-bold">{m.id}</span> · {m.purpose} · <span className="font-bold">{m.status}</span> · assigned {m.assignedRole}
              </p>
            ))}
          </section>

          {/* timeline */}
          <section className="card p-4">
            <h2 className="text-base font-extrabold text-ink-900">Append-only plot timeline</h2>
            <Timeline events={twin.cases.flatMap((c) => c.timeline).sort((a, b) => a.at.localeCompare(b.at))} />
          </section>
        </div>

        <div className="space-y-4">
          {/* outbreak relationship */}
          <section className="card p-4">
            <h2 className="text-base font-extrabold text-ink-900">Outbreak relationship</h2>
            {twin.cluster ? (
              <div className="mt-2 text-sm">
                <p><Link href="/outbreaks/" className="font-bold underline">{twin.cluster.cluster.id}</Link> · {twin.cluster.cluster.name}</p>
                <p className="mt-1 text-2xl font-extrabold tabular-nums">{twin.cluster.score.score}<span className="text-sm font-bold text-ink-500"> / 100 · {twin.cluster.score.status}</span></p>
                <p className="mt-1 text-xs text-ink-600">{twin.cluster.score.explanation}</p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-ink-500">This plot is not part of any tracked cluster.</p>
            )}
          </section>

          {/* next actions */}
          <section className="card p-4">
            <h2 className="text-base font-extrabold text-ink-900">Projected next actions</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-700">
              {twin.nextActions.map((a) => <li key={a}>{a}</li>)}
            </ul>
          </section>

          {/* scenario simulator */}
          <section className="card p-4">
            <h2 className="text-base font-extrabold text-ink-900">Scenario simulator <span className="chip ml-1 bg-saffron-100 text-saffron-800">SIMULATED</span></h2>
            <p className="mt-1 text-xs text-ink-500">Compute-only: shows how the explainable outbreak score reacts. Never mutates data; not a biological prediction.</p>
            <div className="mt-2 grid gap-1.5">
              {SCENARIOS.map((s) => (
                <button key={s.id} type="button" onClick={() => setScenario(s.id)}
                  className={`rounded-lg border px-3 py-2 text-left text-xs font-bold ${scenario === s.id ? "border-ink-800 bg-ink-800 text-white" : "border-sand-300 bg-sand-50 text-ink-800"}`}>
                  {s.label}
                </button>
              ))}
            </div>
            {result && (
              <div className="mt-3 rounded-lg border border-sand-300 bg-sand-50 p-3 text-xs">
                <p className="font-extrabold text-ink-900">{result.title}</p>
                {result.before && result.after ? (
                  <p className="mt-1 text-sm">Cluster score: <span className="tabular-nums font-bold">{result.before.score}</span> ({result.before.status}) → <span className="tabular-nums font-bold text-ink-950">{result.after.score}</span> ({result.after.status})</p>
                ) : (
                  <p className="mt-1 text-sm text-ink-600">No cluster attached — response shown below.</p>
                )}
                {result.changedComponents.length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {result.changedComponents.map((c) => (
                      <li key={c.component} className="tabular-nums">· {c.component}: {c.before} → <span className="font-bold">{c.after}</span></li>
                    ))}
                  </ul>
                )}
                <p className="mt-1"><span className="font-bold">Operational response:</span> {result.operationalResponse}</p>
                <p className="mt-1 italic text-saffron-700">{result.honestyNote}</p>
              </div>
            )}
          </section>

          {/* data freshness */}
          <section className="card p-4 text-xs text-ink-600">
            <h2 className="text-base font-extrabold text-ink-900">Data sources & freshness</h2>
            <ul className="mt-2 space-y-1">
              <li>· Twin derived live from store state (no separate twin DB — cannot drift)</li>
              <li>· Last sync: {twin.lastSyncAt ? fmtDateTime(twin.lastSyncAt) : "never (offline draft only)"}</li>
              <li>· Plot/season/farmer: simulated demo records</li>
              <li>· Weather/soil: labelled placeholders (see evidence register)</li>
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}
