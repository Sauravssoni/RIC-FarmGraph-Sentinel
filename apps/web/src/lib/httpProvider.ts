/**
 * Typed HTTP data-provider boundary. The demo provider (src/lib/store.ts) is
 * the default; this HTTP provider mirrors the same contracts against the
 * FastAPI backend when it is reachable. Future government adapters implement
 * this same boundary. Nothing here fabricates a live integration.
 */
import type { Case, FieldMission, IntegrationAdapterStatus, OverviewKpis } from "@contracts";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface ReadProvider {
  overview(): Promise<OverviewKpis>;
  cases(): Promise<Case[]>;
  missions(): Promise<FieldMission[]>;
  integrations(): Promise<IntegrationAdapterStatus[]>;
}

async function getJson<T>(path: string): Promise<T> {
  const r = await fetch(`${API_URL}${path}`, { signal: AbortSignal.timeout(4000) });
  if (!r.ok) throw new Error(`API ${path} -> ${r.status}`);
  return (await r.json()) as T;
}

export const httpProvider: ReadProvider = {
  overview: () => getJson<OverviewKpis>("/api/v1/overview"),
  cases: () => getJson<Case[]>("/api/v1/cases"),
  missions: () => getJson<FieldMission[]>("/api/v1/missions"),
  integrations: () => getJson<IntegrationAdapterStatus[]>("/api/v1/integrations"),
};

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
    const r = await fetch(`${API_URL}/api/v1/demo/reset`, { method: "POST" });
    return r.ok;
  } catch {
    return false;
  }
}
