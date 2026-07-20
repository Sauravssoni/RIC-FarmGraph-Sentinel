"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { getStore, useDemoStore } from "@/lib/store";
import { useApp } from "@/lib/app";
import { DemoBanner, SectionTitle, StatusChip } from "@/components/bits";
import { DiagnosisPanel } from "@/components/DiagnosisPanel";
import { EvidenceCard } from "@/components/EvidenceCard";
import { conditionLabel, cropLabel, CONDITIONS } from "@/lib/seed";
import { fmtDateTime, hoursBetween } from "@/lib/format";
import type { ReviewDecision } from "@contracts";

export default function ExpertQueue() {
  const app = useApp();
  const store = getStore();
  const queue = useDemoStore((s) => s.expertQueue());
  const advisories = useDemoStore((s) => s.getState().advisories);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [decision, setDecision] = useState<ReviewDecision>("confirm");
  const [conditionId, setConditionId] = useState("downy_mildew");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const selected = useMemo(
    () => queue.find((q) => q.case.id === selectedId) ?? queue[0] ?? null,
    [queue, selectedId],
  );
  const demoNow = useDemoStore((s) => s.getState().meta.demoNow);

  if (app.persona.role === "farmer") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-center">
        <h1 className="text-xl font-extrabold">Expert verification queue</h1>
        <p className="mt-2 text-sm text-ink-600">Switch to the <span className="font-bold">Expert — KVK persona (demo)</span> in the header to review cases. The farmer persona never sees this queue (role separation).</p>
      </div>
    );
  }

  const submit = () => {
    if (!selected) return;
    if (note.trim().length < 3) { setMsg("A structured note is required — no one-click approvals."); return; }
    store.review(selected.case.id, { decision, conditionId: decision === "confirm" || decision === "correct" ? conditionId : undefined, note: note.trim(), reviewer: app.persona.label });
    setMsg(`Recorded: ${decision} on ${selected.case.id}. Timeline updated.`);
    setNote("");
  };

  const c = selected?.case;
  const compatible = c ? store.nearbyCompatible(c) : [];
  const approvedAdv = c?.expertConfirmedCondition
    ? advisories.filter((a) => a.conditionId === c.expertConfirmedCondition && a.status === "APPROVED")
    : [];

  return (
    <div className="mx-auto max-w-[1440px] px-3 py-4 sm:px-5">
      <SectionTitle title="Expert verification queue" sub="Prioritised by documented policy: spread risk, abstentions, low lead scores. Never a one-click approve-all." />
      <div className="mb-3"><DemoBanner /></div>
      {msg && <div className="mb-3 rounded-lg border border-leaf-600/40 bg-leaf-50 px-3 py-2 text-sm font-semibold text-leaf-700" role="status">{msg}</div>}

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="min-w-0 lg:col-span-2">
          <div className="card divide-y divide-sand-200">
            {queue.length === 0 && <div className="p-6 text-center text-sm text-ink-500">Queue is clear. 🎉 (demo)</div>}
            {queue.map((q) => (
              <button
                key={q.case.id}
                type="button"
                onClick={() => setSelectedId(q.case.id)}
                className={`block w-full px-4 py-3 text-left hover:bg-sand-50 ${selected?.case.id === q.case.id ? "bg-saffron-50 border-l-4 border-saffron-500" : ""}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-extrabold text-ink-900">{q.case.id}</span>
                  <span className="chip bg-saffron-100 text-saffron-700 border-saffron-500/40">◆ priority {q.priorityScore}</span>
                </div>
                <div className="mt-0.5 text-xs text-ink-600">{cropLabel(q.case.crop)} · {q.case.cropStage} · {q.case.block}, {q.case.district}</div>
                <div className="mt-1 text-xs text-saffron-700 font-semibold">{q.priorityReason}</div>
                <div className="mt-1 text-xs text-ink-400">waiting {hoursBetween(q.case.updatedAt, demoNow)}h · SLA 24h</div>
              </button>
            ))}
          </div>
        </div>

        <div className="min-w-0 lg:col-span-3">
          {!c ? null : (
            <div className="space-y-4">
              <section className="card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-extrabold">{c.id}</h3>
                  <StatusChip state={c.state} />
                  <Link href={`/cases/${c.id}`} className="text-xs font-bold text-ink-600 underline">Full case →</Link>
                </div>
                <p className="mt-1 text-sm text-ink-600">{cropLabel(c.crop)} · {c.cropStage} · {c.block}, {c.district} · evidence {c.observations.length} capture set(s), coverage {c.observations.at(-1) ? `${(c.observations.at(-1)!.quality.coverageScore * 100).toFixed(0)}%` : "—"}</p>
                {c.pendingSync && <p className="mt-1 text-xs font-bold text-saffron-700">◔ Sync pending — evidence received via simulated connectivity window.</p>}
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {c.observations.map((o) => <EvidenceCard key={o.id} obs={o} />)}
                </div>
              </section>

              {c.diagnosis && <DiagnosisPanel d={c.diagnosis} />}

              <section className="card p-4">
                <h4 className="text-sm font-extrabold text-ink-900">Nearby compatible cases</h4>
                <ul className="mt-1.5 space-y-1 text-sm">
                  {compatible.map((n) => (
                    <li key={n.id} className="flex items-center justify-between">
                      <Link href={`/cases/${n.id}`} className="font-bold underline">{n.id}</Link>
                      <span className="text-xs text-ink-500">{n.block} · {n.expertConfirmedCondition ? `verified ${conditionLabel(n.expertConfirmedCondition)}` : "unverified"}</span>
                    </li>
                  ))}
                </ul>
                <h4 className="mt-3 text-sm font-extrabold text-ink-900">Farmer-safe immediate action shown</h4>
                <p className="text-sm text-ink-600">Non-chemical guidance only; chemical recommendations stay locked. Advisory approval status: {approvedAdv.length > 0 ? `approved content exists (${approvedAdv[0].id})` : "no approved advisory for this condition yet"}.</p>
              </section>

              <section className="card border-saffron-500/50 p-4">
                <h4 className="text-base font-extrabold text-ink-900">Structured review</h4>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5" role="radiogroup" aria-label="Decision">
                  {(["confirm", "correct", "unknown", "field_visit", "recapture"] as ReviewDecision[]).map((d) => (
                    <label key={d} className={`flex min-h-[44px] cursor-pointer items-center justify-center rounded-lg border px-2 text-center text-xs font-bold ${decision === d ? "border-ink-900 bg-ink-900 text-sand-50" : "border-sand-300"}`}>
                      <input type="radio" className="sr-only" name="decision" checked={decision === d} onChange={() => setDecision(d)} />
                      {d === "confirm" ? "✓ Confirm" : d === "correct" ? "✓↺ Correct" : d === "unknown" ? "? Unknown" : d === "field_visit" ? "▲ Field visit" : "↻ Recapture"}
                    </label>
                  ))}
                </div>
                {(decision === "confirm" || decision === "correct") && (
                  <label className="label mt-3">Condition
                    <select className="input mt-1 text-sm" value={conditionId} onChange={(e) => setConditionId(e.target.value)}>
                      {[...new Set([c.diagnosis?.candidates[0]?.conditionId ?? "downy_mildew", ...Object.keys(CONDITIONS)])].map((cid) => (
                        <option key={cid} value={cid}>{conditionLabel(cid)}</option>
                      ))}
                    </select>
                  </label>
                )}
                <label className="label mt-3">Structured note <span className="text-alert-700">*</span>
                  <textarea className="input mt-1 min-h-[72px] text-sm" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Evidence-based reasoning (required)" />
                </label>
                <button type="button" className="btn-green mt-3 w-full" onClick={submit}>Record decision</button>
                <p className="mt-2 text-xs text-ink-500">Each decision appends an immutable audit event. “Unknown” is a valid outcome — cases are never forced into a known label.</p>
              </section>

              <section className="card p-4">
                <h4 className="text-sm font-extrabold text-ink-900">Audit history</h4>
                <ul className="mt-1.5 space-y-1 text-xs text-ink-600">
                  {[...c.timeline].slice(-6).map((e) => (
                    <li key={e.id}><span className="text-ink-400">{fmtDateTime(e.at)}</span> — {e.summary}</li>
                  ))}
                </ul>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
