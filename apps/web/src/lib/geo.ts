/**
 * Pilot geospatial view: simplified Rajasthan outline (Natural Earth 10m,
 * public domain — see data/geo/rajasthan-outline.geojson properties).
 * District polygons are deliberately NOT shown (not reliably sourced);
 * district HQs are reference points with real coordinates.
 */
import geojson from "@data/geo/rajasthan-outline.geojson";

export interface GeoPoint { lat: number; lon: number; }

const ring: [number, number][] = (geojson as { features: { geometry: { coordinates: [number, number][][] } }[] })
  .features[0].geometry.coordinates[0] as [number, number][];

export const GEO_PROVENANCE =
  "Rajasthan outline: Natural Earth 10m admin-1 (public domain), simplified; not survey-grade. Pilot geospatial view — district boundaries not shown.";

const lons = ring.map((p) => p[0]);
const lats = ring.map((p) => p[1]);
const minLon = Math.min(...lons) - 0.4;
const maxLon = Math.max(...lons) + 0.4;
const minLat = Math.min(...lats) - 0.3;
const maxLat = Math.max(...lats) + 0.3;

export const VIEW_W = 800;
export const VIEW_H = 620;

/** Linear equirectangular projection — adequate at state scale for a demo. */
export function project(lat: number, lon: number): [number, number] {
  const x = ((lon - minLon) / (maxLon - minLon)) * VIEW_W;
  const y = ((maxLat - lat) / (maxLat - minLat)) * VIEW_H;
  return [x, y];
}

export function outlinePath(): string {
  return ring.map((p, i) => `${i === 0 ? "M" : "L"}${project(p[1], p[0])[0].toFixed(1)},${project(p[1], p[0])[1].toFixed(1)}`).join(" ") + " Z";
}

/** District HQ reference points (real coordinates, labelled as references). */
export const DISTRICT_REFS: { name: string; lat: number; lon: number }[] = [
  { name: "Jodhpur", lat: 26.2389, lon: 73.0243 },
  { name: "Nagaur", lat: 27.202, lon: 73.88 },
  { name: "Jalore", lat: 25.3457, lon: 72.615 },
];
