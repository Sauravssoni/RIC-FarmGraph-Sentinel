"use client";

import Link from "next/link";
import type { CaseState } from "@contracts";
import { STATE_META } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

export function StatusChip({ state }: { state: CaseState }) {
  const meta = STATE_META[state];
  return (
    <span className={`chip ${meta.badge}`}>
      <span aria-hidden="true">{meta.glyph}</span>
      {meta.label}
    </span>
  );
}

export function DemoBanner({ text }: { text?: string }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-saffron-500/30 bg-saffron-50/80 px-3.5 py-2 text-xs font-semibold text-saffron-700" role="note">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-saffron-500 px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-950">
        <span className="h-1.5 w-1.5 rounded-full bg-ink-950" aria-hidden="true" />
        {t("common.demoData")}
      </span>
      <span>{text ?? "Simulated prototype dataset. No real farmer, field or government-system data."}</span>
    </div>
  );
}

export function ProvenanceTag({ label }: { label?: string }) {
  return (
    <span className="chip border-sand-300 bg-sand-100 text-ink-600" title="Provenance">
      ⬡ {label ?? "Simulated"}
    </span>
  );
}

export function KpiCard({
  title, value, sub, href, tone = "ink", label,
}: {
  title: string;
  value: string | number;
  sub?: string;
  href?: string;
  tone?: "ink" | "leaf" | "saffron" | "alert";
  label?: string;
}) {
  const toneClass = {
    ink: "metric-card",
    leaf: "metric-card metric-card-leaf",
    saffron: "metric-card metric-card-saffron",
    alert: "metric-card metric-card-alert",
  }[tone];

  const valueClass = {
    ink: "text-ink-950",
    leaf: "text-leaf-700",
    saffron: "text-saffron-700",
    alert: "text-alert-700",
  }[tone];

  const inner = (
    <div className={`${toneClass} h-full`}>
      <div className="eyebrow">{label ?? title}</div>
      <div className={`mt-3 text-3xl font-extrabold tracking-tight tabular-nums ${valueClass}`}>{value}</div>
      <div className="mt-1 text-sm font-bold text-ink-800">{title}</div>
      {sub && <div className="mt-1 text-xs leading-relaxed text-ink-500">{sub}</div>}
      {href && <div className="mt-3 text-xs font-extrabold text-ink-700">Open detail →</div>}
    </div>
  );

  return href ? <Link href={href} className="block h-full focus-visible:rounded-2xl">{inner}</Link> : inner;
}

export function SectionTitle({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="eyebrow">Operational view</p>
        <h2 className="mt-1 text-xl font-extrabold tracking-tight text-ink-950">{title}</h2>
        {sub && <p className="mt-1 max-w-3xl text-sm leading-relaxed text-ink-500">{sub}</p>}
      </div>
      {right}
    </div>
  );
}
