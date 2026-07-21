// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  IMD_ATTRIBUTION, explainWeatherSuitability, standaloneDistrictWeather, weatherPolicy,
} from "../src/lib/weather";
import whitelistEvidence from "@data/reference/imd-whitelist-evidence.json";

describe("IMD weather — standalone mirror of the API hierarchy", () => {
  it("reports the genuine whitelist gate with SAMPLE-labelled contract", () => {
    const w = standaloneDistrictWeather("Jodhpur");
    expect(w.state).toBe("IMD_IP_WHITELIST_REQUIRED");
    expect(w.weather?.provenance).toContain("SAMPLE SHAPE");
    expect(w.weather?.integrationState).toBe("IMD_IP_WHITELIST_REQUIRED");
    expect(w.attribution).toBe(IMD_ATTRIBUTION);
    expect(w.whitelistEvidence).toContain("401");
    expect((w.fallback as { state: string }).state).toBe("NON_GOVERNMENT_WEATHER_FALLBACK");
  });

  it("whitelist evidence artefact is the genuine 401 capture", () => {
    expect(whitelistEvidence.response.httpStatus).toBe(401);
    expect(whitelistEvidence.response.bodyExcerpt.toLowerCase()).toContain("whitelist");
    expect(whitelistEvidence.conclusion).toBe("IMD_IP_WHITELIST_REQUIRED");
  });

  it("explainWeatherSuitability matches the API rules (same numbers)", () => {
    const w = standaloneDistrictWeather("Jodhpur");
    const ex = explainWeatherSuitability({ weatherSuitability: 0.4 }, w.weather, w.state, 0.1);
    // rain 18.2 ≥ 10 and RH 82 ≥ 75 → moisture hit; YELLOW → 0.1
    // raw = 0.2 + 0.5 + 0.1 = 0.8; whitelist multiplier 0.5 → 0.4 + 0.4*0.5 = 0.6
    expect(ex.prior).toBe(0.4);
    expect(ex.new).toBeCloseTo(0.6, 5);
    expect(ex.scoreEffectPoints).toBeCloseTo(2.0, 5);
    expect(ex.reason).toContain("Weather suitability: 0.4 → 0.6");
    expect(ex.variablesUsed.some((v) => v.includes("dailyRainfallForecastMm"))).toBe(true);
    expect(ex.variablesUsed.some((v) => v.includes("warningLevel=YELLOW"))).toBe(true);
    expect(ex.freshness?.issueTime).toBeTruthy();
    expect(ex.policyVersion).toBe("weather-risk/v1");
  });

  it("SIMULATED_WEATHER never moves the score", () => {
    const ex = explainWeatherSuitability({ weatherSuitability: 0.7 }, null, "SIMULATED_WEATHER", 0.1);
    expect(ex.new).toBe(ex.prior);
    expect(ex.scoreEffectPoints).toBe(0);
    expect(ex.reason).toContain("multiplier 0");
  });

  it("fallback sources move the score less than official data (policy multipliers)", () => {
    const mult = weatherPolicy.stateMultipliers as Record<string, number>;
    expect(mult.LIVE_IMD_API).toBeGreaterThan(mult.NON_GOVERNMENT_WEATHER_FALLBACK);
    expect(mult.NON_GOVERNMENT_WEATHER_FALLBACK).toBeGreaterThan(mult.SIMULATED_WEATHER);
    expect(mult.SIMULATED_WEATHER).toBe(0);
  });
});
