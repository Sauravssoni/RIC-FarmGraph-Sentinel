"use client";
/**
 * KvkPanel — nearest KVK support points + full referral workflow for a case
 * (Task 003 Phase 2A).
 *
 * Connected mode (demo API reachable): referral creation and every state
 * mutation call FastAPI; the evidence pack comes from the API pack endpoint.
 * Standalone mode: the deterministic DemoStore mirrors the same lifecycle and
 * the pack is built client-side — the banner says so exactly. We never mutate
 * only browser state while showing a connected-backend badge.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Case, Referral, ReferralPack, ReferralStatus, ReferralUrgency } from "@contracts";
import {
  KVKS, KVK_META, REFERRAL_FLOW, REFERRAL_MODE_LABEL, SLA_CHIP,
  contactStatus, mapsDirectionsUrl, nearestKvks, referralSlaStatus, specialityMatch,
} from "@/lib/kvk";
import { buildReferralPack, downloadPack, printPack } from "@/lib/referralPack";
import { getStore, useDemoStore } from "@/lib/store";
import { useApp } from "@/lib/app";
import * as api from "@/lib/httpProvider";
import { fmtDateTime } from "@/lib/format";

const URGENCIES: ReferralUrgency[] = ["ROUTINE", "PRIORITY", "URGENT"];

function copyText(text: string, setCopied: (s: string) => void, key: string) {
  navigator.clipboard?.writeText(text).then(() => {
    setCopied(key);
    window.setTimeout(() => setCopied(""), 1500);
  }).catch(() => undefined);
}

export function KvkPanel({ kase }: { kase: Case }) {
  const app = useApp();
  const connected = app.apiMode === "api-connected";
  const state = useDemoStore((s) => s.getState());
  const matches = useMemo(() => nearestKvks(kase.lat, kase.lon, kase.district, 2), [kase]);

  // Connected mode reads referrals from the API; standalone from DemoStore.
  const [apiRefs, setApiRefs] = useState<Referral[] | null>(null);
  const refreshApiRefs = useCallback(() => {
    if (!connected) return;
    api.getReferrals()
      .then((r) => setApiRefs(r.referrals.filter((x) => x.caseId === kase.id)))
      .catch(() => setApiRefs(null));
  }, [connected, kase.id]);
  useEffect(refreshApiRefs, [refreshApiRefs]);

  const referrals = connected ? (apiRefs ?? []) : state.referrals.filter((r) => r.caseId === kase.id);

  const [note, setNote] = useState("");
  const [urgency, setUrgency] = useState<ReferralUrgency>("PRIORITY");
  const [copied, setCopied] = useState("");
  const [error, setError] = useState("");

  const reason = kase.expertConfirmedCondition
    ? `Expert-${kase.state === "EXPERT_CONFIRMED" ? "confirmed" : "reviewed"} ${kase.expertConfirmedCondition} — local follow-up requested`
    : kase.state === "NOT_IMPROVING"
      ? "Intervention not improving — escalation to local KVK expert"
      : "Case requires local KVK attention";

  const createReferral = (kvkId: string) => {
    setError("");
    if (connected) {
      api.createReferral(kase.id, { kvkId, reason, note: note || reason, urgency })
        .then(() => { setNote(""); refreshApiRefs(); })
        .catch((e) => setError(`API referral failed: ${e instanceof Error ? e.message : e}`));
    } else {
      getStore().createReferral(kase.id, { kvkId, reason, note: note || reason, urgency });
      setNote("");
    }
  };

  const transition = (ref: Referral, to: ReferralStatus) => {
    setError("");
    const transitionNote = to === "ESCALATED"
      ? window.prompt("Escalation note (required) — why is this being escalated?") ?? ""
      : "";
    if (to === "ESCALATED" && !transitionNote.trim()) return;
    if (connected) {
      api.updateReferralStatus(ref.id, to, transitionNote)
        .then(refreshApiRefs)
        .catch((e) => setError(`API status update failed: ${e instanceof Error ? e.message : e}`));
    } else {
      const updated = getStore().updateReferralStatus(ref.id, to, transitionNote || undefined);
      if (!updated) setError(`Invalid transition ${ref.status} → ${to}`);
    }
  };

  const packFor = (ref: Referral): Promise<ReferralPack> => {
    if (connected) return api.getReferralPack(ref.id);
    const cluster = state.clusters.find((c) => c.memberCaseIds.includes(kase.id));
    return Promise.resolve(buildReferralPack({
      kase,
      referral: ref,
      kvk: KVKS.find((k) => k.id === ref.kvkId),
      outbreakRelationship: cluster
        ? `Member of cluster ${cluster.id} (${cluster.name}, status ${cluster.status})`
        : "Not part of any outbreak cluster",
    }));
  };

  return (
    <section className="card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-extrabold text-ink-900">KVK support point</h3>
        <span className={`chip ${connected ? "bg-leaf-100 text-leaf-700" : "bg-saffron-100 text-saffron-700"}`}>
          {connected ? REFERRAL_MODE_LABEL.connected : REFERRAL_MODE_LABEL.standalone}
        </span>
      </div>
      <p className="mt-1 text-[10px] font-semibold text-ink-500">
        contacts from official ICAR-ATARI/KVK sources · accessed {KVK_META.accessedOn} · {KVK_META.coordsNote}
      </p>
      {error && <p className="mt-2 rounded-md bg-alert-100 px-2 py-1 text-xs font-bold text-alert-700">{error}</p>}

      <ul className="mt-2 space-y-2">
        {matches.map((k) => {
          const contact = contactStatus(k);
          const specMatch = specialityMatch(k, kase.crop);
          return (
            <li key={k.id} className="rounded-lg border border-sand-300 bg-sand-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-ink-900">{k.name}</p>
                <div className="flex flex-wrap gap-1">
                  <span className="chip bg-ink-800/10 text-ink-800">~{k.distanceKm} km (est.)</span>
                  {k.sameDistrict && <span className="chip bg-leaf-100 text-leaf-700">same district</span>}
                  {specMatch && <span className="chip bg-leaf-100 text-leaf-700">{kase.crop} speciality match</span>}
                  <span className={`chip ${contact === "DIRECTORY_CONTACT_LISTED" ? "bg-ink-800/10 text-ink-700" : "bg-alert-100 text-alert-700"}`}>
                    {contact === "DIRECTORY_CONTACT_LISTED" ? "directory contact listed" : "contact not listed"}
                  </span>
                </div>
              </div>
              <p className="mt-0.5 text-xs text-ink-600">{k.address}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
                {k.phone?.trim() && (
                  <a className="btn-secondary !px-2 !py-1" href={`tel:${k.phone}`}>📞 Call {k.phone}</a>
                )}
                {k.email?.trim() && (
                  <a className="btn-secondary !px-2 !py-1" href={`mailto:${k.email}?subject=${encodeURIComponent(`FarmGraph referral enquiry — case ${kase.id}`)}`}>✉ Email</a>
                )}
                <a className="btn-secondary !px-2 !py-1" href={mapsDirectionsUrl(k)} target="_blank" rel="noreferrer">🗺 Directions</a>
                <button type="button" className="btn-secondary !px-2 !py-1"
                  onClick={() => copyText(`${k.name}, ${k.address}`, setCopied, `addr-${k.id}`)}>
                  {copied === `addr-${k.id}` ? "✓ copied" : "Copy address"}
                </button>
              </div>
              <p className="mt-1 text-[10px] text-ink-400">
                source: {k.source} · accessed {KVK_META.accessedOn} · coordinates approximate — verify before field visit
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-sand-200 pt-2">
                <select className="input !w-auto !py-1 text-xs" value={urgency} aria-label="Referral urgency"
                  onChange={(e) => setUrgency(e.target.value as ReferralUrgency)}>
                  {URGENCIES.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
                <button type="button" className="btn-primary !py-1 text-xs" onClick={() => createReferral(k.id)}>
                  Refer case to this KVK
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <textarea className="input mt-2 w-full" rows={2} aria-label="Note for KVK expert"
        placeholder="Note for the KVK expert (symptoms, urgency, what is needed)…"
        value={note} onChange={(e) => setNote(e.target.value)} />

      {referrals.length > 0 && (
        <div className="mt-3 border-t border-sand-300 pt-2">
          <p className="text-xs font-extrabold text-ink-800">Referrals on this case</p>
          <ul className="mt-1 space-y-1.5">
            {referrals.map((r) => {
              const sla = referralSlaStatus(r);
              const chip = SLA_CHIP[sla];
              return (
                <li key={r.id} className="rounded-md bg-sand-100 px-2 py-1.5 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-bold">{r.id} → {r.kvkId}</span>
                    <button type="button" className="text-ink-500 underline" onClick={() => copyText(r.id, setCopied, `ref-${r.id}`)}>
                      {copied === `ref-${r.id}` ? "✓ copied" : "copy ID"}
                    </button>
                    <span className="chip bg-ink-800 text-sand-50">{r.status}</span>
                    <span className={`chip ${chip.className}`}>{chip.label}</span>
                    <span className="chip bg-sand-200 text-ink-700">{r.urgency}</span>
                    <span className="text-ink-500">created {fmtDateTime(r.createdAt)} · due {fmtDateTime(r.dueAt)}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {REFERRAL_FLOW[r.status].map((ns) => (
                      <button key={ns} type="button" className="btn-secondary !px-2 !py-0.5 text-[11px]"
                        onClick={() => transition(r, ns)}>
                        mark {ns.toLowerCase().replace(/_/g, " ")}
                      </button>
                    ))}
                    <button type="button" className="btn-secondary !px-2 !py-0.5 text-[11px]"
                      onClick={() => void packFor(r).then((p) => downloadPack(p, "json"))}>
                      ⬇ pack JSON
                    </button>
                    <button type="button" className="btn-secondary !px-2 !py-0.5 text-[11px]"
                      onClick={() => void packFor(r).then((p) => downloadPack(p, "html"))}>
                      ⬇ pack HTML
                    </button>
                    <button type="button" className="btn-secondary !px-2 !py-0.5 text-[11px]"
                      onClick={() => void packFor(r).then(printPack)}>
                      🖨 Print pack
                    </button>
                  </div>
                  <p className="mt-1 text-[10px] text-ink-500">
                    {r.statusHistory.length} audited transition{r.statusHistory.length === 1 ? "" : "s"} ·
                    latest: {r.statusHistory[r.statusHistory.length - 1].note || "—"}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
