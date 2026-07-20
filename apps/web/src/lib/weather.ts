"use client";
/**
 * IMD government-weather — client side (Task 003 Phase 2C).
 * Connected mode uses the API (authoritative, holds credentials/probes).
 * Standalone mode mirrors the same hierarchy honestly from bundled artefacts:
 * the genuine whitelist-gate evidence + the labelled SAMPLE shape, with
 * Open-Meteo only ever shown as NON_GOVERNMENT_WEATHER_FALLBACK.
 */
import weatherPolicy from "@data/policy/weather-risk.json";
import imdSample from "@data/reference/imd-sample-district-forecast.json";
import whitelistEvidence from "@data/reference/imd-whitelist-evidence.json";
import snapshot from "@data/reference/public-data-snapshot.json";
import { getJson } from "./httpProvider";
import type { OutbreakCluster } from "@contracts";

export type WeatherState =
  | "LIVE_IMD_API" | "CACHED_IMD_DATA" | "IMD_IP_WHITELIST_REQUIRED"
  | "IMD_CREDENTIALS_REQUIRED" | "IMD_PRODUCT_UNAVAILABLE" | "IMD_STALE_CACHE"
  | "NON_GOVERNMENT_WEATHER_FALLBACK" | "SIMULATED_WEATHER";

export const IMD_ATTRIBUTION =
  "Source: India Meteorological Department, Ministry of Earth Sciences, Government of India";

export const WEATHER_STATE_CHIP: Record<WeatherState, string> = {
  LIVE_IMD_API: "bg-leaf-100 text-leaf-700",
  CACHED_IMD_DATA: "bg-leaf-100 text-leaf-700",
  IMD_STALE_CACHE: "bg-saffron-100 text-saffron-700",
  IMD_IP_WHITELIST_REQUIRED: "bg-saffron-100 text-saffron-700",
  IMD_CREDENTIALS_REQUIRED: "bg-saffron-100 text-saffron-700",
  IMD_PRODUCT_UNAVAILABLE: "bg-alert-100 text-alert-700",
  NON_GOVERNMENT_WEATHER_FALLBACK: "bg-ink-800/10 text-ink-700",
  SIMULATED_WEATHER: "bg-ink-800/10 text-ink-700",
};

export interface WeatherComponent {
  component: "weatherSuitability";
  prior: number; new: number; scoreEffectPoints: number;
  sourceStatus: WeatherState;
  variablesUsed: string[]; reason: string;
  freshness: { issueTime?: string | null; fetchedAt?: string | null; cacheAgeSec?: number | null } | null;
  fieldAccessRisk: string | null;
  policyVersion: string;
}

export interface ClusterWeatherContext {
  clusterId: string; district: string;
  weather: Record<string, unknown> & { state: WeatherState; weather?: Record<string, unknown> | null };
  weatherComponent: WeatherComponent;
  provenance: string;
}

export function getDistrictWeather(district: string): Promise<Record<string, unknown>> {
  return getJson(`/api/v1/integrations/weather?district=${encodeURIComponent(district)}`);
}

export function getClusterWeatherContext(clusterId: string): Promise<ClusterWeatherContext> {
  return getJson(`/api/v1/outbreaks/${clusterId}/weather-context`);
}

// ---------------------------------------------------------------------------
// Standalone mirror of apps/api/app/imd.py::weather_suitability_explanation
// ---------------------------------------------------------------------------

type Policy = typeof weatherPolicy;

