/**
 * KVK directory access + nearest-support-point routing (Phase D).
 * Directory entries are sourced from official ICAR-ATARI/KVK publications
 * (see data/reference/kvk-directory.json meta). Coordinates are approximate
 * and labelled; distances are estimates for routing only.
 */
import directory from "@data/reference/kvk-directory.json";
import type { KvkRecord } from "@contracts";
import { haversineKm } from "./engine";

export const KVK_META = directory.meta;
export const KVKS = directory.kvks as KvkRecord[];

export interface KvkMatch extends KvkRecord {
  distanceKm: number;
  sameDistrict: boolean;
}

/** Nearest KVKs to a point, same-district first then by estimated distance. */
export function nearestKvks(lat: number, lon: number, district?: string, limit = 3): KvkMatch[] {
  return KVKS.map((k) => ({
    ...k,
    distanceKm: Math.round(haversineKm(lat, lon, k.lat, k.lon) * 10) / 10,
    sameDistrict: district ? k.district === district : false,
  }))
    .sort((a, b) => Number(b.sameDistrict) - Number(a.sameDistrict) || a.distanceKm - b.distanceKm)
    .slice(0, limit);
}
