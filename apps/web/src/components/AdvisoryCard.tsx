"use client";

import type { Advisory } from "@contracts";
import { ProvenanceTag } from "./bits";

const STATUS_CLS: Record<Advisory["status"], string> = {
  DRAFT: "bg-sand-200 text-ink-700 border-sand-300",
  EXPERT_REVIEWED: "bg-ink-800/10 text-ink-800 border-ink-800/20",
  APPROVED: "bg-leaf-100 text-leaf-700 border-leaf-600/40",
  EXPIRED: "bg-saffron-100 text-saffron-700 border-saffron-500/40",
  WITHDRAWN: "bg-alert-100 text-alert-700 border-alert-600/40",
};

export function AdvisoryStatusChip({ status }: { status: Advisory["status"] }) {
  return <span className={`chip ${STATUS_CLS[status]}`}>{status.replace("_", " ")}</span>;
}

export function AdvisoryCard({ advisory, showGovernance }: { advisory: Advisory; showGovernance?: boolean }) {
  return (
    <section className="card p-4" aria-label="Safe advisory">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-extrabold text-ink-900">Safe advisory — immediate actions</h3>
        <div className="flex items-center gap-2">
          <AdvisoryStatusChip status={advisory.status} />
          <ProvenanceTag label="Demo content — not validated" />
        </div>
      </div>
      <p className="mt-1 text-xs text-ink-500">
        {advisory.id} · version {advisory.version} · reviewer {advisory.reviewer ?? "—"} · approved {advisory.approvedOn ?? "—"} · valid until {advisory.validUntil ?? "—"}
      </p>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <div>
          <h4 className="text-sm font-bold text-leaf-700">Do now (low-risk)</h4>
          <ul className="mt-1 list-disc space-y-1 pl-4 text-sm">{advisory.immediateSteps.map((s) => <li key={s}>{s}</li>)}</ul>
        </div>
        <div>
          <h4 className="text-sm font-bold text-ink-800">Monitor</h4>
          <ul className="mt-1 list-disc space-y-1 pl-4 text-sm">{advisory.monitoring.map((s) => <li key={s}>{s}</li>)}</ul>
        </div>
        <div>
          <h4 className="text-sm font-bold text-saffron-700">Escalate when</h4>
          <ul className="mt-1 list-disc space-y-1 pl-4 text-sm">{advisory.escalateWhen.map((s) => <li key={s}>{s}</li>)}</ul>
        </div>
      </div>
      <div className="mt-3 rounded-lg border-2 border-dashed border-alert-600/50 bg-alert-50 px-3 py-2.5">
        <div className="flex items-center gap-2 text-sm font-bold text-alert-700">
          <span aria-hidden="true">🔒</span> Chemical intervention — LOCKED
        </div>
        <p className="mt-0.5 text-xs text-ink-700">{advisory.chemical.note}</p>
      </div>
      {showGovernance && <p className="mt-2 text-xs text-ink-500">{advisory.note}</p>}
    </section>
  );
}
