/**
 * Typed HTTP data-provider boundary. The demo provider (src/lib/store.ts) is
 * the default; this HTTP provider mirrors the same contracts against the
 * FastAPI backend when it is reachable. Future government adapters implement
 * this same boundary. Nothing here fabricates a live integration.
 *
 * Security note: the API's X-Demo-Role header is a DEMO role selector (no
 * credentials exist). The field app sends "field_worker"; officer views send
 * "officer". This demonstrates RBAC semantics only.
 */
import type { CaptureChecklist, Case, FieldMission, IntegrationAdapterStatus, OverviewKpis, Referral } from "@contracts";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type DemoRole = "farmer" | "field_worker" | "expert" | "officer" | "admin";

export interface ReadProvider {
  overview(): Promise<OverviewKpis>;
  cases(): Promise<Case[]>;
  missions(): Promise<FieldMission[]>;
  integrations(): Promise<IntegrationAdapterStatus[]>;
}

async function getJson<T>(path: string, role: DemoRole = "officer"): Promise<T> {
  const r = await fetch(`${API_URL}${path}`, { headers: { "X-Demo-Role": role }, signal: AbortSignal.timeout(4000) });
  if (!r.ok) throw new Error(`API ${path} -> ${r.status}`);
  return (await r.json()) as T;
}

async function postJson<T>(path: string, body: unknown, role: DemoRole = "officer"): Promise<T> {
  const r = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Demo-Role": role },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) {
    let detail = `API ${path} -> ${r.status}`;
    try {
      const j = (await r.json()) as { detail?: unknown };
      detail += ` ${typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail ?? "")}`;
    } catch { /* non-JSON error body */ }
    throw new Error(detail.trim());
  }
  return (await r.json()) as T;
}

export const httpProvider: ReadProvider = {
  overview: () => getJson<OverviewKpis>("/api/v1/overview"),
  cases: () => getJson<Case[]>("/api/v1/cases"),
  missions: () => getJson<FieldMission[]>("/api/v1/missions"),
  integrations: () => getJson<IntegrationAdapterStatus[]>("/api/v1/integrations"),
};

// ---------------- writes (Task 002) ----------------

export interface SyncCasePayload {
  farmerId: string; plotId: string; crop: string; cropStage: string; season: string;
  district: string; block: string; lat: number; lon: number; areaAcres: number;
  consent: { given: boolean; channel: string }; createdOffline: boolean;
  observations: { symptomCategory: string; symptomNote: string; checklist: CaptureChecklist; at?: string }[];
}

export interface SyncBatchResult {
  status: "applied" | "already_applied";
  idempotencyKey: string;
  caseIds: string[];
  provenance: string;
}

/** Idempotent offline-outbox sync — safe to retry with the same key. */
export function postSyncBatch(idempotencyKey: string, cases: SyncCasePayload[]): Promise<SyncBatchResult> {
  return postJson<SyncBatchResult>("/api/v1/sync/batch", { idempotencyKey, cases }, "field_worker");
}

export function createReferral(caseId: string, body: { kvkId: string; reason: string; note?: string }): Promise<Referral> {
  return postJson<Referral>(`/api/v1/cases/${caseId}/referrals`, body, "expert");
}

export function issueAdvisory(caseId: string, advisoryId: string): Promise<Case> {
  return postJson<Case>(`/api/v1/cases/${caseId}/advisory-issue`, { advisoryId }, "officer");
}

export function getLearningSummary(): Promise<{ total: number; corrections: number; unknowns: number; honestyNote: string }> {
  return getJson("/api/v1/learning/summary");
}

export async function apiHealthy(): Promise<boolean> {
  try {
    const r = await fetch(`${API_URL}/api/v1/health`, { signal: AbortSignal.timeout(1500) });
    return r.ok;
  } catch {
    return false;
  }
}

export async function apiDemoReset(): Promise<boolean> {
  try {
    const r = await fetch(`${API_URL}/api/v1/demo/reset`, { method: "POST", headers: { "X-Demo-Role": "officer" } });
    return r.ok;
  } catch {
    return false;
  }
}
