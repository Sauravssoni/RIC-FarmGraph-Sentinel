"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useDemoStore } from "@/lib/store";
import { useApp } from "@/lib/app";
import { DemoBanner, KpiCard, SectionTitle, StatusChip } from "@/components/bits";
import { FilterBar, DEFAULT_FILTERS, type CaseFilters } from "@/components/FilterBar";
import { MapView } from "@/components/MapView";
import { CROPS } from "@/lib/seed";
import { fmtDateTime, STATE_META } from "@/lib/format";
import { cropLabel } from "@/lib/seed";
import { nearestKvks } from "@/lib/kvk";

export default function CommandCentre() {
  const app = useApp();
  const [filters, setFilters] = useState<CaseFilters>(DEFAULT_FILTERS);
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);

  const data = useDemoStore((s) => ({
    overview: s.overview(),
    cases: s.getState().cases,
    clusters: s.clustersWithScores(),
    queue: s.expertQueue(),
    missions: s.getState().missions,
    audit: s.getState().auditEvents,
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

  const alerts = useMemo(() => {
    const interesting = new Set(["escalated_to_expert", "cluster_updated", "follow_up_recorded", "expert_marked_unknown", "expert_corrected", "quality_failed"]);
    return [...data.audit].filter((e) => interesting.has(e.type)).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6);
  }, [data.audit]);

  const trend = useMemo(() => {
    // Weekly counts of positive follow-ups / resolutions over the 8 weeks up to demoNow (deterministic from seed).
    const end = new Date(data.demoNow).getTime();
    const weeks = Array.from({ length: 8 }, (_, i) => ({ start: end - (8 - i) * 7 * 864e5, count: 0 }));
    for (const c of data.cases) {
      for (const fu of c.followUps) {
        if (fu.status === "improving" || fu.status === "resolved") {
          const t = new Date(fu.at).getTime();
          const idx = weeks.findIndex((w, i) => t >= w.start && (i === weeks.length - 1 || t < weeks[i + 1].start));
          if (idx >= 0) weeks[idx].count += 1;
        }
      }
    }
    return weeks;
  }, [data.cases, data.demoNow]);

  const maxTrend = Math.max(1, ...trend.map((w) => w.count));
  const o = data.overview;

  return (
    <div className="mx-auto max-w-[1440px] px-3 py-4 sm:px-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-950">District crop-health command centre</h1>
          <p className="mt-0.5 text-sm text-ink-500">
            Pilot: Jodhpur · Nagaur · Jalore — kharif 2026 watch. Data as of {fmtDateTime(data.demoNow)} (frozen demo clock).
          </p>
        </div>
        <div className="text-right text-xs text-ink-500">
          <div>Provider: <span className="font-bold text-ink-700">{app.apiMode === "api-connected" ? "HTTP API (reads) + demo engine" : "Demo provider (browser)"}</span></div>
          <div>Rendered {fmtDateTime(o.generatedAt)}</div>
        </div>
      </div>

      <div className="mt-3"><DemoBanner /></div>

      <div className="mt-3">
        <FilterBar filters={filters} onChange={setFilters} crops={CROPS.map((c) => c.id)} districts={districts} states={states} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <KpiCard title="Active cases" value={o.activeCases} href={`/cases?open=1`} sub="excluding resolved/closed" />
        <KpiCard title="Awaiting expert" value={o.awaitingExpert} tone="saffron" href={`/cases?state=AWAITING_EXPERT`} sub={`SLA 24h`} />
        <KpiCard title="High priority" value={o.highPriority} tone="alert" href={`/cases?priority=high`} sub="spread-risk / escalations" />
        <KpiCard title="Suspected clusters" value={o.suspectedClusters} tone="saffron" href="/outbreaks" sub="incl. verified outbreak" />
        <KpiCard title="Report→review" value={o.medianReportToReviewHours === null ? "—" : `${o.medianReportToReviewHours}h`} sub="median, demo data" />
        <KpiCard title="Pending sync" value={o.pendingSync} tone={o.pendingSync > 0 ? "saffron" : "ink"} href={`/cases?sync=pending`} sub="offline reports" />
        <KpiCard title="Follow-up done" value={`${o.followUpCompletionPct}%`} sub="of advised cases" />
        <KpiCard title="Resolved/improving" value={o.resolvedOrImproving} tone="leaf" href={`/cases?state=RESOLVED`} sub="outcomes tracked" />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <SectionTitle
            title="Pilot geospatial view"
            sub="Real coordinates; simplified Rajasthan outline (Natural Earth, public domain). Clusters keep uncertainty visible."
          />
          <MapView cases={filtered} clusters={data.clusters} selectedCluster={selectedCluster} onSelectCluster={setSelectedCluster} />
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {data.clusters.map((cl) => (
              <button
                key={cl.id}
                type="button"
                onClick={() => setSelectedCluster(cl.id)}
                className={`card p-2.5 text-left hover:shadow-lift ${selectedCluster === cl.id ? "ring-2 ring-ink-900" : ""}`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-sm font-extrabold text-ink-900">{cl.id}</span>
                  <span className={`chip ${cl.status === "VERIFIED" ? "bg-alert-100 text-alert-700 border-alert-600/40" : cl.status === "DISMISSED" ? "bg-sand-200 text-slate2 border-sand-300" : "bg-saffron-100 text-saffron-700 border-saffron-500/40"}`}>
                    {cl.status}
                  </span>
                </div>
                <div className="mt-0.5 truncate text-xs text-ink-600">{cl.name}</div>
                <div className="mt-1 text-xs font-bold tabular-nums">score {cl.score.score} · {cl.score.verifiedCount}/{cl.score.memberCount} verified</div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <section className="card p-4">
            <SectionTitle title="Recent alerts" sub="from the audit stream" />
            <ul className="space-y-2.5">
              {alerts.map((e) => (
                <li key={e.id + (e.caseId ?? "")} className="text-sm">
                  <span className="text-xs text-ink-400">{fmtDateTime(e.at)}</span>
                  <div className="text-ink-800">{e.summary}</div>
                  {e.caseId && <Link href={`/cases/${e.caseId}`} className="text-xs font-bold text-ink-600 underline">{e.caseId}</Link>}
                </li>
              ))}
            </ul>
          </section>

          <section className="card p-4">
            <SectionTitle title="Urgent expert queue" sub={`${data.queue.length} cases waiting`} right={<Link href="/expert" className="text-xs font-bold text-ink-700 underline">Open queue →</Link>} />
            <ul className="space-y-2">
              {data.queue.slice(0, 5).map((q) => (
                <li key={q.case.id} className="flex items-center justify-between gap-2 rounded-lg border border-sand-200 px-2.5 py-2">
                  <div>
                    <Link href={`/cases/${q.case.id}`} className="text-sm font-bold text-ink-900 underline">{q.case.id}</Link>
                    <div className="text-xs text-ink-500">{cropLabel(q.case.crop)} · {q.case.block}</div>
                  </div>
                  <span className="chip bg-saffron-100 text-saffron-700 border-saffron-500/40" title={q.priorityReason}>◆ {q.priorityScore}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <section className="card min-w-0 p-4 lg:col-span-2">
          <SectionTitle title="Filtered case register" sub={`${filtered.length} of ${data.cases.length} cases`} right={<Link href="/cases" className="text-xs font-bold text-ink-700 underline">Full register →</Link>} />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead><tr className="bg-sand-100"><th className="th">Case</th><th className="th">Crop</th><th className="th">Block</th><th className="th">Status</th><th className="th">Updated</th></tr></thead>
              <tbody>
                {[...filtered].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 8).map((c) => (
                  <tr key={c.id} className="hover:bg-sand-50">
                    <td className="td"><Link href={`/cases/${c.id}`} className="font-bold underline">{c.id}</Link></td>
                    <td className="td">{cropLabel(c.crop)}</td>
                    <td className="td">{c.block}</td>
                    <td className="td"><StatusChip state={c.state} /></td>
                    <td className="td text-xs text-ink-500">{fmtDateTime(c.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="space-y-4">
          <section className="card p-4">
            <SectionTitle title="Outcome trend" sub="improving/resolved follow-ups per week (demo data)" />
            <svg viewBox="0 0 240 90" className="w-full" role="img" aria-label="Weekly positive outcomes bar chart">
              {trend.map((w, i) => (
                <g key={i}>
                  <rect x={10 + i * 28} y={80 - (w.count / maxTrend) * 62} width="20" height={(w.count / maxTrend) * 62} fill="#2f7d3a" rx="2" />
                  <text x={20 + i * 28} y="89" fontSize="8" textAnchor="middle" fill="#5a6c90">W{i + 1}</text>
                  <text x={20 + i * 28} y={76 - (w.count / maxTrend) * 62} fontSize="9" fontWeight="700" textAnchor="middle" fill="#17233b">{w.count || ""}</text>
                </g>
              ))}
            </svg>
          </section>
          <section className="card p-4">
            <SectionTitle title="Mission status" sub="field verification" right={<Link href="/missions" className="text-xs font-bold text-ink-700 underline">All missions →</Link>} />
            <ul className="space-y-2">
              {data.missions.slice(0, 3).map((m) => (
                <li key={m.id} className="rounded-lg border border-sand-200 px-2.5 py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{m.id}</span>
                    <span className={`chip ${m.status === "COMPLETED" ? "bg-leaf-100 text-leaf-700 border-leaf-600/40" : m.status === "IN_PROGRESS" ? "bg-saffron-100 text-saffron-700 border-saffron-500/40" : "bg-ink-800/10 text-ink-800 border-ink-800/20"}`}>{m.status}</span>
                  </div>
                  <div className="text-xs text-ink-600">{m.purpose}</div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <section className="card mt-4 p-4">
        <SectionTitle title="Last-mile expert coverage" sub="KVK support-point reach across pilot cases (directory from official ICAR-ATARI sources)" right={<Link href="/support" className="text-xs font-bold text-ink-700 underline">KVK directory →</Link>} />
        <LastMileCoverage />
      </section>

      <p className="mt-4 text-xs text-ink-500">
        State semantics: suspected (AI-triaged, unverified) → expert-confirmed/corrected → advisory → follow-up → outcome.
        Every card drills into underlying cases. All values are demo data. {STATE_META.AWAITING_EXPERT.label} cases are prioritised by documented policy, not by model certainty alone.
      </p>
    </div>
  );
}

/** Last-mile KVK coverage across pilot cases (estimated distances, labelled). */
function LastMileCoverage() {
  const state = useDemoStore((s) => s.getState());
  const rows = useMemo(() => {
    const open = state.cases.filter((c) => !["RESOLVED", "CLOSED_DUPLICATE", "CLOSED_UNKNOWN"].includes(c.state));
    const distances = open.map((c) => nearestKvks(c.lat, c.lon, c.district, 1)[0]);
    const max = Math.max(...distances.map((d) => d.distanceKm));
    const pending = state.referrals.filter((r) => r.status !== "CLOSED" && r.status !== "RESPONDED");
    const beyond30 = open.filter((c, i) => distances[i].distanceKm > 30);
    return { openCount: open.length, max, pending, beyond30, distances, open };
  }, [state]);

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-lg border border-sand-300 bg-sand-50 p-3">
        <p className="text-2xl font-extrabold tabular-nums">{rows.max.toFixed(0)} km</p>
        <p className="text-xs text-ink-600">Farthest open case from its nearest KVK (estimated, coords approximate)</p>
      </div>
      <div className="rounded-lg border border-sand-300 bg-sand-50 p-3">
        <p className="text-2xl font-extrabold tabular-nums">{rows.beyond30.length}</p>
        <p className="text-xs text-ink-600">Open cases &gt;30 km from a KVK — prioritise for assisted follow-up</p>
        {rows.beyond30.slice(0, 3).map((c) => (
          <p key={c.id} className="mt-1 text-xs"><Link className="font-mono font-bold underline" href={`/cases/${c.id}/`}>{c.id}</Link> {c.district}</p>
        ))}
      </div>
      <div className="rounded-lg border border-sand-300 bg-sand-50 p-3">
        <p className="text-2xl font-extrabold tabular-nums">{rows.pending.length}</p>
        <p className="text-xs text-ink-600">Referrals awaiting KVK response (simulated delivery)</p>
      </div>
    </div>
  );
}
