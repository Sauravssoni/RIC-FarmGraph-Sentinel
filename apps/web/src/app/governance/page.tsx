"use client";

import { useMemo, useState } from "react";
import { useDemoStore } from "@/lib/store";
import { DemoBanner, SectionTitle } from "@/components/bits";
import { AdvisoryStatusChip } from "@/components/AdvisoryCard";
import { POLICY } from "@/lib/seed";
import EVIDENCE from "@data/reference/research-evidence.json";
import { fmtDateTime } from "@/lib/format";
import Link from "next/link";

const ADV_STATUSES = ["DRAFT", "EXPERT_REVIEWED", "APPROVED", "EXPIRED", "WITHDRAWN"] as const;

export default function Governance() {
  const models = useDemoStore((s) => s.getState().modelVersions);
  const advisories = useDemoStore((s) => s.getState().advisories);
  const audit = useDemoStore((s) => s.getState().auditEvents);
  const [typeFilter, setTypeFilter] = useState("all");

  const auditTypes = useMemo(() => [...new Set(audit.map((e) => e.type))].sort(), [audit]);
  const shownAudit = useMemo(
    () => [...audit].filter((e) => typeFilter === "all" || e.type === typeFilter).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 40),
    [audit, typeFilter],
  );

  return (
    <div className="mx-auto max-w-[1440px] px-3 py-4 sm:px-5">
      <SectionTitle title="Model, advisory & audit governance" sub="Truthful model registry, advisory lifecycle, policy thresholds and the immutable audit stream." />
      <div className="mb-3"><DemoBanner /></div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-4">
          <h3 className="text-base font-extrabold">Model registry</h3>
          <div className="mt-2 space-y-3">
            {models.map((m) => (
              <article key={m.id} className="rounded-lg border border-sand-200 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-extrabold text-ink-900">{m.id}</span>
                  <span className={`chip ${m.kind === "deterministic-demo" ? "bg-saffron-100 text-saffron-700 border-saffron-500/40" : "bg-ink-800/10 text-ink-800 border-ink-800/20"}`}>{m.status}</span>
                </div>
                <p className="mt-1 text-sm text-ink-700"><span className="font-bold">Trained on:</span> {m.trainedOn}</p>
                <p className="mt-0.5 text-sm text-ink-700"><span className="font-bold">Evaluation:</span> {m.evaluationNote}</p>
                {m.activatedAt && <p className="mt-0.5 text-xs text-ink-500">Active since {fmtDateTime(m.activatedAt)}</p>}
              </article>
            ))}
          </div>
          <div className="mt-3 rounded-lg border border-saffron-500/40 bg-saffron-50 p-3 text-sm">
            <span className="font-bold">Policy:</span> no accuracy figure is shown anywhere in this product because none has been measured. Simulated confidence is always labelled. Expert corrections feed the feedback loop for the future evaluated model (Task 002).
          </div>
        </section>

        <section className="card p-4">
          <h3 className="text-base font-extrabold">Prototype policy thresholds</h3>
          <p className="text-xs text-ink-500">From data/demo/policy.json — prototype values, NOT validated agronomic thresholds.</p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg bg-sand-100 p-2.5"><div className="text-xs text-ink-500">Capture coverage minimum</div><div className="font-extrabold">{POLICY.captureQuality.minCoverage}</div></div>
            <div className="rounded-lg bg-sand-100 p-2.5"><div className="text-xs text-ink-500">Autonomous score / margin</div><div className="font-extrabold">{POLICY.triage.autonomousMinScore} / {POLICY.triage.autonomousMinMargin}</div></div>
            <div className="rounded-lg bg-sand-100 p-2.5"><div className="text-xs text-ink-500">Abstain if “unknown” ≥</div><div className="font-extrabold">{POLICY.triage.abstainOtherThreshold}</div></div>
            <div className="rounded-lg bg-sand-100 p-2.5"><div className="text-xs text-ink-500">Outbreak verified / suspected</div><div className="font-extrabold">{POLICY.outbreak.thresholds.verifiedOutbreak} / {POLICY.outbreak.thresholds.suspected}</div></div>
            <div className="rounded-lg bg-sand-100 p-2.5"><div className="text-xs text-ink-500">Expert SLA</div><div className="font-extrabold">{POLICY.sla.expertReviewHours}h</div></div>
            <div className="rounded-lg bg-sand-100 p-2.5"><div className="text-xs text-ink-500">Follow-up window</div><div className="font-extrabold">{POLICY.sla.followUpDays} days</div></div>
          </div>
          <h3 className="mt-4 text-base font-extrabold">Feedback loop</h3>
          <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-ink-700">
            <li>Every expert confirm/correct/unknown is stored with evidence reference.</li>
            <li>Correction pairs (AI lead → expert label) are exported for future evaluation.</li>
            <li>No model weight changes happen in Task 001; the loop is evidence capture, not training.</li>
            <li>Poisoned-feedback mitigations: role-gated reviewers, audit trail, duplicate detection.</li>
          </ol>
        </section>
      </div>

      <section className="card mt-4 p-4">
        <h3 className="text-base font-extrabold">Advisory lifecycle board</h3>
        <p className="text-xs text-ink-500">DRAFT → EXPERT_REVIEWED → APPROVED → EXPIRED/WITHDRAWN. Chemical sections are locked in every state.</p>
        <div className="mt-3 grid gap-3 md:grid-cols-5">
          {ADV_STATUSES.map((status) => (
            <div key={status} className="rounded-lg border border-sand-200 p-2.5">
              <AdvisoryStatusChip status={status} />
              <ul className="mt-2 space-y-1.5">
                {advisories.filter((a) => a.status === status).map((a) => (
                  <li key={a.id} className="rounded-lg bg-sand-100 px-2 py-1.5 text-xs">
                    <div className="font-bold">{a.id}</div>
                    <div className="text-ink-500">{a.crop} · v{a.version}{a.validUntil ? ` · until ${a.validUntil}` : ""}</div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="card mt-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-extrabold">Research & public-data evidence</h3>
            <p className="text-xs text-ink-500">Verifiable government/institutional sources behind material design choices. Accessed {EVIDENCE.meta.accessedOn}. Full register: docs/research-evidence.md.</p>
          </div>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {EVIDENCE.evidence.map((e) => (
            <article key={e.id} className="rounded-lg border border-sand-300 bg-sand-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wide text-ink-500">{e.accessType.replace(/_/g, " ")}</span>
                <span className="text-[10px] font-mono text-ink-400">{e.id}</span>
              </div>
              <p className="mt-1.5 text-[13px] leading-snug text-ink-800">{e.claim}</p>
              <p className="mt-1.5 text-xs text-ink-600"><span className="font-bold">{e.institution}</span> — {e.source}</p>
              <p className="mt-1 text-xs text-ink-600"><span className="font-bold text-ink-700">Used in:</span> {e.usedIn}</p>
              <p className="mt-1 text-xs italic text-saffron-700">{e.honestyNote}</p>
              <a href={e.url} target="_blank" rel="noreferrer" className="mt-1.5 inline-block text-xs font-bold text-ink-800 underline underline-offset-2">Source ↗</a>
            </article>
          ))}
        </div>
      </section>

      <section className="card mt-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-extrabold">Audit stream</h3>
          <label className="text-xs font-semibold text-ink-600">Filter
            <select className="ml-2 rounded-lg border border-sand-300 px-2 py-1.5 text-xs" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="all">all event types</option>
              {auditTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
        </div>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead><tr className="bg-sand-100"><th className="th">Time</th><th className="th">Event</th><th className="th">Case</th><th className="th">Actor</th><th className="th">Summary</th></tr></thead>
            <tbody>
              {shownAudit.map((e) => (
                <tr key={e.id + (e.caseId ?? "")} className="hover:bg-sand-50">
                  <td className="td text-xs whitespace-nowrap">{fmtDateTime(e.at)}</td>
                  <td className="td text-xs font-bold">{e.type}</td>
                  <td className="td text-xs">{e.caseId ? <Link className="underline font-bold" href={`/cases/${e.caseId}`}>{e.caseId}</Link> : "—"}</td>
                  <td className="td text-xs">{e.actor}</td>
                  <td className="td text-sm">{e.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-ink-500">Append-only. {audit.length} events. Provenance: SIMULATED on every record.</p>
      </section>
    </div>
  );
}
