"""IMD government-weather adapter (Task 003 Phase 2C).

IMD is the PRIMARY government weather/agromet source. Source hierarchy:
  1. documented official IMD API (data.gov.in OGD-hosted IMD product when a
     DATAGOVIN_API_KEY is configured)              → LIVE_IMD_API
  2. documented IMD direct endpoint (mausam.imd.gov.in) — this environment
     receives the genuine HTTP 401 whitelist gate  → IMD_IP_WHITELIST_REQUIRED
  3. cached OFFICIAL IMD response/bulletin (when a real capture exists in
     data/reference/imd-cached-<district>.json)    → CACHED_IMD_DATA / IMD_STALE_CACHE
  4. Open-Meteo snapshot (open data, NOT IMD)      → NON_GOVERNMENT_WEATHER_FALLBACK
  5. labelled seeded demo weather                  → SIMULATED_WEATHER

Honesty rules:
  * Fallback data is never promoted to an IMD label.
  * The bundled imd-sample-district-forecast.json is a labelled SAMPLE SHAPE
    (awaiting first whitelisted capture) — it demonstrates parsing/scoring and
    is never reported as CACHED_IMD_DATA. The real whitelist gate is
    evidenced in data/reference/imd-whitelist-evidence.json (genuine capture).
  * Attribution string is always shown with source product, issue time,
    fetch time and cache age.
"""
from __future__ import annotations

import hashlib
import json
import os
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Optional

STATE_LIVE = "LIVE_IMD_API"
STATE_CACHED = "CACHED_IMD_DATA"
STATE_WHITELIST = "IMD_IP_WHITELIST_REQUIRED"
STATE_CREDS = "IMD_CREDENTIALS_REQUIRED"
STATE_PRODUCT = "IMD_PRODUCT_UNAVAILABLE"
STATE_STALE = "IMD_STALE_CACHE"
STATE_FALLBACK = "NON_GOVERNMENT_WEATHER_FALLBACK"
STATE_SIMULATED = "SIMULATED_WEATHER"

IMD_ATTRIBUTION = "Source: India Meteorological Department, Ministry of Earth Sciences, Government of India"
IMD_DOC_URL = "https://mausam.imd.gov.in/api/current_wx_api.php"
STALE_AFTER_SEC = 48 * 3600
REF_DIR = Path(__file__).resolve().parents[3] / "data" / "reference"

GetTransport = Callable[[str, float], tuple[int, str]]


