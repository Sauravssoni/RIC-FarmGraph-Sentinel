"use client";

import { useState } from "react";
import { INTEGRATIONS } from "@/lib/seed";
import { DemoBanner, SectionTitle } from "@/components/bits";
import type { IntegrationStatus } from "@contracts";

const STATUS_CLS: Record<IntegrationStatus, string> = {
  SIMULATED: "bg-saffron-100 text-saffron-700 border-saffron-500/40",
  CONTRACT_DEFINED: "bg-ink-800/10 text-ink-800 border-ink-800/20",
  PUBLIC_DATA_ONLY: "bg-leaf-100 text-leaf-700 border-leaf-600/40",
  AWAITING_AUTHORITY: "bg-saffron-100 text-saffron-700 border-saffron-500/40",
  NOT_STARTED: "bg-sand-200 text-slate2 border-sand-300",
};

type Adapter = (typeof INTEGRATIONS.adapters)[number];

export default function Integrations() {
  const [open, setOpen] = useState<Adapter | null>(null);
  const adapters = INTEGRATIONS.adapters;

  return (
    <div className="mx-auto max-w-[1440px] px-3 py-4 sm:px-5">
      <SectionTitle title="Government-integration readiness matrix" sub={`${adapters.length} typed adapter contracts — none live, no credentials exist in this prototype.`} />
      <div className="mb-3 rounded-lg border border-alert-600/40 bg-alert-50 px-3.5 py-2 text-sm font-semibold text-alert-700" role="note">
        No adapter on this page is live. Rakshak does not claim RajSSO, Jan Aadhaar, e-Dharti, Bhashini, IMD or KVK connectivity. Statuses show readiness, not access.
      </div>
      <DemoBanner />

      <div className="card mt-3 overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="bg-sand-100">
              <th className="th">System</th><th className="th">Purpose</th><th className="th">Direction</th>
              <th className="th">Status</th><th className="th">Fallback</th><th className="th">Last checked</th><th className="th"></th>
            </tr>
          </thead>
          <tbody>
            {adapters.map((a) => (
              <tr key={a.id} className="hover:bg-sand-50">
                <td className="td font-bold">{a.name}</td>
                <td className="td text-sm max-w-[280px]">{a.purpose}</td>
                <td className="td text-xs">{a.direction}</td>
                <td className="td"><span className={`chip ${STATUS_CLS[a.status as IntegrationStatus]}`}>{a.status}</span></td>
                <td className="td text-xs max-w-[220px]">{a.fallback}</td>
                <td className="td text-xs">{INTEGRATIONS.lastChecked}</td>
                <td className="td"><button type="button" className="btn-secondary !min-h-[36px] px-2.5 text-xs" onClick={() => setOpen(a)}>Details</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/40 p-3 sm:items-center" role="dialog" aria-modal="true" aria-label={`${open.name} adapter details`} onClick={() => setOpen(null)}>
          <div className="card max-h-[85vh] w-full max-w-lg overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-lg font-extrabold">{open.name}</h3>
              <span className={`chip ${STATUS_CLS[open.status as IntegrationStatus]}`}>{open.status}</span>
            </div>
            <dl className="mt-3 space-y-2 text-sm">
              <div><dt className="font-bold text-ink-700">Purpose</dt><dd>{open.purpose}</dd></div>
              <div><dt className="font-bold text-ink-700">Data direction</dt><dd>{open.direction}</dd></div>
              <div><dt className="font-bold text-ink-700">Minimum fields</dt><dd className="font-mono text-xs">{open.minFields.join(", ")}</dd></div>
              <div><dt className="font-bold text-ink-700">Consent / legal basis</dt><dd>{open.consentBasis}</dd></div>
              <div><dt className="font-bold text-ink-700">Production dependency</dt><dd>{open.productionDependency}</dd></div>
              <div><dt className="font-bold text-ink-700">Fallback mode</dt><dd>{open.fallback}</dd></div>
              <div><dt className="font-bold text-ink-700">Owner</dt><dd>{open.owner}</dd></div>
            </dl>
            <button type="button" className="btn-primary mt-4 w-full" onClick={() => setOpen(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
