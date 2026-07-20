"use client";
/**
 * KvkPanel — nearest KVK support points + referral workflow for a case.
 * Contacts are sourced from official ICAR-ATARI/KVK publications (provenance
 * shown); referral delivery is simulated and labelled.
 */
import { useMemo, useState } from "react";
import type { Case, Referral } from "@contracts";
import { nearestKvks, KVK_META } from "@/lib/kvk";
import { getStore, useDemoStore } from "@/lib/store";
import { fmtDateTime } from "@/lib/format";

const NEXT_STATUS: Record<string, string[]> = {
  SHARED: ["ACKNOWLEDGED"],
  ACKNOWLEDGED: ["RESPONDED"],
  RESPONDED: ["CLOSED"],
};

export function KvkPanel({ kase }: { kase: Case }) {
  const state = useDemoStore((s) => s.getState());
  const matches = useMemo(() => nearestKvks(kase.lat, kase.lon, kase.district, 2), [kase]);
  const referrals = state.referrals.filter((r) => r.caseId === kase.id);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");

  const reason = kase.expertConfirmedCondition
    ? `Expert-${kase.state === "EXPERT_CONFIRMED" ? "confirmed" : "reviewed"} ${kase.expertConfirmedCondition} — local follow-up requested`
    : kase.state === "NOT_IMPROVING"
      ? "Intervention not improving — escalation to local KVK expert"
      : "Case requires local KVK attention";

  return (
    <section className="card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-extrabold text-ink-900">KVK support point</h3>
        <span className="text-[10px] font-semibold text-ink-500">contacts from official ICAR-ATARI/KVK sources · accessed {KVK_META.accessedOn} · coords approximate</span>
      </div>

      <ul className="mt-2 space-y-2">
        {matches.map((k) => (
          <li key={k.id} className="rounded-lg border border-sand-300 bg-sand-50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold text-ink-900">{k.name}</p>
              <span className="chip bg-ink-800/10 text-ink-800">~{k.distanceKm} km{k.sameDistrict ? " · same district" : ""}</span>
            </div>
            <p className="mt-0.5 text-xs text-ink-600">{k.address}</p>
            <p className="mt-0.5 text-xs text-ink-700">📞 {k.phone} · ✉ {k.email}</p>
            <p className="mt-0.5 text-[10px] text-ink-400">source: {k.source}</p>
            <button type="button" className="btn-primary mt-2 w-full sm:w-auto"
              onClick={() => { getStore().createReferral(kase.id, { kvkId: k.id, reason, note: note || reason }); setOpen(false); setNote(""); }}>
              Refer case to this KVK
            </button>
            <button type="button" className="ml-2 text-xs font-bold text-ink-600 underline" onClick={() => setOpen(!open)}>
              {open ? "hide note" : "add note"}
            </button>
            {open && (
              <textarea className="input mt-2 w-full" rows={2} placeholder="Note for the KVK expert (symptoms, urgency, what is needed)…"
                value={note} onChange={(e) => setNote(e.target.value)} />
            )}
          </li>
        ))}
      </ul>

      {referrals.length > 0 && (
        <div className="mt-3 border-t border-sand-300 pt-2">
          <p className="text-xs font-extrabold text-ink-800">Referrals on this case</p>
          <ul className="mt-1 space-y-1.5">
            {referrals.map((r: Referral) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-sand-100 px-2 py-1.5 text-xs">
                <span><span className="font-bold">{r.id} → {r.kvkId}</span> · {fmtDateTime(r.createdAt)} · <span className="font-bold">{r.status}</span> <span className="text-ink-500">(simulated delivery)</span></span>
                {(NEXT_STATUS[r.status] ?? []).map((ns) => (
                  <button key={ns} type="button" className="btn-secondary !px-2 !py-0.5 text-[11px]"
                    onClick={() => getStore().updateReferralStatus(r.id, ns as Referral["status"])}>
                    mark {ns.toLowerCase()}
                  </button>
                ))}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
