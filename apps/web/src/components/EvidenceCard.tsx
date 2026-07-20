"use client";

import type { CropObservation } from "@contracts";

const VIEW_LABELS: { key: keyof CropObservation["checklist"]; label: string }[] = [
  { key: "leafClose", label: "Leaf close-up" },
  { key: "lowerLeaf", label: "Lower leaf surface" },
  { key: "wholePlant", label: "Whole plant" },
  { key: "lightingOk", label: "Good light" },
];

/** Deterministic schematic tile — clearly a simulated placeholder, not a photo. */
function SimulatedTile({ seed, tint }: { seed: string; tint: string }) {
  const n = [...seed].reduce((a, ch) => a + ch.charCodeAt(0), 0);
  const blobs = Array.from({ length: 5 }, (_, i) => ({
    cx: 20 + ((n * (i + 3)) % 60), cy: 16 + ((n * (i + 7)) % 40), r: 5 + ((n + i * 13) % 9),
  }));
  return (
    <svg viewBox="0 0 100 64" className="h-full w-full" role="img" aria-label="Simulated evidence placeholder (not a real photo)">
      <rect width="100" height="64" fill="#e7dfc9" />
      <path d="M50 6 C 30 20, 30 44, 50 58 C 70 44, 70 20, 50 6 Z" fill="#3f9a4d" opacity="0.75" />
      <path d="M50 6 L50 58" stroke="#27692f" strokeWidth="1.4" />
      {blobs.map((b, i) => (
        <circle key={i} cx={b.cx} cy={b.cy} r={b.r} fill={tint} opacity="0.55" />
      ))}
      <text x="50" y="61" textAnchor="middle" fontSize="7" fontWeight="700" fill="#17233b">SIMULATED EVIDENCE — NOT A PHOTO</text>
    </svg>
  );
}

export function EvidenceCard({ obs }: { obs: CropObservation }) {
  const q = obs.quality;
  return (
    <article className="card overflow-hidden">
      <div className="h-32 border-b border-sand-200">
        <SimulatedTile seed={obs.id} tint={q.passed ? "#c77400" : "#b3261e"} />
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-bold text-ink-900">{obs.id}</span>
          <span className={`chip ${q.passed ? "bg-leaf-100 text-leaf-700 border-leaf-600/40" : "bg-alert-100 text-alert-700 border-alert-600/40"}`}>
            {q.passed ? "✓ quality passed" : "↻ recapture"}
          </span>
        </div>
        <div className="mt-1 text-xs text-ink-500">Coverage {(q.coverageScore * 100).toFixed(0)}% · {obs.imageCount} view(s) · {obs.symptomCategory}</div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {VIEW_LABELS.map((v) => (
            <span key={v.key} className={`chip ${obs.checklist[v.key] ? "bg-leaf-50 text-leaf-700 border-leaf-600/30" : "bg-sand-100 text-ink-500 border-sand-300"}`}>
              {obs.checklist[v.key] ? "✓" : "○"} {v.label}
            </span>
          ))}
        </div>
        {!q.passed && q.issues.length > 0 && (
          <ul className="mt-2 list-disc pl-4 text-xs text-alert-700">
            {q.issues.map((i) => <li key={i}>{i}</li>)}
          </ul>
        )}
        {obs.symptomNote && <p className="mt-2 text-xs italic text-ink-600">“{obs.symptomNote}”</p>}
      </div>
    </article>
  );
}
