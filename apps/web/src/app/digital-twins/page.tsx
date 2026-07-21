"use client";
import Link from "next/link";
import { useDemoStore } from "@/lib/store";
import { deriveTwin, TWIN_STATE_META } from "@/lib/twin";
import { DemoBanner } from "@/components/bits";

export default function DigitalTwinsPage() {
  const state = useDemoStore((s) => s.getState());
  const twins = state.plots
    .map((p) => deriveTwin(p.id, state)!)
    .filter(Boolean)
    .sort((a, b) => {
      const order = ["UNRESOLVED", "VERIFIED_ISSUE", "INTERVENTION_ACTIVE", "SUSPECTED_ISSUE", "WATCH", "IMPROVING", "STABLE"];
      return order.indexOf(a.state) - order.indexOf(b.state);
    });

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

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {twins.map((tw) => {
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
