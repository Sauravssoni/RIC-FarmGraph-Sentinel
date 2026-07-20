"use client";
import { useState } from "react";
import Link from "next/link";
import { KVKS, KVK_META } from "@/lib/kvk";
import { useDemoStore } from "@/lib/store";
import { DemoBanner } from "@/components/bits";
import { fmtDateTime } from "@/lib/format";

export default function SupportPage() {
  const state = useDemoStore((s) => s.getState());
  const [q, setQ] = useState("");
  const filtered = KVKS.filter((k) =>
    !q || `${k.name} ${k.district} ${k.address} ${k.specialities.join(" ")}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <main className="mx-auto max-w-6xl px-3 py-4 sm:px-5">
      <DemoBanner />
      <div className="mt-2">
        <h1 className="text-xl font-extrabold tracking-tight text-ink-950">Support points — KVK directory</h1>
        <p className="text-sm text-ink-600">
          Verified contacts from official ICAR-ATARI/KVK publications (accessed {KVK_META.accessedOn}). {KVK_META.coordsNote}{" "}
          Referral delivery in this prototype is simulated and labelled.
        </p>
        <input className="input mt-2 w-full sm:max-w-sm" placeholder="Search district, crop, speciality…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search KVKs" />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {filtered.map((k) => (
          <article key={k.id} className="card p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-extrabold text-ink-900">{k.name}</h2>
              <span className="chip bg-leaf-100 text-leaf-800">{k.district}</span>
            </div>
            <p className="mt-1 text-sm text-ink-600">{k.address}</p>
            <p className="mt-1 text-sm">📞 <a className="font-bold underline" href={`tel:${k.phone}`}>{k.phone}</a> · ✉ <a className="font-bold underline" href={`mailto:${k.email}`}>{k.email}</a></p>
            <p className="mt-1 text-xs text-ink-600">Host: {k.host}</p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {k.specialities.map((s) => <span key={s} className="chip bg-sand-200 text-ink-700">{s}</span>)}
            </div>
            <p className="mt-2 text-[10px] text-ink-400">source: {k.source} · <a className="underline" href={k.website} target="_blank" rel="noreferrer">official site ↗</a></p>
          </article>
        ))}
      </div>

      <section className="card mt-4 p-4">
        <h2 className="text-base font-extrabold text-ink-900">Referral log</h2>
        {state.referrals.length === 0 ? (
          <p className="mt-2 text-sm text-ink-500">No referrals yet. Referrals are created from case pages (KVK support point panel) or the expert queue.</p>
        ) : (
          <ul className="mt-2 space-y-1.5 text-sm">
            {state.referrals.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-sand-300 px-3 py-2">
                <span><span className="font-bold">{r.id}</span> · <Link className="font-mono font-bold underline" href={`/cases/${r.caseId}/`}>{r.caseId}</Link> → {r.kvkId}</span>
                <span className="chip bg-ink-800/10 text-ink-800">{r.status}</span>
                <span className="text-xs text-ink-500">{fmtDateTime(r.createdAt)} · simulated delivery</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
