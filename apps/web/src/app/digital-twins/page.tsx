"use client";
import Link from "next/link";
import { useState } from "react";
import { useDemoStore } from "@/lib/store";
import { deriveTwin, TWIN_STATE_META } from "@/lib/twin";
import { DemoBanner } from "@/components/bits";

export default function DigitalTwinsPage() {
  const [district, setDistrict] = useState("All districts");
  const [status, setStatus] = useState("All states");
  const state = useDemoStore((s) => s.getState());
  const twins = state.plots
    .map((p) => deriveTwin(p.id, state)!)
    .filter(Boolean)
    .sort((a, b) => {
      const order = ["UNRESOLVED", "VERIFIED_ISSUE", "INTERVENTION_ACTIVE", "SUSPECTED_ISSUE", "WATCH", "IMPROVING", "STABLE"];
      return order.indexOf(a.state) - order.indexOf(b.state);
    });

  const districts = Array.from(new Set(twins.map((t) => t.plot.district))).sort();
  const states = Array.from(new Set(twins.map((t) => t.state)));
  const visible = twins.filter((t) => (district === "All districts" || t.plot.district === district) && (status === "All states" || t.state === status));

  return (
    <main className="mx-auto max-w-7xl px-3 py-4 sm:px-5">
      <DemoBanner />
      <div className="mt-2 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-ink-950">Farm Digital Twins</h1>
          <p className="text-sm text-ink-600">Versioned operational representation of every pilot plot — derived live from cases, clusters, missions and advisories. All demo plots are pseudonymous and simulated.</p>
        </div>
        <span className="text-xs font-bold text-ink-500">{twins.length} plots · 3 districts</span>
      </div>

      <section className="mt-4 rounded-2xl border border-sand-200 bg-white p-4 sm:p-5" aria-label="Pilot execution contract">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Prototype today · Proposed 90-day pilot</p>
            <h2 className="mt-1 text-lg font-extrabold text-ink-950">From a plot record to a living crop-health twin</h2>
            <p className="mt-1 max-w-3xl text-sm text-ink-600">The twin links plot, crop season, evidence, expert decisions and follow-up. The pilot will populate this same workflow using consented field observations and authorised government references. No real plots are enrolled in this demo.</p>
          </div>
          <Link href="/demo/" className="btn-primary">Run five-act proof</Link>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [String(twins.length), "Simulated plot twins now"],
            ["Up to 1,500", "Proposed farms / plots"],
            ["6 blocks · 30 villages", "Jodhpur, Nagaur, Jalore"],
            ["₹48.60 lakh", "Indicative 90-day pilot"],
          ].map(([value, label]) => <div key={label} className="rounded-xl border border-sand-200 bg-sand-50 p-3"><p className="text-lg font-extrabold text-ink-950">{value}</p><p className="mt-1 text-xs text-ink-600">{label}</p></div>)}
        </div>
        <ol className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4" aria-label="Proposed twin creation stages">
          {[
            ["01 · Enrol", "Consent, plot reference, crop/stage and baseline; no duplicate government registry."],
            ["02 · Observe", "Shared Android devices, repeat visits, offline photos and farmer voice notes."],
            ["03 · Verify", "Six proposed agronomy reviewers; labels, uncertainty and reviewed advice."],
            ["04 · Learn", "Follow-up, farm-grouped holdout, model card and Department approval before promotion."],
          ].map(([title, body]) => <li key={title} className="rounded-xl border border-sand-200 p-3"><p className="text-xs font-extrabold text-leaf-700">{title}</p><p className="mt-1 text-xs leading-relaxed text-ink-600">{body}</p></li>)}
        </ol>
        <p className="mt-3 text-xs text-ink-600">Planned hardware: 12 shared Android devices or approved reuse, power banks, protective kits and connectivity. Drones and permanent sensors are optional later scope, not included in the initial procurement. Budget and field staffing are subject to approval.</p>
      </section>
      <section className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-sand-200 bg-white p-3" aria-label="Filter digital twins">
        <label className="text-xs font-bold text-ink-700">District
          <select value={district} onChange={(e) => setDistrict(e.target.value)} className="mt-1 block min-h-[44px] rounded-lg border border-sand-300 bg-white px-3 text-sm text-ink-950">
            <option>All districts</option>{districts.map((d) => <option key={d}>{d}</option>)}
          </select>
        </label>
        <label className="text-xs font-bold text-ink-700">Twin state
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 block min-h-[44px] rounded-lg border border-sand-300 bg-white px-3 text-sm text-ink-950">
            <option>All states</option>{states.map((s) => <option key={s} value={s}>{TWIN_STATE_META[s].label}</option>)}
          </select>
        </label>
        <button type="button" className="btn-secondary" onClick={() => { setDistrict("All districts"); setStatus("All states"); }}>Clear filters</button>
        <p className="py-2 text-sm font-bold text-ink-700" role="status">{visible.length} of {twins.length} simulated twins shown</p>
      </section>
      {visible.length === 0 && <p className="mt-4 rounded-xl border border-sand-200 bg-white p-4 text-sm text-ink-600">No simulated twins match these filters. Clear filters to restore all plots.</p>}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((tw) => {
          const meta = TWIN_STATE_META[tw.state];
          return (
            <Link key={tw.plot.id} href={`/digital-twins/${tw.plot.id}/`} className="card block p-4 transition hover:border-ink-800/30">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs text-ink-500">{tw.plot.id}</span>
                <span className={`chip ${meta.cls}`}><span aria-hidden>{meta.glyph}</span> {meta.label}</span>
              </div>
              <p className="mt-1.5 text-sm font-bold text-ink-900">
                {tw.season ? `${tw.season.crop} · ${tw.season.stage}` : "no active season"} — {tw.plot.district}, {tw.plot.block}
              </p>
              <p className="mt-0.5 line-clamp-2 text-xs text-ink-600">{tw.stateReason}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-ink-500">
                <span>{tw.cases.length} case(s)</span>
                {tw.cluster && <span>cluster {tw.cluster.cluster.id} · {tw.cluster.score.score}</span>}
                {tw.missions.length > 0 && <span>{tw.missions.length} mission(s)</span>}
                <span>{tw.plot.areaAcres} acres</span>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
