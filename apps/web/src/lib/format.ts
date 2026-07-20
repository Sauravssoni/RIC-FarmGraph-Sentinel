import type { CaseState } from "@contracts";

export interface StateMeta {
  label: string;
  /** glyph gives a non-colour signal (WCAG: status not by colour alone) */
  glyph: string;
  badge: string; // tailwind classes
}

export const STATE_META: Record<CaseState, StateMeta> = {
  DRAFT: { label: "Draft", glyph: "◌", badge: "bg-sand-200 text-ink-700 border-sand-300" },
  CAPTURE_PENDING: { label: "Capture pending", glyph: "◌", badge: "bg-sand-200 text-ink-700 border-sand-300" },
  READY_FOR_TRIAGE: { label: "Ready for triage", glyph: "◔", badge: "bg-ink-800/10 text-ink-800 border-ink-800/20" },
  TRIAGED: { label: "Triaged (AI)", glyph: "◔", badge: "bg-ink-800/10 text-ink-800 border-ink-800/20" },
  NEEDS_RECAPTURE: { label: "Needs recapture", glyph: "↻", badge: "bg-saffron-100 text-saffron-700 border-saffron-500/40" },
  AWAITING_EXPERT: { label: "Awaiting expert", glyph: "◆", badge: "bg-saffron-100 text-saffron-700 border-saffron-500/40" },
  EXPERT_CONFIRMED: { label: "Expert confirmed", glyph: "✓", badge: "bg-leaf-100 text-leaf-700 border-leaf-600/40" },
  EXPERT_CORRECTED: { label: "Expert corrected", glyph: "✓↺", badge: "bg-leaf-100 text-leaf-700 border-leaf-600/40" },
  FIELD_VISIT_REQUIRED: { label: "Field visit required", glyph: "▲", badge: "bg-saffron-100 text-saffron-700 border-saffron-500/50" },
  ADVISORY_ISSUED: { label: "Advisory issued", glyph: "▣", badge: "bg-ink-800/10 text-ink-800 border-ink-800/20" },
  FOLLOW_UP_DUE: { label: "Follow-up due", glyph: "◷", badge: "bg-saffron-100 text-saffron-700 border-saffron-500/40" },
  IMPROVING: { label: "Improving", glyph: "↑", badge: "bg-leaf-100 text-leaf-700 border-leaf-600/40" },
  NOT_IMPROVING: { label: "Not improving", glyph: "▼", badge: "bg-alert-100 text-alert-700 border-alert-600/40" },
  RESOLVED: { label: "Resolved", glyph: "■", badge: "bg-sand-200 text-ink-700 border-sand-300" },
  CLOSED_UNKNOWN: { label: "Closed — unknown", glyph: "?", badge: "bg-sand-200 text-slate2 border-sand-300" },
  CLOSED_DUPLICATE: { label: "Closed — duplicate", glyph: "‖", badge: "bg-sand-200 text-slate2 border-sand-300" },
};

const dtf = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });
const df = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" });

export function fmtDateTime(iso: string): string {
  return dtf.format(new Date(iso));
}
export function fmtDate(iso: string): string {
  return df.format(new Date(iso));
}
export function hoursBetween(a: string, b: string): number {
  return Math.round(((new Date(b).getTime() - new Date(a).getTime()) / 36e5) * 10) / 10;
}
