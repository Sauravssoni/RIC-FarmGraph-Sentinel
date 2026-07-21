"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DemoBanner, KpiCard, StatusChip } from "@/components/bits";
import { FilterBar, DEFAULT_FILTERS, type CaseFilters } from "@/components/FilterBar";
import { MapView } from "@/components/MapView";
import { useApp } from "@/lib/app";
import { fmtDateTime } from "@/lib/format";
import { nearestKvks } from "@/lib/kvk";
import { CROPS, cropLabel } from "@/lib/seed";
import { useDemoStore } from "@/lib/store";

export default function CommandCentre() {
  const app = useApp();
  const [filters, setFilters] = useState<CaseFilters>(DEFAULT_FILTERS);
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);

  const data = useDemoStore((s) => ({
    overview: s.overview(),
    cases: s.getState().cases,
    clusters: s.clustersWithScores(),
    queue: s.expertQueue(),
    missions: s.getState().missions,
    referrals: s.getState().referrals,
    demoNow: s.getState().meta.demoNow,
  }));

  const districts = useMemo(() => [...new Set(data.cases.map((c) => c.district))], [data.cases]);
  const states = useMemo(() => [...new Set(data.cases.map((c) => c.state))], [data.cases]);

  const filtered = useMemo(() => {
    let out = data.cases;
    if (filters.crop !== "all") out = out.filter((c) => c.crop === filters.crop);
    if (filters.district !== "all") out = out.filter((c) => c.district === filters.district);
    if (filters.state !== "all") out = out.filter((c) => c.state === filters.state);
    if (filters.range !== "all") out = out.filter((c) => c.season === filters.range);
    if (filters.verified === "verified") out = out.filter((c) => c.expertConfirmedCondition && c.expertConfirmedCondition !== "unknown");
    if (filters.verified === "suspected") out = out.filter((c) => !c.expertConfirmedCondition);
    if (filters.search) {
      const q = filters.search.toLowerCase();
      out = out.filter((c) => [c.id, c.plotId, c.farmerId].some((v) => v.toLowerCase().includes(q)));
    }
    return out;
  }, [data.cases, filters]);

  const topCluster = useMemo(
    () => [...data.clusters].sort((a, b) => b.score.score - a.score.score)[0],
    [data.clusters],
  );
  const selectedCluster = data.clusters.find((c) => c.id === selectedClusterId) ?? topCluster;
  const openReferrals = data.referrals.filter((r) => !["CLOSED", "RESPONDED"].includes(r.status));
  const activeMissions = data.missions.filter((m) => m.status !== "COMPLETED");
  const decisionLoad = data.overview.awaitingExpert + data.overview.pendingSync;
  const latestCases = [...filtered].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 7);
  const o = data.overview;

  return (
    <div className="mx-auto max-w-[1480px] px-3 pb-10 pt-4 sm:px-5 sm:pt-6">
      <section className="surface-dark overflow-hidden p-5 sm:p-7">
        <div className="grid items-end gap-7 lg:grid-cols-[1.4fr_0.8fr]">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-ink-400">
              <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1">Rajasthan pilot command</span>
              <span>Jodhpur · Nagaur · Jalore</span>
              <span>·</span>
              <span>{fmtDateTime(data.demoNow)}</span>
            </div>
            <h1 className="mt-5 max-w-4xl text-3xl font-extrabold tracking-[-0.035em] text-white sm:text-4xl lg:text-5xl">
              See the risk. Verify the field. Coordinate the response.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-ink-400 sm:text-base">
              One operational view for crop-health signals, expert decisions, outbreak clusters, field missions, KVK support and farmer follow-up. The first screen answers a single question: <strong className="text-white">what needs action today?</strong>
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/demo" className="btn-amber">Run the 3-minute evaluator proof →</Link>
              <Link href="/field/scan" className="inline-flex min-h-[44px] items-center rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/10">Capture a field report</Link>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink-400">Today’s operating brief</p>
                <p className="mt-1 text-sm font-bold text-white">Decision load and field response</p>
              </div>
              <span className={`chip border-white/15 ${app.apiMode === "api-connected" ? "bg-leaf-500/15 text-leaf-100" : "bg-white/5 text-ink-400"}`}>
                <span className={`h-2 w-2 rounded-full ${app.apiMode === "api-connected" ? "bg-leaf-500" : "bg-ink-400"}`} aria-hidden="true" />
                {app.apiMode === "api-connected" ? "Connected" : "Standalone demo"}
              </span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <BriefMetric value={o.awaitingExpert} label="Expert decisions" />
              <BriefMetric value={o.highPriority} label="High-priority cases" />
              <BriefMetric value={activeMissions.length} label="Active missions" />
              <BriefMetric value={openReferrals.length} label="Open KVK referrals" />
            </div>
          </div>
        </div>
      </section>

      <div className="mt-4"><DemoBanner /></div>

      <section className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard title="Open field cases" label="Coverage" value={o.activeCases} sub="Every number drills into a traceable case." href="/cases?open=1" />
        <KpiCard title="Items needing a decision" label="Attention" value={decisionLoad} sub={`${o.awaitingExpert} expert · ${o.pendingSync} awaiting sync`} href="/expert" tone="saffron" />
        <KpiCard title="Active outbreak signals" label="Risk" value={o.suspectedClusters} sub="Suspected and verified clusters remain distinct." href="/outbreaks" tone="alert" />
        <KpiCard title="Follow-up completion" label="Response" value={`${o.followUpCompletionPct}%`} sub={`${o.resolvedOrImproving} cases improving or resolved`} href="/cases?state=RESOLVED" tone="leaf" />
      </section>

      <section className="mt-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">District risk picture</p>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-ink-950">Where the next response should happen</h2>
            <p className="mt-1 text-sm text-ink-500">Map first, decisions second. Technical filters stay available without dominating the screen.</p>
          </div>
          <details className="group relative">
            <summary className="btn-secondary cursor-pointer list-none">Refine map view <span aria-hidden="true">⌄</span></summary>
            <div className="absolute right-0 z-20 mt-2 w-[min(92vw,900px)] rounded-2xl border border-sand-200 bg-white p-4 shadow-[0_20px_60px_rgba(16,26,46,0.16)]">
              <FilterBar filters={filters} onChange={setFilters} crops={CROPS.map((c) => c.id)} districts={districts} states={states} />
            </div>
          </details>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,0.75fr)]">
          <MapView cases={filtered} clusters={data.clusters} selectedCluster={selectedCluster?.id} onSelectCluster={setSelectedClusterId} />

          <aside className="card p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="eyebrow">Priority rail</p>
                <h3 className="mt-1 text-lg font-extrabold text-ink-950">What needs action now</h3>
              </div>
              <Link href="/cases" className="text-xs font-extrabold text-ink-600">All cases →</Link>
            </div>

            <div className="mt-4 space-y-3">
              {data.queue.slice(0, 3).map((q, index) => (
                <Link key={q.case.id} href={`/cases/${q.case.id}`} className="block rounded-xl border border-sand-200 bg-sand-50/70 p-3 transition hover:border-saffron-500/50 hover:bg-saffron-50">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-saffron-700">Priority {index + 1}</p>
                      <p className="mt-1 text-sm font-extrabold text-ink-950">{q.case.id} · {cropLabel(q.case.crop)}</p>
                      <p className="mt-1 text-xs leading-relaxed text-ink-500">{q.case.block}, {q.case.district} · {q.priorityReason}</p>
                    </div>
                    <span className="chip border-saffron-500/40 bg-saffron-100 text-saffron-700">{q.priorityScore}</span>
                  </div>
                </Link>
              ))}
            </div>

            {selectedCluster && (
              <div className="mt-5 border-t border-sand-200 pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="eyebrow">Selected cluster</p>
                    <h4 className="mt-1 text-base font-extrabold text-ink-950">{selectedCluster.name}</h4>
                  </div>
                  <span className={`chip ${selectedCluster.status === "VERIFIED" ? "border-alert-600/40 bg-alert-100 text-alert-700" : selectedCluster.status === "DISMISSED" ? "border-sand-300 bg-sand-100 text-ink-500" : "border-saffron-500/40 bg-saffron-100 text-saffron-700"}`}>
                    {selectedCluster.status}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <MiniMetric value={selectedCluster.score.score} label="Risk score" />
                  <MiniMetric value={`${selectedCluster.score.verifiedCount}/${selectedCluster.score.memberCount}`} label="Verified" />
                  <MiniMetric value={`${selectedCluster.radiusKm} km`} label="Radius" />
                </div>
                <p className="mt-3 text-xs leading-relaxed text-ink-500">{selectedCluster.score.explanation}</p>
                <Link href="/outbreaks" className="mt-3 inline-flex text-xs font-extrabold text-ink-700">Open outbreak analysis →</Link>
              </div>
            )}

            <div className="mt-5 border-t border-sand-200 pt-4">
              <p className="eyebrow">Delivery health</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <MiniMetric value={o.pendingSync} label="Pending sync" />
                <MiniMetric value={openReferrals.length} label="KVK awaiting" />
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.65fr)]">
        <div className="card overflow-hidden">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-sand-200 px-4 py-4 sm:px-5">
            <div>
              <p className="eyebrow">Current case register</p>
              <h2 className="mt-1 text-xl font-extrabold text-ink-950">Latest field activity</h2>
              <p className="mt-1 text-sm text-ink-500">{filtered.length} visible cases after the current map filter.</p>
            </div>
            <Link href="/cases" className="btn-secondary">Open full register</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead><tr><th className="th">Case</th><th className="th">Crop & location</th><th className="th">Decision state</th><th className="th">Last update</th><th className="th" aria-label="Open" /></tr></thead>
              <tbody>
                {latestCases.map((c) => (
                  <tr key={c.id} className="transition hover:bg-sand-50/80">
                    <td className="td"><span className="font-mono text-xs font-extrabold text-ink-950">{c.id}</span><div className="mt-1 text-xs text-ink-400">{c.plotId}</div></td>
                    <td className="td"><div className="font-bold text-ink-900">{cropLabel(c.crop)}</div><div className="text-xs text-ink-500">{c.block}, {c.district}</div></td>
                    <td className="td"><StatusChip state={c.state} /></td>
                    <td className="td text-xs text-ink-500">{fmtDateTime(c.updatedAt)}</td>
                    <td className="td text-right"><Link href={`/cases/${c.id}`} className="text-xs font-extrabold text-ink-700">Review →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card p-4 sm:p-5">
          <p className="eyebrow">Response pipeline</p>
          <h2 className="mt-1 text-xl font-extrabold text-ink-950">From signal to outcome</h2>
          <p className="mt-1 text-sm leading-relaxed text-ink-500">A concise operational chain, not a collection of disconnected features.</p>
          <div className="mt-5 space-y-1">
            <PipelineRow step="01" label="Field signals" value={o.activeCases} note="Open reports with traceable evidence" />
            <PipelineRow step="02" label="Expert decisions" value={o.awaitingExpert} note="Cases awaiting structured review" />
            <PipelineRow step="03" label="Field response" value={activeMissions.length} note="Verification missions in progress" />
            <PipelineRow step="04" label="Measured outcomes" value={o.resolvedOrImproving} note="Cases improving or resolved" last />
          </div>
          <Link href="/digital-twins" className="btn-primary mt-5 w-full">Open Farm Digital Twins</Link>
        </div>
      </section>

      <section className="card mt-6 p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Last-mile support</p>
            <h2 className="mt-1 text-xl font-extrabold text-ink-950">KVK reach across the pilot</h2>
            <p className="mt-1 text-sm text-ink-500">Distance is clearly labelled as estimated because public KVK coordinates are approximate.</p>
          </div>
          <Link href="/support" className="btn-secondary">Open KVK support desk</Link>
        </div>
        <div className="mt-4"><LastMileCoverage /></div>
      </section>

      <p className="mt-5 text-center text-xs leading-relaxed text-ink-400">
        Simulated pilot data · deterministic demo clock · no model-accuracy claim · no government adapter shown as live without verified access.
      </p>
    </div>
  );
}

function BriefMetric({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.055] p-3">
      <p className="text-2xl font-extrabold tracking-tight text-white tabular-nums">{value}</p>
      <p className="mt-1 text-xs font-semibold text-ink-400">{label}</p>
    </div>
  );
}

