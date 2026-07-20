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
  suspected: { fill: "#e08a00", label: "Suspected / AI-triaged" },
  verified: { fill: "#2f7d3a", label: "Expert-verified" },
  unknown: { fill: "#5b6472", label: "Unknown" },
  resolved: { fill: "#b7ad99", label: "Resolved / closed" },
} as const;

export function MapView({
  cases, clusters, selectedCluster, onSelectCluster, height = 420,
}: {
  cases: Case[];
  clusters: ClusterWithScore[];
  selectedCluster?: string | null;
  onSelectCluster?: (id: string) => void;
  height?: number;
}) {
  return (
    <figure className="card p-3">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="w-full"
        style={{ height }}
        role="img"
        aria-label="Pilot geospatial view of Rajasthan with demo case and cluster markers"
      >
        <rect x="0" y="0" width={VIEW_W} height={VIEW_H} fill="#f4efe3" rx="8" />
        <path d={outlinePath()} fill="#ece5d3" stroke="#8b7d63" strokeWidth="1.6" />
        {DISTRICT_REFS.map((d) => {
          const [x, y] = project(d.lat, d.lon);
          return (
            <g key={d.name}>
              <rect x={x - 3} y={y - 3} width="6" height="6" fill="#17233b" transform={`rotate(45 ${x} ${y})`} />
              <text x={x + 8} y={y + 4} fontSize="13" fontWeight="700" fill="#17233b">{d.name}</text>
            </g>
          );
        })}
        {clusters.map((cl) => {
          const [x, y] = project(cl.centerLat, cl.centerLon);
          const r = (cl.radiusKm / 111) * (VIEW_W / 9.6); // rough deg->px at this scale
          const active = selectedCluster === cl.id;
          const stroke = cl.status === "VERIFIED" ? "#b3261e" : cl.status === "DISMISSED" ? "#8b8578" : "#c77400";
          return (
            <g key={cl.id}>
              <circle cx={x} cy={y} r={r} fill={stroke} fillOpacity={cl.status === "DISMISSED" ? 0.05 : 0.12} stroke={stroke} strokeWidth={active ? 3 : 1.8} strokeDasharray={cl.status === "DISMISSED" ? "6 5" : undefined} />
              <circle cx={x} cy={y} r="5" fill={stroke} />
              <text x={x} y={y - r - 6} fontSize="12" fontWeight="800" fill={stroke} textAnchor="middle">
                {cl.id} · {cl.score.score}
              </text>
              {onSelectCluster && (
                <circle cx={x} cy={y} r={Math.max(r, 18)} fill="transparent" className="cursor-pointer" onClick={() => onSelectCluster(cl.id)}>
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
              {cat === "suspected" && <path d={`M${x},${y - 6} L${x + 6},${y + 5} L${x - 6},${y + 5} Z`} fill={fill} stroke="#17233b" strokeWidth="0.8"><title>{`${c.id} — ${CAT_STYLE[cat].label}`}</title></path>}
              {cat === "verified" && <circle cx={x} cy={y} r="5.5" fill={fill} stroke="#17233b" strokeWidth="0.8"><title>{`${c.id} — ${CAT_STYLE[cat].label}`}</title></circle>}
              {cat === "unknown" && <rect x={x - 5} y={y - 5} width="10" height="10" rx="2" fill={fill} stroke="#17233b" strokeWidth="0.8"><title>{`${c.id} — ${CAT_STYLE[cat].label}`}</title></rect>}
              {cat === "resolved" && <circle cx={x} cy={y} r="3.2" fill={fill}><title>{`${c.id} — ${CAT_STYLE[cat].label}`}</title></circle>}
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-600">
        {(Object.keys(CAT_STYLE) as (keyof typeof CAT_STYLE)[]).map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ background: CAT_STYLE[k].fill }} aria-hidden="true" />
            {CAT_STYLE[k].label}
          </span>
        ))}
        <span className="basis-full text-[11px] text-ink-500">{GEO_PROVENANCE}</span>
      </figcaption>
    </figure>
  );
}
