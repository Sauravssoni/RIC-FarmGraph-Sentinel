"use client";

import Link from "next/link";
import type { Case } from "@contracts";
import { StatusChip } from "./bits";
import { cropLabel } from "@/lib/seed";
import { fmtDateTime } from "@/lib/format";

export function CaseTable({ cases, empty = "No cases match these filters." }: { cases: Case[]; empty?: string }) {
  if (cases.length === 0) {
    return <div className="card p-6 text-center text-sm text-ink-500">{empty}</div>;
  }
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse">
        <thead>
          <tr className="bg-sand-100">
            <th className="th">Case</th>
            <th className="th">Crop · stage</th>
            <th className="th">Location</th>
            <th className="th">Status</th>
            <th className="th">Verified condition</th>
            <th className="th">Sync</th>
            <th className="th">Updated</th>
          </tr>
        </thead>
        <tbody>
          {cases.map((c) => (
            <tr key={c.id} className="hover:bg-sand-50">
              <td className="td">
                <Link href={`/cases/${c.id}`} className="font-bold text-ink-900 underline underline-offset-2">
                  {c.id}
                </Link>
                <div className="text-xs text-ink-500">{c.plotId}</div>
              </td>
              <td className="td">{cropLabel(c.crop)}<div className="text-xs text-ink-500">{c.cropStage} · {c.season}</div></td>
              <td className="td">{c.block}<div className="text-xs text-ink-500">{c.district}</div></td>
              <td className="td"><StatusChip state={c.state} /></td>
              <td className="td text-sm">{c.expertConfirmedCondition ?? <span className="text-ink-400">—</span>}</td>
              <td className="td">
                {c.pendingSync ? (
                  <span className="chip bg-saffron-100 text-saffron-700 border-saffron-500/40">◔ pending</span>
                ) : (
                  <span className="chip bg-sand-100 text-ink-600 border-sand-300">● synced</span>
                )}
              </td>
              <td className="td text-xs text-ink-500">{fmtDateTime(c.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
