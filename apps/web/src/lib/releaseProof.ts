"use client";

import { API_URL } from "./httpProvider";

export interface ReleaseEvidence {
  ref: string;
  sha256: string;
  kind: "image" | "voice";
  bytes: number;
  contentType: string;
  consentRef: string;
  stored: boolean;
  duplicate: boolean;
  uploadedAt: string;
  provenance: string;
}

export interface ReleaseHandoffResult {
  status: "applied" | "already_applied";
  idempotencyKey: string;
  case: Record<string, unknown> & { id: string; observations: Record<string, unknown>[]; timeline: Record<string, unknown>[] };
  referral: Record<string, unknown> & { id: string };
  pack: Record<string, unknown> & { packVersion: string; imageHashes: string[]; evidenceRefs: string[] };
  auditEventCount: number;
  provenance: string;
}

async function detail(response: Response): Promise<string> {
  try {
    const body = await response.json() as { detail?: unknown };
    return typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail ?? body);
  } catch {
    return await response.text();
  }
}

export async function releaseHealth(): Promise<Record<string, unknown>> {
  const response = await fetch(`${API_URL}/api/v1/release/health`, {
    headers: { "X-Demo-Role": "officer" },
    signal: AbortSignal.timeout(4000),
  });
  if (!response.ok) throw new Error(`Release API health ${response.status}: ${await detail(response)}`);
  return await response.json() as Record<string, unknown>;
}

export async function uploadReleaseEvidence(
  kind: "image" | "voice",
  blob: Blob,
  consentRef: string,
  filename: string,
): Promise<ReleaseEvidence> {
  const form = new FormData();
  form.set("kind", kind);
  form.set("consentRef", consentRef);
  form.set("file", blob, filename);
  const response = await fetch(`${API_URL}/api/v1/release/evidence`, {
    method: "POST",
    headers: { "X-Demo-Role": "field_worker" },
    body: form,
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Evidence upload ${response.status}: ${await detail(response)}`);
  return await response.json() as ReleaseEvidence;
}

export async function createReleaseHandoff(body: Record<string, unknown>): Promise<ReleaseHandoffResult> {
  const response = await fetch(`${API_URL}/api/v1/release/handoff`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Demo-Role": "officer" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`Connected handoff ${response.status}: ${await detail(response)}`);
  return await response.json() as ReleaseHandoffResult;
}

export function downloadReleasePack(result: ReleaseHandoffResult): void {
  const blob = new Blob([JSON.stringify(result.pack, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${result.referral.id}-connected-evidence-pack.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
