"use client";
/**
 * TwinGovRail — the Digital Twin's government-data rail (Task 003 Phase 2F).
 * Every lane is provenance-labelled: registry linkage (pseudonymous), consent,
 * IMD weather (whitelist-gated, SAMPLE-labelled), Soil Health Card (honest
 * CONTRACT_DEFINED), AGMARKNET mandi (SAMPLE-labelled), KVK support point.
 * Connected mode reads live adapter states from the API; standalone mirrors
 * the same states from bundled artefacts.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Case } from "@contracts";
import { useApp } from "@/lib/app";
import type { DigitalTwin } from "@/lib/twin";
import { KVKS, nearestKvks, contactStatus } from "@/lib/kvk";
import { getDistrictWeather, standaloneDistrictWeather } from "@/lib/weather";
import { getMandiPrices, standaloneMandiPrices, type MandiResult } from "@/lib/mandi";

function Lane({ title, state, children }: { title: string; state: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-sand-300 p-3">
      <div className="flex flex-wrap items-center justify-between gap-1">
        <p className="text-xs font-extrabold text-ink-900">{title}</p>
        <span className="chip bg-ink-800/10 text-ink-700">{state}</span>
      </div>
      <div className="mt-1 text-xs text-ink-700">{children}</div>
    </div>
  );
}

export function TwinGovRail({ twin }: { twin: DigitalTwin }) {
  const app = useApp();
  const connected = app.apiMode === "api-connected";
  const plot = twin.plot;
  const latestCase: Case | undefined = twin.cases[twin.cases.length - 1];
  const crop = twin.season?.crop ?? latestCase?.crop ?? "bajra";

  // IMD weather — same hierarchy both modes
  const [weather, setWeather] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    if (connected) {
      getDistrictWeather(plot.district).then(setWeather).catch(() => setWeather(null));
    }
  }, [connected, plot.district]);
  const w = connected
    ? (weather as ReturnType<typeof standaloneDistrictWeather> | null)
    : standaloneDistrictWeather(plot.district);

  // AGMARKNET — crop quotes
  const [mandi, setMandi] = useState<MandiResult | null>(null);
  useEffect(() => {
    if (connected) {
      getMandiPrices(crop, plot.district).then(setMandi).catch(() => setMandi(null));
    }
  }, [connected, crop, plot.district]);
  const m = connected ? mandi : standaloneMandiPrices(crop, plot.district);

  const kvk = nearestKvks(plot.lat, plot.lon, plot.district, 1)[0];
  const consent = latestCase?.consent as { given?: boolean; channel?: string; purposeNote?: string } | undefined;

  return (
    <section className="card p-4" aria-label="Government data rail">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-extrabold text-ink-900">Government data rail</h3>
        <span className={`chip ${connected ? "bg-leaf-100 text-leaf-700" : "bg-ink-800/10 text-ink-700"}`}>
          {connected ? "CONNECTED DEMO BACKEND" : "STANDALONE — bundled artefacts"}
        </span>
      </div>
      <p className="mt-0.5 text-[10px] text-ink-500">Every lane carries its provenance. Nothing here implies a live government connection.</p>

      <div className="mt-3 grid gap-2.5 md:grid-cols-2">
        <Lane title="Registry linkage (pseudonymous)" state="SIMULATED IDS">
          plot <span className="font-mono font-bold">{plot.id}</span> · farmer <span className="font-mono">{twin.farmer?.pseudonym ?? "—"}</span> ({twin.farmer?.id})<br />
          {plot.district} / {plot.block} · coords privacy-rounded in all exports<br />
          <span className="text-[10px] text-ink-500">e-Dharti/ULPIN + AgriStack linkage: CONTRACT_DEFINED (see Integrations) — no live registry read claimed.</span>
        </Lane>

        <Lane title="Consent" state={consent?.given ? "CONSENT RECORDED (demo)" : "NO CASE CONSENT YET"}>
          {consent?.given
            ? <>purpose: {consent.purposeNote ?? "crop-health"} · channel: {consent.channel ?? "—"} · pseudonymous by design</>
            : <>No case on this plot yet — consent is captured at case intake with purpose limitation.</>}
        </Lane>

        <Lane title="IMD weather (primary government source)" state={w?.state ?? "…"}>
          {w?.weather ? (
            <>
              {(w.weather as { dailyRainfallForecastMm?: number }).dailyRainfallForecastMm} mm rain forecast ·
              RH {((w.weather as { relativeHumidityPct?: { morning?: number } }).relativeHumidityPct?.morning)}% ·
              warning {(w.weather as { warningLevel?: string }).warningLevel ?? "none"}<br />
              <span className="text-[10px] font-semibold text-saffron-700">{String((w.weather as { provenance?: string }).provenance)}</span>
            </>
          ) : (
            <>No district contract for {plot.district} — state {w?.state}.</>
          )}
          <br />
          <span className="text-[10px] text-ink-500">
            fallback: {String((w?.fallback as { state?: string } | undefined)?.state ?? "—")} · evidence: imd-whitelist-evidence.json
          </span>
        </Lane>

        <Lane title="Soil Health Card" state="CONTRACT_DEFINED">
          No live SHC API is claimed. Adapter contract defined (Integrations): pH, N, P, K, OC per plot when a government
          SHC source is provisioned. Twin soil values remain labelled <span className="font-bold">SIMULATED</span>.
        </Lane>

        <Lane title={`AGMARKNET mandi — ${crop}`} state={m?.state ?? "…"}>
          {m && m.quotes.length > 0 ? (
            <>
              {m.quotes.slice(0, 2).map((q) => (
                <span key={q.mandi}>
                  {q.mandi} ({q.district}): modal <span className="font-bold">₹{q.modalPriceInrQuintal}</span>/{q.unit.split("/")[1]} · {q.arrivalDate}<br />
                </span>
              ))}
              <span className="text-[10px] font-semibold text-saffron-700">{m.provenance}</span>
            </>
          ) : (
            <>No quotes for {crop} in {plot.district} — {m?.state}.</>
          )}
        </Lane>

        <Lane title="KVK support point" state={contactStatus(kvk) === "DIRECTORY_CONTACT_LISTED" ? "DIRECTORY CONTACT LISTED" : "CONTACT NOT LISTED"}>
          {kvk.name} · ~{kvk.distanceKm} km (est.){kvk.sameDistrict ? " · same district" : ""}<br />
          <Link href="/support/" className="font-bold text-leaf-700 underline">directory + referrals →</Link>
          <span className="text-[10px] text-ink-500"> · sourced ICAR-ATARI/KVK contacts ({KVKS.length} KVKs)</span>
        </Lane>
      </div>
    </section>
  );
}
