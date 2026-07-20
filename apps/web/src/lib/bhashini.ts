"use client";
/**
 * Bhashini Hindi PoC — client side (Task 003 Phase 2B).
 *
 * The adapter is backend-only: this module calls the demo API, which holds
 * all credentials. Client-side states extend the server states with the two
 * honest local modes (OFFLINE_VOICE_NOTE_ONLY, BROWSER_DICTATION_FALLBACK).
 * The browser Web Speech API is always labelled a browser fallback — never
 * Bhashini. No Marwari/Mewari ASR is claimed: regional voice notes route to
 * human expert review.
 */
import glossary from "@data/reference/regional-glossary.json";
import { API_URL, getJson, postJson } from "./httpProvider";

export const REGIONAL_GLOSSARY = glossary;

export type BhashiniState =
  | "LIVE_BHASHINI_POC"
  | "BHASHINI_CREDENTIALS_REQUIRED"
  | "BHASHINI_CONFIGURATION_ERROR"
  | "BHASHINI_TIMEOUT"
  | "BHASHINI_UNAVAILABLE"
  | "OFFLINE_VOICE_NOTE_ONLY"
  | "BROWSER_DICTATION_FALLBACK";

export interface BhashiniStatus {
  state: BhashiniState;
  enabled: boolean;
  credentialsConfigured: boolean;
  missingEnv: string[];
  ttsKinds: string[];
  regionalClaim: string;
  setupDoc: string;
}

export interface BhashiniAsrResult {
  state: "LIVE_BHASHINI_POC";
  transcript: string;
  serviceId: string | null;
  sourceLanguage: string;
  latencyMs: number;
  rawResponseHash: string;
  confirmationStatus: "UNREVIEWED";
  verified: false;
}

export const TTS_KIND_LABELS: Record<string, string> = {
  recapture_guidance: "Recapture guidance",
  case_received: "Case-received confirmation",
  expert_review_needed: "Expert-review-needed message",
  safe_non_chemical_instruction: "Safe immediate non-chemical instructions",
  follow_up_reminder: "Follow-up reminder",
};

export function getBhashiniStatus(): Promise<BhashiniStatus> {
  return getJson("/api/v1/bhashini/status");
}

export function postBhashiniAsr(input: {
  audioBase64: string; mimeType: string; consentRef: string; caseRef: string;
}): Promise<BhashiniAsrResult> {
  return postJson("/api/v1/bhashini/asr", input, "field_worker");
}

export function postBhashiniTts(kind: string, params?: Record<string, string>): Promise<{
  audioBase64: string; audioFormat: string; spokenText: string; kind: string; latencyMs: number;
}> {
  return postJson("/api/v1/bhashini/tts", { kind, params }, "field_worker");
}

export function confirmVoiceTranscript(caseId: string, input: {
  transcript: string;
  confirmationStatus: "CONFIRMED_AS_RETURNED" | "CONFIRMED_AFTER_EDIT";
  consentRef: string;
  voiceNoteHash?: string;
  regional?: boolean;
}): Promise<{ caseId: string; state: string; regionalReviewRequired: boolean }> {
  return postJson(`/api/v1/cases/${caseId}/voice-transcript`, input, "field_worker");
}

/** Blob → base64 (no data: prefix) for the ASR endpoint. */
export async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Play base64 WAV audio returned by Bhashini TTS. */
export function playBase64Audio(b64: string, format = "wav"): void {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: `audio/${format}` });
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.onended = () => URL.revokeObjectURL(url);
  void audio.play();
}

// ---------------------------------------------------------------------------
// Offline transcription queue — the recording is NEVER lost; when offline the
// request waits for explicit user approval once connectivity returns.
// ---------------------------------------------------------------------------

export interface TranscriptionRequest {
  id: string;
  voiceNoteId: string;
  voiceNoteHash: string;
  mime: string;
  caseRef: string;
  consentRef: string;
  regional: boolean;
  queuedAt: string;
  status: "PENDING_USER_APPROVAL";
}

const QUEUE_KEY = "fgr-bhashini-queue-v1";

export function transcriptionQueue(): TranscriptionRequest[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]") as TranscriptionRequest[];
  } catch {
    return [];
  }
}

export function queueTranscription(req: Omit<TranscriptionRequest, "id" | "queuedAt" | "status">): TranscriptionRequest {
  const full: TranscriptionRequest = {
    ...req,
    id: `tq_${Date.now().toString(36)}`,
    queuedAt: new Date().toISOString(),
    status: "PENDING_USER_APPROVAL",
  };
  localStorage.setItem(QUEUE_KEY, JSON.stringify([...transcriptionQueue(), full]));
  return full;
}

export function dequeueTranscription(id: string): void {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(transcriptionQueue().filter((r) => r.id !== id)));
}

/** Error payload → exact client state (never fabricate a success). */
export function bhashiniStateFromError(e: unknown): BhashiniState {
  const msg = e instanceof Error ? e.message : String(e);
  for (const s of ["BHASHINI_CREDENTIALS_REQUIRED", "BHASHINI_CONFIGURATION_ERROR", "BHASHINI_TIMEOUT", "BHASHINI_UNAVAILABLE"] as const) {
    if (msg.includes(s)) return s;
  }
  return "BHASHINI_UNAVAILABLE";
}

export { API_URL as BHASHINI_API_BASE };