export function explainWeatherSuitability(
  cluster: Pick<OutbreakCluster, "weatherSuitability">,
  weather: Record<string, unknown> | null,
  state: WeatherState,
  engineWeatherWeight: number,
  policy: Policy = weatherPolicy,
): WeatherComponent {
  const prior = Number(cluster.weatherSuitability ?? 0);
  const base: WeatherComponent = {
    component: "weatherSuitability", prior, new: prior, scoreEffectPoints: 0,
    sourceStatus: state, variablesUsed: [],
    reason: "No usable weather signal — component unchanged.",
    freshness: null, fieldAccessRisk: null, policyVersion: policy.version,
  };
  if (!weather || state === "SIMULATED_WEATHER") {
    if (state === "SIMULATED_WEATHER") base.reason = "Seeded demo weather — policy multiplier 0, component unchanged.";
    return base;
  }

  const assoc = policy.associations;
  const m = assoc.moistureSensitiveDiseaseRisk;
  const w = assoc.warningDrivenUrgency;
  const variables: string[] = [];
  let moistureHit = false;
  const rain = weather.dailyRainfallForecastMm as number | undefined;
  const rh = (weather.relativeHumidityPct as { morning?: number } | undefined)?.morning;
  if (rain != null) {
    variables.push(`dailyRainfallForecastMm=${rain} (threshold ${m.rainfallForecastMmThreshold})`);
    moistureHit = moistureHit || rain >= m.rainfallForecastMmThreshold;
  }
  if (rh != null) {
    variables.push(`rhMorningPct=${rh} (threshold ${m.humidityPctThreshold})`);
    moistureHit = moistureHit || rh >= m.humidityPctThreshold;
  }
  const warnLevel = String(weather.warningLevel ?? "").toUpperCase() as keyof typeof w.levelWeights;
  const warnWeight = w.levelWeights[warnLevel] ?? 0;
  if (warnLevel) variables.push(`warningLevel=${warnLevel}`);

  const raw = Math.max(0, Math.min(1,
    policy.baselineSuitability + (moistureHit ? m.weight : 0) + warnWeight * w.weight));
  const multiplier = (policy.stateMultipliers as Record<string, number>)[state] ?? 0;
  const next = Math.round((prior + (raw - prior) * multiplier) * 1000) / 1000;
  const effect = Math.round((next - prior) * engineWeatherWeight * 1000) / 10;

  const reasons: string[] = [];
  if (moistureHit) reasons.push("elevated rainfall/humidity during the cluster period (moisture-sensitive disease risk)");
  if (warnWeight) reasons.push(`official ${warnLevel} warning in force (warning-driven mission urgency)`);
  if (reasons.length === 0) reasons.push("no elevated moisture or warning signal");
  const sourceDesc = state === "LIVE_IMD_API" || state === "CACHED_IMD_DATA"
    ? "official district product" : "non-official/sample weather source";

  const fa = assoc.windRainFieldAccessRisk;
  const wind = weather.windKmh as number | undefined;
  const fieldAccess =
    (wind != null && wind >= fa.windKmhThreshold) || (rain != null && rain >= fa.rainfallMmThreshold)
      ? `wind ${wind} km/h / rain ${rain} mm — field-mission access degraded (operational context, not scored)`
      : null;

  return {
    ...base, new: next, scoreEffectPoints: effect, variablesUsed: variables,
    reason: `Weather suitability: ${prior} → ${next} because the ${sourceDesc} indicates ${reasons.join("; ")}. Source status ${state} (policy multiplier ${multiplier}).`,
    freshness: {
      issueTime: (weather.issueTime as string) ?? null,
      fetchedAt: (weather.fetchedAt as string) ?? null,
      cacheAgeSec: (weather.cacheAgeSec as number) ?? null,
    },
    fieldAccessRisk: fieldAccess,
  };
}

/** Standalone weather contract for a district, mirroring the server hierarchy
 * with the bundled artefacts (sample shape labelled SAMPLE — never IMD data). */
export function standaloneDistrictWeather(district: string): {
  state: WeatherState; weather: Record<string, unknown> | null;
  attribution: string; whitelistEvidence: string; fallback: Record<string, unknown>;
} {
  const om = (snapshot.sources as Record<string, { status: string }>).open_meteo_jodhpur;
  const sampleDistrict = (imdSample.district as string).toLowerCase();
  const weather = sampleDistrict === district.toLowerCase()
    ? {
        district: imdSample.district,
        issueTime: imdSample.issueTime,
        validFrom: imdSample.validFrom,
        validTo: imdSample.validTo,
        dailyRainfallForecastMm: imdSample.days[0]?.rainfallForecastMm,
        observedRainfallMm24h: imdSample.observedRainfallMm24h,
        warningLevel: imdSample.warnings[0]?.level,
        warningType: imdSample.warnings[0]?.type,
        temperatureC: { max: imdSample.days[0]?.tMaxC, min: imdSample.days[0]?.tMinC },
        relativeHumidityPct: { morning: imdSample.days[0]?.rhMorningPct, evening: imdSample.days[0]?.rhEveningPct },
        windKmh: imdSample.days[0]?.windKmh,
        sourceProduct: imdSample.sourceProduct,
        stationOrDistrictId: imdSample.stationOrDistrictId,
        attribution: imdSample.attribution,
        integrationState: "IMD_IP_WHITELIST_REQUIRED",
        provenance: "SAMPLE SHAPE — awaiting first whitelisted capture (not official data)",
      }
    : null;
  return {
    state: "IMD_IP_WHITELIST_REQUIRED",
    weather,
    attribution: IMD_ATTRIBUTION,
    whitelistEvidence: `data/reference/imd-whitelist-evidence.json (HTTP ${whitelistEvidence.response.httpStatus} captured ${whitelistEvidence.meta.capturedAtUtc})`,
    fallback: om?.status === "LIVE_FETCHED"
      ? { state: "NON_GOVERNMENT_WEATHER_FALLBACK", provider: "Open-Meteo (open data, CC-BY 4.0 — NOT a government source)", current: (om as Record<string, unknown>).current }
      : { state: "SIMULATED_WEATHER", note: "seeded demo weather only" },
  };
}

export { weatherPolicy };
