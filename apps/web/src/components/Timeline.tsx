"use client";

import type { TimelineEvent } from "@contracts";
import { fmtDateTime } from "@/lib/format";

const TYPE_GLYPH: Record<string, string> = {
  case_created: "◌", sync_pending: "◔", sync_completed: "●", capture_submitted: "▣",
  quality_failed: "↻", quality_passed: "✓", triage_completed: "◆", escalated_to_expert: "▲",
  expert_confirmed: "✓", expert_corrected: "✓↺", expert_marked_unknown: "?", field_visit_required: "▲",
  recapture_requested: "↻", advisory_issued: "▣", follow_up_recorded: "◷", follow_up_due: "◷",
  outcome_updated: "■", marked_duplicate: "‖", cluster_updated: "◉", mission_created: "➤", state_change: "→",
};

export function Timeline({ events, dense }: { events: TimelineEvent[]; dense?: boolean }) {
  return (
    <ol className="relative ml-2 border-l-2 border-sand-300 pl-4" aria-label="Case timeline (append-only)">
      {events.map((e) => (
        <li key={e.id} className={dense ? "mb-2" : "mb-4"}>
          <span className="absolute -left-[9px] mt-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-sand-50 text-[10px] text-ink-700 border border-sand-300" aria-hidden="true">
            {TYPE_GLYPH[e.type] ?? "•"}
          </span>
          <div className="text-xs text-ink-500">
            <time dateTime={e.at}>{fmtDateTime(e.at)}</time>
            <span className="mx-1.5">·</span>
            <span className="font-semibold">{e.actor}</span>
            <span className="mx-1.5">·</span>
            <span className="text-ink-400">{e.id}</span>
          </div>
          <div className="text-sm text-ink-900">{e.summary}</div>
        </li>
      ))}
    </ol>
  );
}
