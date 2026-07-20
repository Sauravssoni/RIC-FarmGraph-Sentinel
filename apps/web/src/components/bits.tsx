"use client";

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
    <div className="rounded-lg border border-saffron-500/50 bg-saffron-50 px-3.5 py-2 text-[13px] font-semibold text-saffron-700" role="note">
      <span className="mr-2 inline-block rounded bg-saffron-500 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-ink-950">
        {t("common.demoData")}
      </span>
      {text ?? "Simulated prototype dataset. No real farmer, field or government-system data."}
    </div>
  );
}

export function ProvenanceTag({ label }: { label?: string }) {
  return (
    <span className="chip bg-sand-200 text-ink-600 border-sand-300" title="Provenance">
      ⬡ {label ?? "Simulated"}
    </span>
  );
}

export function KpiCard({
  title, value, sub, href, tone = "ink",
}: {
  title: string; value: string | number; sub?: string; href?: string; tone?: "ink" | "leaf" | "saffron" | "alert";
}) {
  const tones: Record<string, string> = {
    ink: "text-ink-900",
    leaf: "text-leaf-700",
    saffron: "text-saffron-700",
    alert: "text-alert-700",
  };
  const inner = (
    <div className="card h-full p-4 hover:shadow-lift transition-shadow">
      <div className="text-xs font-bold uppercase tracking-wide text-ink-500">{title}</div>
      <div className={`mt-1.5 text-3xl font-extrabold tabular-nums ${tones[tone]}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-ink-500">{sub}</div>}
      {href && <div className="mt-2 text-xs font-bold text-ink-600 underline underline-offset-2">Drill into cases →</div>}
    </div>
  );
  return href ? <a href={href} className="block focus-visible:rounded-card">{inner}</a> : inner;
}

export function SectionTitle({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
      <div>
        <h2 className="text-lg font-extrabold tracking-tight text-ink-900">{title}</h2>
        {sub && <p className="text-xs text-ink-500 mt-0.5">{sub}</p>}
      </div>
      {right}
    </div>
  );
}
