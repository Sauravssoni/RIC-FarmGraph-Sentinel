"use client";

import type { Case, OutbreakCluster, OutbreakScoreBreakdown } from "@contracts";
import { DISTRICT_REFS, GEO_PROVENANCE, outlinePath, project, VIEW_H, VIEW_W } from "@/lib/geo";

type ClusterWithScore = OutbreakCluster & { score: OutbreakScoreBreakdown };

function caseCategory(c: Case): "suspected" | "verified" | "unknown" | "resolved" {
  if (c.state === "CLOSED_UNKNOWN" || c.expertConfirmedCondition === "unknown") return "unknown";
  if (c.state === "RESOLVED" || c.state === "CLOSED_DUPLICATE") return "resolved";
  if (c.expertConfirmedCondition) return "verified";
  return "suspected";
}

const CAT_STYLE = {
  suspected: { fill: "#f5a623", label: "Suspected" },
  verified: { fill: "#62c46d", label: "Expert verified" },
  unknown: { fill: "#a7b0c2", label: "Unknown" },
  resolved: { fill: "#66728b", label: "Resolved" },
} as const;

export function MapView({
  cases, clusters, selectedCluster, onSelectCluster, height = 480,
}: {
  cases: Case[];
  clusters: ClusterWithScore[];
  selectedCluster?: string | null;
  onSelectCluster?: (id: string) => void;
  height?: number;
}) {
  return (
    <figure className="overflow-hidden rounded-2xl border border-ink-800 bg-ink-950 shadow-[0_22px_70px_rgba(16,26,46,0.2)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 text-white">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink-400">Live operational geography</p>
          <p className="mt-0.5 text-sm font-bold">Pilot districts · Jodhpur, Nagaur and Jalore</p>
        </div>
        <div className="flex flex-wrap gap-3 text-[11px] font-semibold text-ink-400">
          {(Object.keys(CAT_STYLE) as (keyof typeof CAT_STYLE)[]).map((k) => (
            <span key={k} className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: CAT_STYLE[k].fill }} aria-hidden="true" />
              {CAT_STYLE[k].label}
            </span>
          ))}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="w-full"
        style={{ height }}
        role="img"
        aria-label="Pilot geospatial view of Rajasthan with demo case and outbreak markers"
      >
        <defs>
          <radialGradient id="mapGlow" cx="50%" cy="45%" r="70%">
            <stop offset="0%" stopColor="#223457" />
            <stop offset="100%" stopColor="#101a2e" />
          </radialGradient>
          <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <rect x="0" y="0" width={VIEW_W} height={VIEW_H} fill="url(#mapGlow)" />
        {Array.from({ length: 8 }, (_, i) => (
          <line key={`h-${i}`} x1="0" x2={VIEW_W} y1={40 + i * 54} y2={40 + i * 54} stroke="#ffffff" strokeOpacity="0.035" />
        ))}
        {Array.from({ length: 10 }, (_, i) => (
          <line key={`v-${i}`} y1="0" y2={VIEW_H} x1={30 + i * 72} x2={30 + i * 72} stroke="#ffffff" strokeOpacity="0.035" />
        ))}

        <path d={outlinePath()} fill="#1f2f4f" stroke="#8090ad" strokeWidth="1.8" />

        {DISTRICT_REFS.map((d) => {
          const [x, y] = project(d.lat, d.lon);
          return (
            <g key={d.name}>
              <rect x={x - 3} y={y - 3} width="6" height="6" fill="#f4efe3" transform={`rotate(45 ${x} ${y})`} />
              <text x={x + 9} y={y + 4} fontSize="12" fontWeight="700" fill="#dbe3f0">{d.name}</text>
            </g>
          );
        })}

        {clusters.map((cl) => {
          const [x, y] = project(cl.centerLat, cl.centerLon);
          const r = (cl.radiusKm / 111) * (VIEW_W / 9.6);
          const active = selectedCluster === cl.id;
          const stroke = cl.status === "VERIFIED" ? "#ef665d" : cl.status === "DISMISSED" ? "#8390a7" : "#f5a623";
          return (
            <g key={cl.id} filter={active ? "url(#softGlow)" : undefined}>
              <circle cx={x} cy={y} r={r} fill={stroke} fillOpacity={cl.status === "DISMISSED" ? 0.04 : 0.11} stroke={stroke} strokeWidth={active ? 3 : 1.8} strokeDasharray={cl.status === "DISMISSED" ? "6 5" : undefined} />
              <circle cx={x} cy={y} r={active ? 6.5 : 5} fill={stroke} />
              <rect x={x - 31} y={y - r - 23} width="62" height="18" rx="9" fill="#101a2e" stroke={stroke} strokeOpacity="0.7" />
              <text x={x} y={y - r - 10} fontSize="10" fontWeight="800" fill="#ffffff" textAnchor="middle">
                {cl.id} · {cl.score.score}
              </text>
              {onSelectCluster && (
                <circle cx={x} cy={y} r={Math.max(r, 22)} fill="transparent" className="cursor-pointer" onClick={() => onSelectCluster(cl.id)}>
                  <title>{`${cl.name} — score ${cl.score.score} (${cl.status})`}</title>
                </circle>
              )}
            </g>
          );
        })}

        {cases.map((c) => {
          const [x, y] = project(c.lat, c.lon);
          const cat = caseCategory(c);
          const fill = CAT_STYLE[cat].fill;
          return (
            <g key={c.id}>
              {cat === "suspected" && <path d={`M${x},${y - 6} L${x + 6},${y + 5} L${x - 6},${y + 5} Z`} fill={fill} stroke="#101a2e" strokeWidth="1"><title>{`${c.id} — ${CAT_STYLE[cat].label}`}</title></path>}
              {cat === "verified" && <circle cx={x} cy={y} r="5.5" fill={fill} stroke="#101a2e" strokeWidth="1"><title>{`${c.id} — ${CAT_STYLE[cat].label}`}</title></circle>}
              {cat === "unknown" && <rect x={x - 5} y={y - 5} width="10" height="10" rx="2" fill={fill} stroke="#101a2e" strokeWidth="1"><title>{`${c.id} — ${CAT_STYLE[cat].label}`}</title></rect>}
              {cat === "resolved" && <circle cx={x} cy={y} r="3.5" fill={fill}><title>{`${c.id} — ${CAT_STYLE[cat].label}`}</title></circle>}
            </g>
          );
        })}
      </svg>

      <figcaption className="border-t border-white/10 px-4 py-2.5 text-[10px] leading-relaxed text-ink-400">
        {GEO_PROVENANCE} · Click a cluster to inspect its operational priority.
      </figcaption>
    </figure>
  );
}