function MiniMetric({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="rounded-xl border border-sand-200 bg-sand-50 px-2.5 py-2.5 text-center">
      <p className="text-lg font-extrabold tracking-tight text-ink-950 tabular-nums">{value}</p>
      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-400">{label}</p>
    </div>
  );
}

function PipelineRow({ step, label, value, note, last = false }: { step: string; label: string; value: string | number; note: string; last?: boolean }) {
  return (
    <div className="relative flex gap-3 pb-5">
      {!last && <span className="absolute left-[17px] top-9 h-[calc(100%-24px)] w-px bg-sand-300" aria-hidden="true" />}
      <span className="relative z-10 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-900 text-[11px] font-extrabold text-white">{step}</span>
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex items-center justify-between gap-3"><p className="text-sm font-extrabold text-ink-950">{label}</p><p className="text-lg font-extrabold text-ink-950 tabular-nums">{value}</p></div>
        <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{note}</p>
      </div>
    </div>
  );
}

function LastMileCoverage() {
  const state = useDemoStore((s) => s.getState());
  const rows = useMemo(() => {
    const open = state.cases.filter((c) => !["RESOLVED", "CLOSED_DUPLICATE", "CLOSED_UNKNOWN"].includes(c.state));
    const distances = open.map((c) => nearestKvks(c.lat, c.lon, c.district, 1)[0]);
    const max = Math.max(...distances.map((d) => d.distanceKm));
    const pending = state.referrals.filter((r) => r.status !== "CLOSED" && r.status !== "RESPONDED");
    const beyond30 = open.filter((c, i) => distances[i].distanceKm > 30);
    return { max, pending, beyond30 };
  }, [state]);

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <CoverageMetric value={`${rows.max.toFixed(0)} km`} title="Farthest open case" note="Estimated distance to nearest sourced KVK" />
      <CoverageMetric value={rows.beyond30.length} title="Cases beyond 30 km" note="Prioritise assisted follow-up and batching" tone="saffron" />
      <CoverageMetric value={rows.pending.length} title="Awaiting KVK response" note="Simulated delivery state; no false receipt claim" tone="leaf" />
    </div>
  );
}

function CoverageMetric({ value, title, note, tone = "ink" }: { value: string | number; title: string; note: string; tone?: "ink" | "leaf" | "saffron" }) {
  const accent = tone === "leaf" ? "text-leaf-700" : tone === "saffron" ? "text-saffron-700" : "text-ink-950";
  return (
    <div className="rounded-xl border border-sand-200 bg-sand-50/70 p-4">
      <p className={`text-2xl font-extrabold tracking-tight tabular-nums ${accent}`}>{value}</p>
      <p className="mt-1 text-sm font-extrabold text-ink-900">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-ink-500">{note}</p>
    </div>
  );
}
