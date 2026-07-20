"use client";
/**
 * Voice layer (Phase E) — honest by construction.
 *  - Voice notes: real MediaRecorder capture → hash → IndexedDB blob →
 *    playback/delete. Consent recorded per note.
 *  - Hindi transcription: browser Web Speech API when available, clearly
 *    labelled "unreviewed machine transcription — confirm before submit".
 *    Typed text is always available. NO Marwari/Mewari ASR is claimed.
 *  - TTS: speechSynthesis reads recapture instructions aloud (hi/en).
 */
import Dexie, { type EntityTable } from "dexie";

export interface VoiceNoteMeta {
  id: string;
  hash: string;
  durationSec: number;
  bytes: number;
  mime: string;
  consentGiven: boolean;
  createdAt: string;
}
export interface VoiceNoteRow extends VoiceNoteMeta { blob: Blob }

class VoiceDB extends Dexie {
  voiceNotes!: EntityTable<VoiceNoteRow, "id">;
  constructor() {
    super("fgr-voice");
    this.version(1).stores({ voiceNotes: "id" });
  }
}
let db: VoiceDB | undefined;
function voiceDB(): VoiceDB {
  if (!db) db = new VoiceDB();
  return db;
}

export function voiceSupported(): boolean {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";
}

async function sha256Hex(buf: ArrayBuffer): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export interface Recording {
  stop: () => Promise<VoiceNoteMeta>;
  cancel: () => void;
}

/** Start recording. Throws with a clear message when unsupported/denied. */
export async function startRecording(consentGiven: boolean): Promise<Recording> {
  if (!voiceSupported()) throw new Error("Voice recording is not supported on this browser — typed input remains available.");
  if (!consentGiven) throw new Error("Voice recording requires the farmer's consent acknowledgement first.");
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
  const rec = new MediaRecorder(stream, { mimeType: mime });
  const chunks: BlobPart[] = [];
  const t0 = Date.now();
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  rec.start(250);

  let cancelled = false;
  return {
    cancel: () => {
      cancelled = true;
      rec.stop();
      stream.getTracks().forEach((t) => t.stop());
    },
    stop: () =>
      new Promise<VoiceNoteMeta>((resolve, reject) => {
        rec.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop());
          if (cancelled) return reject(new Error("cancelled"));
          const blob = new Blob(chunks, { type: rec.mimeType });
          const buf = await blob.arrayBuffer();
          const hash = await sha256Hex(buf);
          const meta: VoiceNoteMeta = {
            id: `vn_${hash.slice(0, 12)}`, hash,
            durationSec: Math.round((Date.now() - t0) / 100) / 10,
            bytes: buf.byteLength, mime: rec.mimeType,
            consentGiven, createdAt: new Date().toISOString(),
          };
          await voiceDB().voiceNotes.put({ ...meta, blob });
          resolve(meta);
        };
        rec.stop();
      }),
  };
}

export async function getVoiceNoteURL(id: string): Promise<string | undefined> {
  const row = await voiceDB().voiceNotes.get(id);
  return row ? URL.createObjectURL(row.blob) : undefined;
}
/** Raw blob for the Bhashini ASR upload path (recording never leaves the device otherwise). */
export async function getVoiceNoteBlob(id: string): Promise<Blob | undefined> {
  const row = await voiceDB().voiceNotes.get(id);
  return row?.blob;
}
export async function deleteVoiceNote(id: string): Promise<void> {
  await voiceDB().voiceNotes.delete(id);
}

// ---------------------------------------------------------------------------
// Hindi transcription via browser Web Speech API (labelled, optional)
// ---------------------------------------------------------------------------

export interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: { results: { [i: number]: { [i: number]: { transcript: string } } } }) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export function hindiRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
}

/**
 * One-shot Hindi (hi-IN) dictation. Returns the transcript or null.
 * ALWAYS labelled in the UI as unreviewed machine transcription; the user
 * must confirm the text before it is submitted.
 */
export function dictateHindi(): Promise<string | null> {
  return new Promise((resolve) => {
    if (!hindiRecognitionSupported()) return resolve(null);
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
    const Ctor = (w.SpeechRecognition ?? w.webkitSpeechRecognition)!;
    const rec = new Ctor();
    rec.lang = "hi-IN";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    let done = false;
    rec.onresult = (e) => {
      done = true;
      resolve(e.results[0]?.[0]?.transcript ?? null);
    };
    rec.onerror = () => { if (!done) resolve(null); };
    rec.onend = () => { if (!done) resolve(null); };
    try { rec.start(); } catch { resolve(null); }
  });
}

// ---------------------------------------------------------------------------
// TTS for recapture instructions
// ---------------------------------------------------------------------------

export function ttsSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speak(text: string, lang: "hi-IN" | "en-IN" = "en-IN"): boolean {
  if (!ttsSupported()) return false;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = 0.95;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
  return true;
}
