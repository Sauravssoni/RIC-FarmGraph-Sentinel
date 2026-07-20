"use client";

import { useState } from "react";
import Link from "next/link";
import { getStore, useDemoStore } from "@/lib/store";
import { useApp } from "@/lib/app";
import { StatusChip, ProvenanceTag, DemoBanner, SectionTitle } from "@/components/bits";
import { EvidenceCard } from "@/components/EvidenceCard";
import { DiagnosisPanel } from "@/components/DiagnosisPanel";
import { AdvisoryCard } from "@/components/AdvisoryCard";
import { Timeline } from "@/components/Timeline";
import { conditionLabel, cropLabel, CONDITIONS } from "@/lib/seed";
import { fmtDateTime } from "@/lib/format";
import type { FollowUpStatus, ReviewDecision } from "@contracts";

export function CaseDetail({ id }: { id: string }) {
  const app = useApp();
  const c = useDemoStore((s) => s.getState().cases.find((x) => x.id === id));
  const advisories = useDemoStore((s) => s.getState().advisories);
  const nearby = useDemoStore((s) => {
    const self = s.getState().cases.find((x) => x.id === id);
    return self ? s.nearbyCompatible(self) : [];
  });
  const [note, setNote] = useState("");
  const [correctTo, setCorrectTo] = useState("downy_mildew");
  const [fuNote, setFuNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  if (!c) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 text-center">
        <h1 className="text-xl font-extrabold">Case {id} not found</h1>
        <p className="mt-2 text-sm text-ink-500">It may belong to a different demo session. <Link className="underline font-bold" href="/cases">Open the register</Link>.</p>
      </div>
    );
  }

  const store = getStore();
  const advisory = advisories.find((a) => a.id === c.advisoryRef) ?? null;
  const isExpert = app.persona.role === "expert" || app.persona.role === "district_officer" || app.persona.role === "state_admin";
  const canReview = isExpert && (c.state === "AWAITING_EXPERT" || c.state === "FIELD_VISIT_REQUIRED" || c.state === "NOT_IMPROVING");
  const conditionOptions = [...new Set(CONDITIONS ? Object.keys(CONDITIONS) : [])];

  const doReview = (decision: ReviewDecision) => {
    const n = note.trim() || `Expert action: ${decision}`;
    store.review(c.id, { decision, conditionId: decision === "correct" ? correctTo : undefined, note: n });
    setMsg(`Review recorded: ${decision}`);
    setNote("");
  };

  const approvedForCondition = advisories.filter(
    (a) => a.status === "APPROVED" && a.conditionId === c.expertConfirmedCondition,
  );

  return (
    <div className="mx-auto max-w-[1440px] px-3 py-4 sm:px-5">
      <div className="text-xs text-ink-500"><Link href="/cases" className="underline font-semibold">Case register</Link> / {c.id}</div>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-950">{c.id}</h1>
        <StatusChip state={c.state} />
        <ProvenanceTag label="Simulated case" />
        {c.pendingSync && <span className="chip bg-saffron-100 text-saffron-700 border-saffron-500/40">◔ pending sync</span>}
      </div>
      <p className="mt-1 text-sm text-ink-600">
        {cropLabel(c.crop)} · {c.cropStage} · {c.season} — {c.block}, {c.district} · plot {c.plotId} ({c.areaAcres} acres, demo) · farmer {c.farmerId} (pseudonymous)
      </p>
      <p className="mt-0.5 text-xs text-ink-500">
        Created {fmtDateTime(c.createdAt)}{c.createdOffline ? " offline on device" : ""} · consent: {c.consent.given ? `given (${c.consent.channel})` : "not given"} · verified condition: <span className="font-bold">{conditionLabel(c.expertConfirmedCondition)}</span>
      </p>
      <div className="mt-3"><DemoBanner /></div>
      {msg && <div className="mt-3 rounded-lg border border-leaf-600/40 bg-leaf-50 px-3 py-2 text-sm font-semibold text-leaf-700" role="status">{msg}</div>}

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="min-w-0 space-y-4 lg:col-span-2">
          <section>
            <SectionTitle title={`Evidence (${c.observations.length})`} sub="simulated evidence tiles — checklist-driven capture gate" />
            {c.observations.length === 0 ? (
              <div className="card p-4 text-sm text-ink-600">
                No captures yet. {c.state === "DRAFT" && "This report is still a draft on the field device."}{" "}
                {c.state === "NEEDS_RECAPTURE" && <Link href="/field/scan" className="font-bold underline">Open the guided recapture flow →</Link>}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {c.observations.map((o) => <EvidenceCard key={o.id} obs={o} />)}
              </div>
            )}
          </section>

          {c.diagnosis ? <DiagnosisPanel d={c.diagnosis} /> : (
            <section className="card p-4 text-sm text-ink-600">
              <h3 className="text-base font-extrabold text-ink-900">Differential diagnosis</h3>
              <p className="mt-1">Not yet triaged. {c.state === "NEEDS_RECAPTURE" ? "The quality gate requires a better capture set first." : "Complete a passing capture to run the deterministic demo triage."}</p>
            </section>
          )}

          {advisory && <AdvisoryCard advisory={advisory} />}

          {c.followUps.length > 0 && (
            <section className="card p-4">
              <h3 className="text-base font-extrabold text-ink-900">Follow-ups</h3>
              <ul className="mt-2 space-y-2">
                {c.followUps.map((f) => (
                  <li key={f.id} className="rounded-lg border border-sand-200 px-3 py-2 text-sm">
                    <span className={`chip mr-2 ${f.status === "improving" ? "bg-leaf-100 text-leaf-700 border-leaf-600/40" : f.status === "not_improving" ? "bg-alert-100 text-alert-700 border-alert-600/40" : "bg-sand-200 text-ink-700 border-sand-300"}`}>{f.status.replace("_", " ")}</span>
                    {f.note} <span className="text-xs text-ink-400">· {fmtDateTime(f.at)} · {f.channel}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <SectionTitle title="Append-only timeline" sub="every state change is an audit event" />
            <div className="card p-4"><Timeline events={c.timeline} /></div>
          </section>
        </div>

        <div className="space-y-4">
          {canReview && (
            <section className="card p-4 border-saffron-500/50">
              <h3 className="text-base font-extrabold text-ink-900">Expert actions</h3>
              <p className="mt-0.5 text-xs text-ink-500">Acting as {app.persona.label} (demo persona). Every action appends to the audit timeline.</p>
              <label className="label mt-3" htmlFor="note">Structured note</label>
              <textarea id="note" className="input min-h-[72px] text-sm" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Evidence-based note (required for record quality)" />
              <label className="label mt-2" htmlFor="correctTo">Correct to condition (if correcting)</label>
              <select id="correctTo" className="input text-sm" value={correctTo} onChange={(e) => setCorrectTo(e.target.value)}>
                {conditionOptions.map((cid) => <option key={cid} value={cid}>{conditionLabel(cid)}</option>)}
              </select>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" className="btn-green text-sm" onClick={() => doReview("confirm")}>✓ Confirm lead</button>
                <button type="button" className="btn-amber text-sm" onClick={() => doReview("correct")}>✓↺ Correct</button>
                <button type="button" className="btn-secondary text-sm" onClick={() => doReview("unknown")}>? Mark unknown</button>
                <button type="button" className="btn-secondary text-sm" onClick={() => doReview("field_visit")}>▲ Require field visit</button>
                <button type="button" className="btn-secondary text-sm col-span-2" onClick={() => doReview("recapture")}>↻ Request recapture</button>
              </div>
            </section>
          )}

          {(c.state === "EXPERT_CONFIRMED" || c.state === "EXPERT_CORRECTED") && !c.advisoryRef && (
            <section className="card p-4">
              <h3 className="text-base font-extrabold text-ink-900">Issue safe advisory</h3>
              {approvedForCondition.length > 0 ? (
                <>
                  <p className="mt-1 text-xs text-ink-500">Approved, versioned advisories for {conditionLabel(c.expertConfirmedCondition)}:</p>
                  {approvedForCondition.map((a) => (
                    <button key={a.id} type="button" className="btn-green mt-2 w-full text-sm" onClick={() => { store.issueAdvisory(c.id, a.id); setMsg(`Advisory ${a.id} issued (chemical section remains locked)`); }}>
                      Issue {a.id} (non-chemical)
                    </button>
                  ))}
                </>
              ) : (
                <p className="mt-1 text-sm text-ink-600">No approved advisory exists for {conditionLabel(c.expertConfirmedCondition)} — advisory stays locked until expert content is approved.</p>
              )}
            </section>
          )}

          {(c.advisoryRef || c.state === "ADVISORY_ISSUED" || c.state === "FOLLOW_UP_DUE" || c.state === "NOT_IMPROVING" || c.state === "IMPROVING") && (
            <section className="card p-4">
              <h3 className="text-base font-extrabold text-ink-900">Record follow-up</h3>
              <label className="label mt-2" htmlFor="funote">Outcome note</label>
              <textarea id="funote" className="input min-h-[60px] text-sm" value={fuNote} onChange={(e) => setFuNote(e.target.value)} placeholder="Field observation after advisory" />
              <div className="mt-2 grid grid-cols-3 gap-2">
                {(["improving", "not_improving", "resolved"] as FollowUpStatus[]).map((s) => (
                  <button key={s} type="button" className={`text-sm ${s === "improving" ? "btn-green" : s === "not_improving" ? "btn-amber" : "btn-primary"}`}
                    onClick={() => { store.followUp(c.id, { status: s, note: fuNote.trim() || `Follow-up recorded: ${s.replace("_", " ")}` }); setFuNote(""); setMsg(`Follow-up recorded: ${s.replace("_", " ")}`); }}>
                    {s === "not_improving" ? "Not improving" : s[0].toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="card p-4">
            <h3 className="text-base font-extrabold text-ink-900">Nearby compatible cases</h3>
            <p className="text-xs text-ink-500">Same crop, nearest first — used for outbreak context.</p>
            <ul className="mt-2 space-y-1.5">
              {nearby.length === 0 && <li className="text-sm text-ink-500">None in the pilot dataset.</li>}
              {nearby.map((n) => (
                <li key={n.id} className="flex items-center justify-between gap-2 rounded-lg border border-sand-200 px-2.5 py-1.5 text-sm">
                  <Link href={`/cases/${n.id}`} className="font-bold underline">{n.id}</Link>
                  <StatusChip state={n.state} />
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
