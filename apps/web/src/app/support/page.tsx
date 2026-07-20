"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Referral } from "@contracts";
import {
  KVKS, KVK_META, REFERRAL_MODE_LABEL, SLA_CHIP, contactStatus, mapsDirectionsUrl, referralSlaStatus,
} from "@/lib/kvk";
import { useDemoStore } from "@/lib/store";
import { useApp } from "@/lib/app";
import * as api from "@/lib/httpProvider";
import { DemoBanner } from "@/components/bits";
import { fmtDateTime } from "@/lib/format";

export default function SupportPage() {
  const app = useApp();
  const connected = app.apiMode === "api-connected";
  const state = useDemoStore((s) => s.getState());
  const [q, setQ] = useState("");
  const [copied, setCopied] = useState("");
  const [apiRefs, setApiRefs] = useState<Referral[] | null>(null);

  const refresh = useCallback(() => {
    if (!connected) return;
    api.getReferrals().then((r) => setApiRefs(r.referrals)).catch(() => setApiRefs(null));
  }, [connected]);
  useEffect(refresh, [refresh]);

  const referrals = connected ? (apiRefs ?? []) : state.referrals;
  const filtered = KVKS.filter((k) =>
    !q || `${k.name} ${k.district} ${k.address} ${k.specialities.join(" ")}`.toLowerCase().includes(q.toLowerCase()));

  const copy = (text: string, key: string) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(key);
      window.setTimeout(() => setCopied(""), 1500);
    }).catch(() => undefined);
  };

  return (
    <main className="mx-auto max-w-6xl px-3 py-4 sm:px-5">
      <DemoBanner />
      <div className="mt-2">
        <h1 className="text-xl font-extrabold tracking-tight text-ink-950">Support points — KVK directory</h1>
        <p className="text-sm text-ink-600">
          Verified contacts from official ICAR-ATARI/KVK publications (accessed {KVK_META.accessedOn}). {KVK_META.coordsNote}
        </p>
        <p className={`chip mt-2 ${connected ? "bg-leaf-100 text-leaf-700" : "bg-saffron-100 text-saffron-700"}`}>
          {connected ? REFERRAL_MODE_LABEL.connected : REFERRAL_MODE_LABEL.standalone}
        </p>
        <input className="input mt-2 w-full sm:max-w-sm" placeholder="Search district, crop, speciality…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search KVKs" />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {filtered.map((k) => {
          const contact = contactStatus(k);
          return (
            <article key={k.id} className="card p-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-extrabold text-ink-900">{k.name}</h2>
                <span className="chip bg-leaf-100 text-leaf-700">{k.district}</span>
              </div>
              <p className="mt-1 text-sm text-ink-600">{k.address}</p>
              <p className="mt-1 text-xs text-ink-600">Host: {k.host}</p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {k.specialities.map((s) => <span key={s} className="chip bg-sand-200 text-ink-700">{s}</span>)}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                {k.phone?.trim() && <a className="btn-secondary !px-2 !py-1" href={`tel:${k.phone}`}>📞 {k.phone}</a>}
                {k.email?.trim() && <a className="btn-secondary !px-2 !py-1" href={`mailto:${k.email}`}>✉ Email</a>}
                <a className="btn-secondary !px-2 !py-1" href={mapsDirectionsUrl(k)} target="_blank" rel="noreferrer">🗺 Directions</a>
                <button type="button" className="btn-secondary !px-2 !py-1" onClick={() => copy(`${k.name}, ${k.address}`, `addr-${k.id}`)}>
                  {copied === `addr-${k.id}` ? "✓ copied" : "Copy address"}
                </button>
              </div>
              <p className="mt-2 text-[10px] text-ink-400">
                <span className={contact === "MISSING_CONTACT" ? "font-bold text-alert-700" : ""}>
                  {contact === "DIRECTORY_CONTACT_LISTED" ? "directory contact listed" : "contact not listed in source directory"}
                </span>
                {" · "}source: {k.source} · accessed {KVK_META.accessedOn} · <a className="underline" href={k.website} target="_blank" rel="noreferrer">official site ↗</a>
              </p>
            </article>
          );
        })}
      </div>

      <section className="card mt-4 p-4">
        <h2 className="text-base font-extrabold text-ink-900">Referral log</h2>
        {referrals.length === 0 ? (
          <p className="mt-2 text-sm text-ink-500">No referrals yet. Referrals are created from case pages (KVK support point panel) or the expert queue.</p>
        ) : (
          <ul className="mt-2 space-y-1.5 text-sm">
            {referrals.map((r) => {
              const sla = referralSlaStatus(r);
              const chip = SLA_CHIP[sla];
              return (
                <li key={r.id} className="rounded-lg border border-sand-300 px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold">{r.id}</span>
                    <button type="button" className="text-xs text-ink-500 underline" onClick={() => copy(r.id, `ref-${r.id}`)}>
                      {copied === `ref-${r.id}` ? "✓ copied" : "copy ID"}
                    </button>
                    <Link className="font-mono text-xs font-bold underline" href={`/cases/${r.caseId}/`}>{r.caseId}</Link>
                    <span className="text-xs">→ {r.kvkId}</span>
                    <span className="chip bg-ink-800 text-sand-50">{r.status}</span>
                    <span className={`chip ${chip.className}`}>{chip.label}</span>
                    <span className="chip bg-sand-200 text-ink-700">{r.urgency}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-ink-500">
                    created {fmtDateTime(r.createdAt)} · due {fmtDateTime(r.dueAt)} · {r.statusHistory.length} audited transition{r.statusHistory.length === 1 ? "" : "s"} ·{" "}
                    {connected ? "server-persisted (demo backend)" : "standalone demo store"}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
