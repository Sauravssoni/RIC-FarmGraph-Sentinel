"use client";

import { useState } from "react";
import Link from "next/link";
import { getStore, useDemoStore } from "@/lib/store";
import { DemoBanner, SectionTitle, StatusChip } from "@/components/bits";
import { MapView } from "@/components/MapView";
import { conditionLabel, cropLabel } from "@/lib/seed";
import { fmtDateTime } from "@/lib/format";
import { representativeOrder } from "@/lib/engine";

const STATUS_CLS: Record<string, string> = {
  VERIFIED: "bg-alert-100 text-alert-700 border-alert-600/40",
  SUSPECTED: "bg-saffron-100 text-saffron-700 border-saffron-500/40",
  WATCH: "bg-ink-800/10 text-ink-800 border-ink-800/20",
  DISMISSED: "bg-sand-200 text-slate2 border-sand-300",
};

export default function Outbreaks() {
  const store = getStore();
  const clusters = useDemoStore((s) => s.clustersWithScores());
  const cases = useDemoStore((s) => s.getState().cases);
  const missions = useDemoStore((s) => s.getState().missions);
  const [msg, setMsg] = useState<string | null>(null);

  const generate = (clusterId: string) => {
    const r = store.generateMission(clusterId);
    setMsg("error" in r ? r.error : `Mission ${r.id} generated with ${r.representativeCaseIds.length} representative farms (deterministic ordering).`);
  };

  return (
    <div className="mx-auto max-w-[1440px] px-3 py-4 sm:px-5">
      <SectionTitle
        title="Outbreak intelligence"
        sub="Explainable scoring from demo signals — verified cases, density, growth, compatibility, weather placeholder, severity, duplicate penalty."
      />
      <div className="mb-3"><DemoBanner text="Demo data — estimated acreage and weather suitability are simulated placeholders, not government data." /></div>
      {msg && <div className="mb-3 rounded-lg border border-leaf-600/40 bg-leaf-50 px-3 py-2 text-sm font-semibold text-leaf-700" role="status">{msg}</div>}

      <MapView cases={cases} clusters={clusters} height={360} />

      {/* accessibility fallback: list view of the same data */}
      <details className="mt-2 card p-3 text-sm">
        <summary className="cursor-pointer font-bold">Text alternative: clusters and cases</summary>
        <ul className="mt-2 space-y-1">
          {clusters.map((cl) => (
            <li key={cl.id}>{cl.id} {cl.name}: score {cl.score.score}, status {cl.status}, members {cl.memberCaseIds.join(", ")}</li>
          ))}
        </ul>
      </details>

      <div className="mt-4 space-y-4">
        {clusters.map((cl) => {
          const members = cases.filter((c) => cl.memberCaseIds.includes(c.id));
          const activeMembers = members.filter((c) => c.state !== "CLOSED_DUPLICATE");
          const acres = activeMembers.reduce((a, c) => a + c.areaAcres, 0);
          const reps = representativeOrder(cl, cases, 3);
          const openMission = missions.find((m) => m.clusterId === cl.id && m.status !== "COMPLETED");
          const missing: string[] = [];
          if (activeMembers.some((c) => !c.expertConfirmedCondition)) missing.push("expert verification pending on some members");
          if (activeMembers.some((c) => c.observations.some((o) => !o.checklist.lowerLeaf))) missing.push("lower-leaf-surface evidence incomplete");
          missing.push("block-level weather feed (adapter CONTRACT_DEFINED, currently fixed placeholder)");
          return (
            <section key={cl.id} className="card p-4" aria-label={`Cluster ${cl.id}`}>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-extrabold text-ink-950">{cl.id} — {cl.name}</h3>
                <span className={`chip ${STATUS_CLS[cl.status]}`}>{cl.status}</span>
                <span className="chip bg-sand-200 text-ink-600 border-sand-300">⬡ Simulated</span>
              </div>
              <p className="mt-1 text-sm text-ink-600">
                {cropLabel(cl.crop)} · {conditionLabel(cl.conditionId)} · {activeMembers.length} case(s), {cl.score.verifiedCount} verified ·
                estimated demo acreage exposed ≈ {acres.toFixed(1)} acres (simulated estimate) · officer {cl.assignedOfficer} · SLA {cl.slaHours}h
              </p>
              {cl.status === "DISMISSED" && (
                <p className="mt-2 rounded-lg border border-sand-300 bg-sand-100 px-3 py-2 text-sm text-ink-700">
                  Dismissed {cl.dismissedAt ? fmtDateTime(cl.dismissedAt) : ""} by {cl.dismissedBy}: {cl.dismissedReason}
                </p>
              )}

              <div className="mt-3 grid gap-4 lg:grid-cols-2">
                <div>
                  <h4 className="text-sm font-extrabold">How the score is formed</h4>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold tabular-nums text-ink-900">{cl.score.score}</span>
                    <span className="text-xs text-ink-500">/ 100 — thresholds: ≥70 verified, ≥40 suspected</span>
                  </div>
                  <ul className="mt-2 space-y-1.5">
                    {Object.entries(cl.score.weights).map(([k, w]) => {
                      const v = cl.score.components[k];
                      return (
                        <li key={k} className="text-xs">
                          <div className="flex justify-between"><span className="font-semibold">{k} <span className="text-ink-400">(weight {w})</span></span><span className="tabular-nums">{v}</span></div>
                          <div className="mt-0.5 h-1.5 rounded-full bg-sand-200"><div className="h-1.5 rounded-full bg-ink-700" style={{ width: `${v * 100}%` }} /></div>
                        </li>
                      );
                    })}
                    <li className="text-xs">
                      <div className="flex justify-between"><span className="font-semibold text-alert-700">duplicate/evidence penalty</span><span className="tabular-nums">−{cl.score.duplicatePenalty}</span></div>
                    </li>
                  </ul>
                  <p className="mt-2 rounded-lg bg-sand-100 px-2.5 py-1.5 text-xs text-ink-700">{cl.score.explanation}</p>
                  <p className="mt-1 text-xs text-ink-500">{cl.note}</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-extrabold">Member cases</h4>
                    <ul className="mt-1.5 space-y-1.5">
                      {members.map((m) => (
                        <li key={m.id} className="flex items-center justify-between gap-2 rounded-lg border border-sand-200 px-2.5 py-1.5 text-sm">
                          <Link href={`/cases/${m.id}`} className="font-bold underline">{m.id}</Link>
                          <StatusChip state={m.state} />
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold">Missing evidence</h4>
                    <ul className="mt-1 list-disc pl-4 text-sm text-ink-600">{missing.map((m) => <li key={m}>{m}</li>)}</ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold">Recommended representative farms to inspect</h4>
                    <p className="text-xs text-ink-500">Deterministic: unverified first, then nearest to cluster centre (information gain).</p>
                    <ol className="mt-1 list-decimal pl-5 text-sm">
                      {reps.map((id) => <li key={id}><Link href={`/cases/${id}`} className="font-bold underline">{id}</Link></li>)}
                    </ol>
                  </div>
                  <div className="rounded-lg border border-sand-200 p-3">
                    <h4 className="text-sm font-extrabold">Response mission</h4>
                    {openMission ? (
                      <p className="mt-1 text-sm">Mission <Link href="/missions" className="font-bold underline">{openMission.id}</Link> — {openMission.status} · offline pack {openMission.offlinePack}</p>
                    ) : cl.status === "DISMISSED" ? (
                      <p className="mt-1 text-sm text-ink-500">No mission — cluster dismissed.</p>
                    ) : (
                      <button type="button" className="btn-primary mt-1 text-sm" onClick={() => generate(cl.id)}>Generate verification mission</button>
                    )}
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
