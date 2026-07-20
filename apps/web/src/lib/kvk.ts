/**
 * KVK directory access + nearest-support-point routing (Phase D) and the
 * referral lifecycle/SLA helpers (Task 003 Phase 2A).
 * Directory entries are sourced from official ICAR-ATARI/KVK publications
 * (see data/reference/kvk-directory.json meta). Coordinates are approximate
 * and labelled; distances are estimates for routing only.
 *
 * REFERRAL_FLOW mirrors apps/api/app/repository.py::REFERRAL_FLOW — the API
 * is authoritative when connected; these helpers keep standalone DemoStore
 * behaviour identical. kvk.test.ts asserts the mirror stays in sync.
 */
import directory from "@data/reference/kvk-directory.json";
import type { KvkRecord, Referral, ReferralStatus, SlaStatus } from "@contracts";
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

/** Crop-speciality match: does this KVK list the crop (or a related term)? */
export function specialityMatch(kvk: KvkRecord, crop: string): boolean {
  const c = crop.toLowerCase();
  return kvk.specialities.some((s) => {
    const t = s.toLowerCase();
    return t.includes(c) || c.includes(t);
  });
}

export type ContactStatus = "DIRECTORY_CONTACT_LISTED" | "MISSING_CONTACT";

/** Honest contact state — never show tel:/mailto: actions for absent contacts. */
export function contactStatus(kvk: Pick<KvkRecord, "phone" | "email">): ContactStatus {
  return kvk.phone?.trim() || kvk.email?.trim() ? "DIRECTORY_CONTACT_LISTED" : "MISSING_CONTACT";
}

/** Map directions URL (external map provider; opened in a new tab). */
export function mapsDirectionsUrl(kvk: Pick<KvkRecord, "lat" | "lon" | "name">): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${kvk.lat},${kvk.lon}&destination_place=${encodeURIComponent(kvk.name)}`;
}

// ---------------------------------------------------------------------------
// Referral lifecycle + SLA (mirror of the FastAPI repository rules)
// ---------------------------------------------------------------------------

export const REFERRAL_FLOW: Record<ReferralStatus, ReferralStatus[]> = {
  DRAFT: ["READY_TO_SHARE"],
  READY_TO_SHARE: ["SHARED"],
  SHARED: ["ACKNOWLEDGED", "ESCALATED"],
  ACKNOWLEDGED: ["RESPONDED", "ESCALATED"],
  ESCALATED: ["RESPONDED", "CLOSED"],
  RESPONDED: ["CLOSED"],
  CLOSED: [],
};

export const DEFAULT_SLA_HOURS = 48;

export function canTransitionReferral(from: ReferralStatus, to: ReferralStatus): boolean {
  return REFERRAL_FLOW[from].includes(to);
}

/** SLA state at a point in time (defaults to now). COMPLETED once responded/closed. */
export function referralSlaStatus(ref: Pick<Referral, "status" | "dueAt">, now: Date = new Date()): SlaStatus {
  if (ref.status === "RESPONDED" || ref.status === "CLOSED") return "COMPLETED";
  const due = new Date(ref.dueAt);
  if (now > due) return "OVERDUE";
  if (now > new Date(due.getTime() - 12 * 3600_000)) return "DUE_SOON";
  return "WITHIN_SLA";
}

export const SLA_CHIP: Record<SlaStatus, { label: string; className: string }> = {
  WITHIN_SLA: { label: "within SLA", className: "bg-leaf-100 text-leaf-700" },
  DUE_SOON: { label: "due soon", className: "bg-saffron-100 text-saffron-700" },
  OVERDUE: { label: "OVERDUE — escalate", className: "bg-alert-100 text-alert-700" },
  COMPLETED: { label: "SLA completed", className: "bg-ink-800/10 text-ink-700" },
};

/** Mode banners — exact honesty labels required for referral delivery state. */
export const REFERRAL_MODE_LABEL = {
  standalone: "STANDALONE DETERMINISTIC DEMO — REFERRAL DELIVERY SIMULATED",
  connected: "CONNECTED DEMO BACKEND — EXTERNAL KVK DELIVERY NOT AUTOMATED",
} as const;
