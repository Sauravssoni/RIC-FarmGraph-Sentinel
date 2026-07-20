"use client";
/**
 * WeatherContext — explainable IMD weather component for an outbreak cluster
 * (Task 003 Phase 2C). Connected: API weather-context endpoint. Standalone:
 * identical computation from bundled artefacts (whitelist evidence + labelled
 * SAMPLE shape + Open-Meteo fallback). Always shows prior→new with reason,
 * variables, score effect, freshness and exact source status.
 */
import { useEffect, useState } from "react";
import demoPolicy from "@data/demo/policy.json";
import type { OutbreakCluster } from "@contracts";
import { useApp } from "@/lib/app";
import {
  IMD_ATTRIBUTION, WEATHER_STATE_CHIP, explainWeatherSuitability,
  getClusterWeatherContext, standaloneDistrictWeather,
  type WeatherComponent, type WeatherState,
} from "@/lib/weather";

const ENGINE_WEATHER_WEIGHT = (demoPolicy.outbreak.weights as Record<string, number>).weatherSuitability ?? 0.1;

interface Display {
  state: WeatherState;
  component: WeatherComponent;
  fallbackNote: string | null;
  evidenceNote: string | null;
}

export function WeatherContextPanel({ cluster, district }: { cluster: OutbreakCluster; district: string }) {
  const app = useApp();
  const connected = app.apiMode === "api-connected";
  const [display, setDisplay] = useState<Display | null>(null);
  const [apiFailed, setApiFailed] = useState(false);

  useEffect(() => {
    if (!connected) return;
    setApiFailed(false);
    getClusterWeatherContext(cluster.id)
      .then((ctx) => setDisplay({
        state: ctx.weather.state,
        component: ctx.weatherComponent,
        fallbackNote: null,
        evidenceNote: null,
      }))
      .catch(() => setApiFailed(true));
  }, [connected, cluster.id]);

  // Standalone (or API failure fallback): same computation from bundled artefacts.
  if (!connected || apiFailed) {
    const w = standaloneDistrictWeather(district);
    const component = explainWeatherSuitability(cluster, w.weather, w.state, ENGINE_WEATHER_WEIGHT);
    const fb = w.fallback as { state: string; provider?: string; note?: string };
    const standaloneDisplay: Display = {
      state: w.state,
      component,
      fallbackNote: fb.provider ? `${fb.state} — ${fb.provider}` : `${fb.state} — ${fb.note ?? ""}`,
      evidenceNote: `Whitelist gate evidence: ${w.whitelistEvidence}`,
    };
    return <WeatherContextView display={standaloneDisplay} mode={apiFailed ? "api-failed-fallback" : "standalone"} />;
  }

  if (!display) return null;
  return <WeatherContextView display={display} mode="connected" />;
}

function WeatherContextView({ display, mode }: { display: Display; mode: "connected" | "standalone" | "api-failed-fallback" }) {
  const { component: c, state } = display;
  return (
    <div className="rounded-lg border border-sand-300 bg-sand-50 p-3" aria-label="Weather context">
      <div className="flex flex-wrap items-center gap-1.5">
        <h4 className="text-sm font-extrabold text-ink-900">IMD weather context</h4>
        <span className={`chip ${WEATHER_STATE_CHIP[state]}`}>{state}</span>
        {mode !== "connected" && (
          <span className="chip bg-ink-800/10 text-ink-700">{mode === "standalone" ? "standalone — same rules, bundled artefacts" : "API unreachable — standalone computation"}</span>
        )}
      </div>
      <p className="mt-1 text-[10px] text-ink-500">{IMD_ATTRIBUTION}</p>

      <div className="mt-2 flex items-baseline gap-2 text-sm">
        <span className="font-bold tabular-nums">{c.prior} → {c.new}</span>
        <span className="text-xs text-ink-500">weatherSuitability component</span>
        {c.scoreEffectPoints !== 0 && (
          <span className={`chip ${c.scoreEffectPoints > 0 ? "bg-alert-100 text-alert-700" : "bg-leaf-100 text-leaf-700"}`}>
            {c.scoreEffectPoints > 0 ? "+" : ""}{c.scoreEffectPoints} pts on outbreak score
          </span>
        )}
        {c.scoreEffectPoints === 0 && <span className="chip bg-ink-800/10 text-ink-700">no score movement</span>}
      </div>
      <p className="mt-1 text-xs text-ink-700">{c.reason}</p>
      {c.variablesUsed.length > 0 && (
        <ul className="mt-1 list-inside list-disc text-[11px] text-ink-600">
          {c.variablesUsed.map((v) => <li key={v}>{v}</li>)}
        </ul>
      )}
      {c.freshness?.issueTime && (
        <p className="mt-1 text-[10px] text-ink-500">
          product issued {c.freshness.issueTime}{c.freshness.fetchedAt ? ` · fetched ${c.freshness.fetchedAt}` : ""}
          {c.freshness.cacheAgeSec != null ? ` · cache age ${c.freshness.cacheAgeSec}s` : ""}
        </p>
      )}
      {c.fieldAccessRisk && (
        <p className="mt-1 rounded bg-saffron-50 px-2 py-1 text-[11px] font-semibold text-saffron-700">{c.fieldAccessRisk}</p>
      )}
      {display.fallbackNote && <p className="mt-1 text-[10px] text-ink-500">Fallback: {display.fallbackNote}</p>}
      {display.evidenceNote && <p className="mt-0.5 text-[10px] text-ink-500">{display.evidenceNote}</p>}
    </div>
  );
}
