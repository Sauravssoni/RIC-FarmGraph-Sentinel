"use client";

import type { DiagnosisResult } from "@contracts";
import { ProvenanceTag } from "./bits";
import { POLICY } from "@/lib/seed";

export function DiagnosisPanel({ d, compact }: { d: DiagnosisResult; compact?: boolean }) {
  const max = Math.max(...d.candidates.map((c) => c.simConfidence), 0.01);
  return (
    <section className="card p-4" aria-label="Differential diagnosis">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-extrabold text-ink-900">Differential diagnosis</h3>
        <div className="flex items-center gap-2">
          <ProvenanceTag label="Simulated scores" />
          {d.highSpreadRisk && <span className="chip bg-alert-100 text-alert-700 border-alert-600/40">▲ High spread-risk policy</span>}
        </div>
      </div>
      <p className="mt-1 text-xs text-ink-500">
        Provider {d.provider} v{d.modelVersion} · {POLICY.labels.simulatedConfidence}
      </p>
      <ul className="mt-3 space-y-3">
        {d.candidates.map((c, i) => (
          <li key={c.conditionId + i}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-bold text-ink-900">
                {i === 0 ? "Leading: " : i === 1 ? "Alternative: " : "Remaining: "}
                {c.label}
              </span>
              <span className="text-sm font-extrabold tabular-nums text-ink-900">{(c.simConfidence * 100).toFixed(0)}%</span>
            </div>
            <div className="mt-1 h-2.5 w-full rounded-full bg-sand-200" role="img" aria-label={`Simulated confidence ${(c.simConfidence * 100).toFixed(0)} percent`}>
              <div
                className={`h-2.5 rounded-full ${i === 0 ? "bg-saffron-500" : i === 1 ? "bg-ink-600" : "bg-slate2"}`}
                style={{ width: `${(c.simConfidence / max) * 100}%` }}
              />
            </div>
            {!compact && (
              <details className="mt-1 text-xs text-ink-600">
                <summary className="cursor-pointer font-semibold">Evidence reasons & missing evidence</summary>
                <div className="mt-1 grid gap-2 sm:grid-cols-2">
                  <div>
                    <div className="font-bold text-ink-700">Reasons</div>
                    <ul className="list-disc pl-4">{c.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
                  </div>
                  <div>
                    <div className="font-bold text-ink-700">Missing evidence</div>
                    <ul className="list-disc pl-4">{c.missingEvidence.map((r) => <li key={r}>{r}</li>)}</ul>
                  </div>
                </div>
              </details>
            )}
          </li>
        ))}
      </ul>
      <div className={`mt-3 rounded-lg border px-3 py-2 text-sm ${d.routing.decision === "abstain" ? "border-slate2/40 bg-sand-100" : "border-saffron-500/40 bg-saffron-50"}`}>
        <span className="font-bold">Routing: </span>{d.routing.reason}
      </div>
      <div className="mt-2 text-xs text-ink-500">
        Margin {d.margin.toFixed(2)} · thresholds used: autonomous ≥ {d.thresholdsUsed.autonomousMinScore} / margin ≥ {d.thresholdsUsed.autonomousMinMargin} · abstain if unknown ≥ {d.thresholdsUsed.abstainOtherThreshold}. Prototype policy values, not validated thresholds.
      </div>
    </section>
  );
}
