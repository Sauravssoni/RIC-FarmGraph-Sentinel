"use client";

import { useState } from "react";
import Link from "next/link";
import { getStore, useDemoStore } from "@/lib/store";
import { DemoBanner, SectionTitle, StatusChip } from "@/components/bits";
import { fmtDateTime } from "@/lib/format";
import { cropLabel } from "@/lib/seed";

const STATUS_CLS: Record<string, string> = {
  PLANNED: "bg-ink-800/10 text-ink-800 border-ink-800/20",
  IN_PROGRESS: "bg-saffron-100 text-saffron-700 border-saffron-500/40",
  COMPLETED: "bg-leaf-100 text-leaf-700 border-leaf-600/40",
};

export default function Missions() {
  const store = getStore();
  const missions = useDemoStore((s) => s.getState().missions);
  const cases = useDemoStore((s) => s.getState().cases);
  const [msg, setMsg] = useState<string | null>(null);

  const act = (id: string, status: "IN_PROGRESS" | "COMPLETED") => {
    store.setMissionStatus(id, status, status === "COMPLETED" ? "Visit findings recorded on device and synced (simulated): representative inspection completed per checklist." : undefined);
    setMsg(`Mission ${id} → ${status}`);
  };

  return (
    <div className="mx-auto max-w-[1200px] px-3 py-4 sm:px-5">
      <SectionTitle
        title="Field-verification missions"
        sub="Prioritised by explainable information gain — unverified cases first, then nearest. Not a route optimiser in Task 001."
      />
      <div className="mb-3"><DemoBanner /></div>
      {msg && <div className="mb-3 rounded-lg border border-leaf-600/40 bg-leaf-50 px-3 py-2 text-sm font-semibold text-leaf-700" role="status">{msg}</div>}

      <div className="space-y-4">
        {missions.map((m) => (
          <section key={m.id} className="card p-4" aria-label={`Mission ${m.id}`}>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-extrabold">{m.id}</h3>
              <span className={`chip ${STATUS_CLS[m.status]}`}>{m.status}</span>
              <span className="chip bg-sand-200 text-ink-600 border-sand-300">offline pack: {m.offlinePack}</span>
              <span className="chip bg-sand-200 text-ink-600 border-sand-300">sync: {m.syncStatus}</span>
            </div>
            <p className="mt-1 text-sm font-semibold text-ink-800">{m.purpose}</p>
            <p className="text-xs text-ink-500">Assigned: {m.assignedRole} · created {fmtDateTime(m.createdAt)}{m.completedAt ? ` · completed ${fmtDateTime(m.completedAt)}` : ""}{m.clusterId ? ` · cluster ${m.clusterId}` : ""}</p>

            <div className="mt-3 grid gap-4 md:grid-cols-3">
              <div>
                <h4 className="text-sm font-extrabold">Visit sequence</h4>
                <ol className="mt-1.5 space-y-1.5">
                  {m.routeOrder.map((cid, i) => {
                    const c = cases.find((x) => x.id === cid);
                    return (
                      <li key={cid} className="flex items-center gap-2 rounded-lg border border-sand-200 px-2.5 py-1.5 text-sm">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink-900 text-xs font-extrabold text-sand-50">{i + 1}</span>
                        <div>
                          <Link href={`/cases/${cid}`} className="font-bold underline">{cid}</Link>
                          {c && <div className="text-xs text-ink-500">{cropLabel(c.crop)} · {c.block}{c.expertConfirmedCondition ? " · verified" : " · unverified"}</div>}
                        </div>
                      </li>
                    );
                  })}
                </ol>
                <p className="mt-1.5 text-xs text-ink-500">{m.infoGainNote}</p>
              </div>
              <div>
                <h4 className="text-sm font-extrabold">Evidence checklist</h4>
                <ul className="mt-1.5 space-y-1 text-sm">
                  {m.checklist.map((item) => (
                    <li key={item} className="flex items-start gap-2"><span aria-hidden="true" className="text-leaf-700">☐</span>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-extrabold">Visit findings</h4>
                {m.visits.length === 0 && <p className="mt-1 text-sm text-ink-500">No visits recorded yet.</p>}
                <ul className="mt-1 space-y-1.5 text-sm">
                  {m.visits.map((v, i) => (
                    <li key={i} className="rounded-lg border border-sand-200 px-2.5 py-1.5">
                      <span className="font-bold">{v.caseId}</span> · <span className="text-xs text-ink-400">{fmtDateTime(v.at)}</span>
                      <div className="text-ink-700">{v.findings}</div>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex gap-2">
                  {m.status === "PLANNED" && <button type="button" className="btn-amber text-sm" onClick={() => act(m.id, "IN_PROGRESS")}>Start mission</button>}
                  {m.status === "IN_PROGRESS" && <button type="button" className="btn-green text-sm" onClick={() => act(m.id, "COMPLETED")}>Complete & sync</button>}
                  {m.status === "COMPLETED" && <StatusChip state="RESOLVED" />}
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