def _urllib_get(url: str, timeout: float) -> tuple[int, str]:
    req = urllib.request.Request(url, headers={"User-Agent": "FarmGraph-Rakshak-integration-probe/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:  # noqa: S310 (official endpoints only)
        return resp.status, resp.read().decode(errors="replace")


def _parse_dt(s: str | None) -> Optional[datetime]:
    if not s:
        return None
    try:
        return datetime.fromisoformat(s)
    except ValueError:
        return None


class ImdAdapter:
    def __init__(self, env: Optional[dict[str, str]] = None, transport: Optional[GetTransport] = None,
                 ref_dir: Path = REF_DIR, open_meteo_snapshot: Optional[dict[str, Any]] = None):
        env = env if env is not None else os.environ
        self.enabled = env.get("IMD_ENABLED", "").lower() in ("1", "true", "yes")
        self.imd_url = env.get("IMD_API_URL", IMD_DOC_URL)
        self.datagov_key = env.get("DATAGOV_API_KEY") or env.get("DATAGOVIN_API_KEY", "")
        self.datagov_resource = env.get("IMD_DATAGOV_RESOURCE_ID", "")
        self.timeout = float(env.get("IMD_TIMEOUT_SEC", "12"))
        self.probe_ttl = float(env.get("IMD_PROBE_TTL_SEC", "21600"))  # 6h
        self.transport: GetTransport = transport or _urllib_get
        self.ref_dir = Path(ref_dir)
        self.open_meteo = open_meteo_snapshot
        self._probe_cache: tuple[float, dict[str, Any]] | None = None

    # ---------------- official source attempts ----------------
    def _probe_official(self) -> dict[str, Any]:
        """Attempt the documented IMD endpoint; cache the verdict."""
        if self._probe_cache and time.monotonic() - self._probe_cache[0] < self.probe_ttl:
            return self._probe_cache[1]
        verdict: dict[str, Any]
        try:
            status, body = self.transport(self.imd_url, self.timeout)
        except (urllib.error.URLError, OSError, TimeoutError) as exc:
            verdict = {"state": STATE_PRODUCT, "detail": f"endpoint unreachable: {exc}"}
        else:
            if status == 401 and "whitelist" in body.lower():
                verdict = {"state": STATE_WHITELIST,
                           "detail": "official IMD endpoint answered HTTP 401 — IP/domain whitelisting required",
                           "evidence": "data/reference/imd-whitelist-evidence.json"}
            elif status == 200:
                verdict = {"state": "PROBE_OK", "detail": "endpoint reachable", "body": body}
            else:
                verdict = {"state": STATE_PRODUCT, "detail": f"unexpected HTTP {status}"}
        self._probe_cache = (time.monotonic(), verdict)
        return verdict

    def _try_datagov_live(self, district: str) -> Optional[dict[str, Any]]:
        """OGD-hosted IMD product via data.gov.in (needs DATAGOV_API_KEY)."""
        if not self.datagov_key:
            return {"state": STATE_CREDS, "detail": "DATAGOV_API_KEY not configured for OGD-hosted IMD product"}
        if not self.enabled or not self.datagov_resource:
            return None  # fall through to direct probe
        url = (f"https://api.data.gov.in/resource/{self.datagov_resource}"
               f"?api-key={self.datagov_key}&format=json&limit=5&filters[district]={district}")
        try:
            status, body = self.transport(url, self.timeout)
        except (urllib.error.URLError, OSError, TimeoutError) as exc:
            return {"state": STATE_PRODUCT, "detail": f"data.gov.in unreachable: {exc}"}
        if status in (401, 403):
            return {"state": STATE_CREDS, "detail": f"data.gov.in rejected the key (HTTP {status})"}
        if status != 200:
            return {"state": STATE_PRODUCT, "detail": f"data.gov.in HTTP {status}"}
        return {"state": STATE_LIVE, "raw": body, "fetchedAt": datetime.now(timezone.utc).isoformat(timespec="seconds")}

    # ---------------- cached/sample artefacts ----------------
    def _cached_official(self, district: str) -> Optional[dict[str, Any]]:
        """A REAL cached official capture — only files named imd-cached-* count
        (the bundled sample shape is explicitly excluded by name)."""
        path = self.ref_dir / f"imd-cached-{district.lower()}.json"
        if not path.exists():
            return None
        try:
            doc = json.loads(path.read_text())
        except json.JSONDecodeError:
            return None
        fetched = _parse_dt(doc.get("fetchedAt") or (doc.get("meta") or {}).get("fetchedAt"))
        age = (datetime.now(timezone.utc) - fetched).total_seconds() if fetched else None
        state = STATE_CACHED if (age is not None and age <= STALE_AFTER_SEC) else STATE_STALE
        return {"state": state, "doc": doc, "cacheAgeSec": age, "source": str(path.name)}

    def _sample_shape(self) -> Optional[dict[str, Any]]:
        path = self.ref_dir / "imd-sample-district-forecast.json"
        if not path.exists():
            return None
        try:
            return json.loads(path.read_text())
        except json.JSONDecodeError:
            return None

    # ---------------- normalisation ----------------
    @staticmethod
    def _normalise(doc: dict[str, Any], *, state: str, fetched_at: str | None,
                   cache_age: float | None, provenance: str) -> dict[str, Any]:
        days = doc.get("days") or []
        today = days[0] if days else {}
        warnings = doc.get("warnings") or []
        warn = warnings[0] if warnings else {}
        raw = json.dumps(doc, sort_keys=True).encode()
        fields = {
            "district": doc.get("district"),
            "issueTime": doc.get("issueTime"),
            "validFrom": doc.get("validFrom"),
            "validTo": doc.get("validTo"),
            "dailyRainfallForecastMm": today.get("rainfallForecastMm"),
            "observedRainfallMm24h": doc.get("observedRainfallMm24h"),
            "warningLevel": warn.get("level"),
            "warningType": warn.get("type"),
            "nowcast": doc.get("nowcast"),
            "temperatureC": {"max": today.get("tMaxC"), "min": today.get("tMinC")} if today else None,
            "relativeHumidityPct": {"morning": today.get("rhMorningPct"), "evening": today.get("rhEveningPct")} if today else None,
            "windKmh": today.get("windKmh"),
            "sourceProduct": doc.get("sourceProduct"),
            "stationOrDistrictId": doc.get("stationOrDistrictId"),
        }
        present = sum(1 for v in fields.values() if v not in (None, {}, []))
        fields["attribution"] = doc.get("attribution", IMD_ATTRIBUTION)
        fields["fetchedAt"] = fetched_at
        fields["cacheAgeSec"] = round(cache_age) if cache_age is not None else None
        fields["responseHash"] = hashlib.sha256(raw).hexdigest()
        fields["dataCompleteness"] = round(present / 14, 2)
        fields["integrationState"] = state
        fields["provenance"] = provenance
        fields["dailyForecast"] = days
        return fields

    # ---------------- public contract ----------------
    def district_weather(self, district: str) -> dict[str, Any]:
        now_iso = datetime.now(timezone.utc).isoformat(timespec="seconds")
        result: dict[str, Any] = {
            "district": district,
            "attribution": IMD_ATTRIBUTION,
            "officialSourceReference": IMD_DOC_URL,
            "evaluatedAt": now_iso,
            "fallback": None,
        }

        # 1. live OGD-hosted IMD product (only reachable with a key)
        live = self._try_datagov_live(district)
        if live and live["state"] == STATE_LIVE:
            result.update(state=STATE_LIVE, weather={
                "district": district, "integrationState": STATE_LIVE,
                "rawResponseHash": hashlib.sha256(live["raw"].encode()).hexdigest(),
                "fetchedAt": live["fetchedAt"], "attribution": IMD_ATTRIBUTION,
                "provenance": "LIVE official data.gov.in IMD product",
            })
            return result

        # 2. documented direct endpoint — genuine whitelist gate in this environment
        probe = self._probe_official()
        gate_state = probe["state"]
        gate_detail = probe["detail"]

        # 3. real cached official capture (none bundled yet — honest)
        cached = self._cached_official(district)
        if cached:
            doc = cached["doc"]
            result.update(
                state=cached["state"],
                weather=self._normalise(doc, state=cached["state"],
                                        fetched_at=doc.get("fetchedAt"),
                                        cache_age=cached["cacheAgeSec"],
                                        provenance=f"CACHED official IMD capture ({cached['source']})"),
            )
            return result

        # 4. labelled SAMPLE SHAPE demonstrates the contract — never CACHED_IMD_DATA
        sample = self._sample_shape()
        weather = None
        if sample and (sample.get("district", "").lower() == district.lower()):
            weather = self._normalise(
                sample, state=gate_state, fetched_at=None, cache_age=None,
                provenance="SAMPLE SHAPE — awaiting first whitelisted capture (not official data)")

        result.update(
            state=gate_state,
            stateDetail=gate_detail,
            weather=weather,
            whitelistEvidence=probe.get("evidence"),
            activationNote=("To activate: request IMD IP whitelisting (or configure DATAGOV_API_KEY for the "
                            "OGD-hosted IMD product) — see docs/integrations/imd.md"),
        )

        # 5. Open-Meteo fallback — separately labelled, never IMD
        if self.open_meteo and self.open_meteo.get("status") == "LIVE_FETCHED":
            cur = self.open_meteo.get("current") or {}
            result["fallback"] = {
                "state": STATE_FALLBACK,
                "provider": "Open-Meteo (open data, CC-BY 4.0 — NOT a government source)",
                "current": cur,
                "location": self.open_meteo.get("location"),
                "fetchedAt": self.open_meteo.get("fetchedAt"),
                "note": "Operational fallback only; never promoted to an IMD label.",
            }
        else:
            result["fallback"] = {"state": STATE_SIMULATED, "note": "seeded demo weather only"}
        return result


# ---------------------------------------------------------------------------
# Explainable outbreak-score weather component (conservative generic rules)
# ---------------------------------------------------------------------------

def weather_suitability_explanation(cluster: dict[str, Any], weather: Optional[dict[str, Any]],
                                    state: str, policy: dict[str, Any],
                                    engine_weather_weight: float) -> dict[str, Any]:
    """Show prior→new for the weatherSuitability component with exact
    variables, reason, score effect and freshness. SIMULATED_WEATHER and
    missing weather never move the score."""
    prior = float(cluster.get("weatherSuitability", 0.0))
    base = {
        "component": "weatherSuitability",
        "prior": prior,
        "new": prior,
        "scoreEffectPoints": 0.0,
        "sourceStatus": state,
        "variablesUsed": [],
        "reason": "No usable weather signal — component unchanged.",
        "freshness": None,
        "fieldAccessRisk": None,
        "policyVersion": policy.get("version"),
    }
    if not weather or state == STATE_SIMULATED:
        if state == STATE_SIMULATED:
            base["reason"] = "Seeded demo weather — policy multiplier 0, component unchanged."
        return base

    assoc = policy["associations"]
    m = assoc["moistureSensitiveDiseaseRisk"]
    w = assoc["warningDrivenUrgency"]
    variables: list[str] = []
    moisture_hit = False
    rain = weather.get("dailyRainfallForecastMm")
    rh = (weather.get("relativeHumidityPct") or {}).get("morning")
    if rain is not None:
        variables.append(f"dailyRainfallForecastMm={rain} (threshold {m['rainfallForecastMmThreshold']})")
        moisture_hit = moisture_hit or rain >= m["rainfallForecastMmThreshold"]
    if rh is not None:
        variables.append(f"rhMorningPct={rh} (threshold {m['humidityPctThreshold']})")
        moisture_hit = moisture_hit or rh >= m["humidityPctThreshold"]
    warn_level = (weather.get("warningLevel") or "").upper()
    warn_weight = w["levelWeights"].get(warn_level, 0.0)
    if warn_level:
        variables.append(f"warningLevel={warn_level}")

    raw = policy["baselineSuitability"] + (m["weight"] if moisture_hit else 0.0) + warn_weight * w["weight"]
    raw = max(0.0, min(1.0, raw))
    multiplier = (policy.get("stateMultipliers") or {}).get(state, 0.0)
    new = round(prior + (raw - prior) * multiplier, 3)
    effect = round((new - prior) * engine_weather_weight * 100.0, 1)

    reasons = []
    if moisture_hit:
        reasons.append("elevated rainfall/humidity during the cluster period (moisture-sensitive disease risk)")
    if warn_weight:
        reasons.append(f"official {warn_level} warning in force (warning-driven mission urgency)")
    if not reasons:
        reasons.append("no elevated moisture or warning signal")
    reason = (f"Weather suitability: {prior} → {new} because the "
              f"{'official district product' if state in (STATE_LIVE, STATE_CACHED) else 'non-official/sample weather source'} "
              f"indicates {'; '.join(reasons)}. Source status {state} (policy multiplier {multiplier}).")

    fa = assoc["windRainFieldAccessRisk"]
    field_access = None
    wind = weather.get("windKmh")
    if (wind is not None and wind >= fa["windKmhThreshold"]) or (rain is not None and rain >= fa["rainfallMmThreshold"]):
        field_access = f"wind {wind} km/h / rain {rain} mm — field-mission access degraded (operational context, not scored)"

    return {
        **base,
        "new": new,
        "scoreEffectPoints": effect,
        "variablesUsed": variables,
        "reason": reason,
        "freshness": {"issueTime": weather.get("issueTime"), "fetchedAt": weather.get("fetchedAt"),
                      "cacheAgeSec": weather.get("cacheAgeSec")},
        "fieldAccessRisk": field_access,
    }
