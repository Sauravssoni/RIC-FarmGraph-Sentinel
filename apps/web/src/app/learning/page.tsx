"use client";
import Link from "next/link";
import { useMemo } from "react";
import { useDemoStore } from "@/lib/store";
import { DemoBanner } from "@/components/bits";
import { fmtDateTime } from "@/lib/format";
import pixfeat from "@data/models/pixfeat-v0.json";

function Bar({ label, count, max, note }: { label: string; count: number; max: number; note?: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-44 truncate font-semibold text-ink-700">{label}</span>
      <div className="h-3 flex-1 rounded-full bg-sand-200">
        <div className="h-3 rounded-full bg-ink-700" style={{ width: `${max ? (count / max) * 100 : 0}%` }} />
      </div>
      <span className="w-8 text-right tabular-nums font-bold">{count}</span>
      {note && <span className="text-[10px] text-ink-400">{note}</span>}
    </div>
  );
}

export default function LearningPage() {
  const state = useDemoStore((s) => s.getState());
  const stats = useMemo(() => {
    const recs = state.learningRecords;
    const by = (fn: (r: (typeof recs)[number]) => string) => {
      const m = new Map<string, number>();
      for (const r of recs) m.set(fn(r), (m.get(fn(r)) ?? 0) + 1);
      return [...m.entries()].sort((a, b) => b[1] - a[1]);
    };
    return {
      total: recs.length,
      corrections: recs.filter((r) => r.reviewAction === "correct").length,
      unknowns: recs.filter((r) => r.reviewAction === "unknown").length,
      byLabel: by((r) => r.expertLabel),
      byCrop: by((r) => r.crop),
      byDistrict: by((r) => r.district),
      maxLabel: Math.max(1, ...by((r) => r.expertLabel).map(([, n]) => n)),
      maxCrop: Math.max(1, ...by((r) => r.crop).map(([, n]) => n)),
      maxDistrict: Math.max(1, ...by((r) => r.district).map(([, n]) => n)),
    };
  }, [state]);

  return (
    <main className="mx-auto max-w-6xl px-3 py-4 sm:px-5">
      <DemoBanner />
      <div className="mt-2">
        <h1 className="text-xl font-extrabold tracking-tight text-ink-950">Learning flywheel</h1>
        <p className="max-w-3xl text-sm text-ink-600">
          Every expert confirmation, correction and unknown-decision on evidence becomes a
          <span className="font-bold"> learning record with provenance</span> — the raw material for a future, properly
          evaluated model. Records are <span className="font-bold">not</span> auto-trained on; a training run only consumes
          records after dataset review (Task 002+ evaluation harness).
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="card p-4"><p className="text-3xl font-extrabold tabular-nums">{stats.total}</p><p className="text-xs text-ink-600">learning records (expert-verified reviews)</p></div>
        <div className="card p-4"><p className="text-3xl font-extrabold tabular-nums">{stats.corrections}</p><p className="text-xs text-ink-600">corrections — highest-value training signal (ai → expert deltas)</p></div>
        <div className="card p-4"><p className="text-3xl font-extrabold tabular-nums">{stats.unknowns}</p><p className="text-xs text-ink-600">honest unknowns — guard against confident mislabelling</p></div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <section className="card p-4">
          <h2 className="text-base font-extrabold text-ink-900">Class balance</h2>
          <div className="mt-2 space-y-1.5">
            {stats.byLabel.map(([l, n]) => <Bar key={l} label={l} count={n} max={stats.maxLabel} />)}
            {stats.total === 0 && <p className="text-xs text-ink-500">No records yet — review cases in the expert queue to generate them.</p>}
          </div>
        </section>
        <section className="card p-4">
          <h2 className="text-base font-extrabold text-ink-900">Crop coverage</h2>
          <div className="mt-2 space-y-1.5">{stats.byCrop.map(([l, n]) => <Bar key={l} label={l} count={n} max={stats.maxCrop} />)}</div>
        </section>
        <section className="card p-4">
          <h2 className="text-base font-extrabold text-ink-900">District coverage</h2>
          <div className="mt-2 space-y-1.5">{stats.byDistrict.map(([l, n]) => <Bar key={l} label={l} count={n} max={stats.maxDistrict} />)}</div>
        </section>
      </div>

      <section className="card mt-4 p-4">
        <h2 className="text-base font-extrabold text-ink-900">Model lifecycle</h2>
        <div className="mt-2 overflow-x-auto">
          <table className="min-w-[640px] w-full text-sm">
            <thead><tr className="text-left text-xs uppercase tracking-wide text-ink-500">
              <th className="th">Model</th><th className="th">Kind</th><th className="th">Lifecycle</th><th className="th">Training data</th><th className="th">Honest note</th>
            </tr></thead>
            <tbody>
              <tr className="border-t border-sand-300">
                <td className="td font-mono">{pixfeat.id} v{pixfeat.version}</td>
                <td className="td">classical-CV pixel scorer</td>
                <td className="td"><span className="chip bg-leaf-100 text-leaf-800">CHAMPION (research preview)</span></td>
                <td className="td">hand-set weights — no training data consumed</td>
                <td className="td">not a trained NN; no accuracy measured; uncalibrated</td>
              </tr>
              <tr className="border-t border-sand-300">
                <td className="td font-mono">mobilenetv2-7 (ImageNet)</td>
                <td className="td">deep CNN (bundled ONNX)</td>
                <td className="td"><span className="chip bg-ink-800/10 text-ink-800">REGISTERED — screening role only</span></td>
                <td className="td">pretrained ImageNet (external, Apache-2.0)</td>
                <td className="td">out-of-distribution screening only — NOT a crop-disease classifier</td>
              </tr>
              <tr className="border-t border-sand-300">
                <td className="td font-mono">fieldnet-bajra-v0</td>
                <td className="td">planned on-device classifier</td>
                <td className="td"><span className="chip bg-saffron-100 text-saffron-800">CANDIDATE — evaluation required</span></td>
                <td className="td">learning records + licensed datasets (pending review)</td>
                <td className="td">activates only after the evaluation harness passes</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="card mt-4 p-4">
        <h2 className="text-base font-extrabold text-ink-900">Learning records</h2>
        <ul className="mt-2 space-y-1.5 text-xs">
          {state.learningRecords.slice(-12).reverse().map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-sand-300 px-3 py-2">
              <span><span className="font-bold">{r.id}</span> · <Link className="font-mono font-bold underline" href={`/cases/${r.caseId}/`}>{r.caseId}</Link> · {r.crop} · {r.district}</span>
              <span className="font-semibold">ai: {r.aiLabel ?? "—"} → expert: {r.expertLabel}</span>
              <span className="text-ink-500">{fmtDateTime(r.createdAt)}</span>
            </li>
          ))}
          {state.learningRecords.length === 0 && <li className="text-ink-500">Empty — deterministic demo seed ships with zero records so judges can watch the flywheel spin up live.</li>}
        </ul>
      </section>
    </main>
  );
}
