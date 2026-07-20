"use client";
/**
 * VoiceTools — voice-note recorder (real MediaRecorder pipeline) and labelled
 * Hindi dictation for the field flow. Honest states: unsupported browsers get
 * a clear typed-fallback message; dictation output must be confirmed by edit.
 */
import { useEffect, useRef, useState } from "react";
import {
  startRecording, getVoiceNoteURL, getVoiceNoteBlob, deleteVoiceNote, dictateHindi,
  voiceSupported, hindiRecognitionSupported, speak, type VoiceNoteMeta, type Recording,
} from "@/lib/voice";
import { useApp } from "@/lib/app";
import { useDemoStore, getStore } from "@/lib/store";
import {
  REGIONAL_GLOSSARY, TTS_KIND_LABELS, bhashiniStateFromError, blobToBase64,
  confirmVoiceTranscript, dequeueTranscription, playBase64Audio,
  postBhashiniAsr, postBhashiniTts, queueTranscription, transcriptionQueue,
  type BhashiniState,
} from "@/lib/bhashini";

export function VoiceNoteRecorder({ consentGiven, onSaved, onDeleted, existing }: {
  consentGiven: boolean;
  onSaved: (meta: VoiceNoteMeta) => void;
  onDeleted: () => void;
  existing: VoiceNoteMeta | null;
}) {
  const [rec, setRec] = useState<Recording | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (existing) void getVoiceNoteURL(existing.id).then((u) => setUrl(u ?? null));
  }, [existing]);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  const supported = voiceSupported();

  const begin = async () => {
    setError(null);
    try {
      const r = await startRecording(consentGiven);
      setRec(r); setSeconds(0);
      timer.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Recording failed");
    }
  };

  const stop = async () => {
    if (!rec) return;
    if (timer.current) clearInterval(timer.current);
    try {
      const meta = await rec.stop();
      setRec(null);
      onSaved(meta);
      setUrl((await getVoiceNoteURL(meta.id)) ?? null);
    } catch {
      setRec(null);
    }
  };

  if (!supported) {
    return <p className="mt-1 text-xs text-ink-500">🎤 Voice notes are not supported on this browser — typed input works fully offline.</p>;
  }

  return (
    <div className="mt-2 rounded-lg border border-sand-300 bg-sand-50 p-2.5">
      <div className="flex flex-wrap items-center gap-2">
        {!rec && !existing && (
          <button type="button" className="btn-secondary" onClick={() => void begin()} disabled={!consentGiven}>
            🎤 Record voice note
          </button>
        )}
        {rec && (
          <>
            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-alert-700">
              <span className="h-2 w-2 animate-pulse rounded-full bg-alert-600" /> recording {seconds}s
            </span>
            <button type="button" className="btn-primary" onClick={() => void stop()}>■ Stop & save</button>
            <button type="button" className="text-xs font-bold text-ink-600 underline" onClick={() => { rec.cancel(); setRec(null); if (timer.current) clearInterval(timer.current); }}>cancel</button>
          </>
        )}
        {existing && !rec && (
          <>
            <audio controls src={url ?? undefined} className="h-9 max-w-full" />
            <span className="text-[11px] text-ink-500">{existing.durationSec}s · {(existing.bytes / 1024).toFixed(0)} KB · sha256 {existing.hash.slice(0, 10)}…</span>
            <button type="button" className="text-xs font-bold text-alert-600 underline"
              onClick={() => { void deleteVoiceNote(existing.id); setUrl(null); onDeleted(); }}>
              delete
            </button>
          </>
        )}
      </div>
      {!consentGiven && <p className="mt-1 text-[11px] font-semibold text-saffron-700">Consent acknowledgement is required before recording.</p>}
      {error && <p className="mt-1 text-[11px] font-semibold text-alert-700" role="alert">{error}</p>}
      <p className="mt-1 text-[10px] text-ink-400">Stored offline on this device (IndexedDB). Uploaded only on sync. Transcription is NOT automatic — see dictation below.</p>
    </div>
  );
}

export function HindiDictation({ onTranscript }: { onTranscript: (text: string) => void }) {
  const [listening, setListening] = useState(false);
  const supported = hindiRecognitionSupported();
  if (!supported) {
    return <p className="mt-1 text-[11px] text-ink-500">🗣 Hindi dictation is unavailable in this browser — please type (English/Hindi keyboard both fine).</p>;
  }
  return (
    <div className="mt-1">
      <button type="button" className="btn-secondary !py-1.5 text-xs" disabled={listening}
        onClick={() => {
          setListening(true);
          void dictateHindi().then((t) => { setListening(false); if (t) onTranscript(t); });
        }}>
        {listening ? "…listening (speak Hindi)" : "🗣 Dictate note in Hindi (browser speech recognition)"}
      </button>
      <p className="mt-0.5 text-[10px] font-semibold text-saffron-700">
        BROWSER_DICTATION_FALLBACK — browser speech recognition, NOT Bhashini. Unreviewed machine transcription — always check and edit before submitting. Marwari/Mewari dialect ASR is not claimed.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bhashini Hindi PoC UI (Task 003 Phase 2B) — exact states, honest fallback.
// ---------------------------------------------------------------------------

export type VoiceLanguage = "hi" | "marwari" | "mewari";

export const VOICE_LANGUAGE_LABELS: Record<VoiceLanguage, string> = {
  hi: "हिन्दी (Hindi)",
  marwari: "मारवाड़ी (Marwari)",
  mewari: "मेवाड़ी (Mewari)",
};

/** Language selector + truthful regional support (no dialect ASR claimed). */
export function VoiceLanguageSelector({ value, onChange }: { value: VoiceLanguage; onChange: (l: VoiceLanguage) => void }) {
  const regional = value !== "hi";
  return (
    <div className="mt-2">
      <label className="label" htmlFor="voice-lang">Voice-note language</label>
      <select id="voice-lang" className="input !w-auto" value={value} onChange={(e) => onChange(e.target.value as VoiceLanguage)}>
        {(Object.keys(VOICE_LANGUAGE_LABELS) as VoiceLanguage[]).map((l) => (
          <option key={l} value={l}>{VOICE_LANGUAGE_LABELS[l]}</option>
        ))}
      </select>
      {regional && (
        <div className="mt-2 rounded-lg border border-saffron-500 bg-saffron-50 p-2.5">
          <p className="text-xs font-extrabold text-saffron-700">REGIONAL SPEECH — HUMAN REVIEW REQUIRED</p>
          <p className="mt-0.5 text-[11px] text-ink-700">
            Marwari/Mewari ASR is not claimed. The voice note is preserved as-is and routed to a human expert.
            Use the guided prompts below; the phrase glossary is a DRAFT pending KVK validation.
          </p>
          <div className="mt-1.5 grid gap-1 sm:grid-cols-2">
            {REGIONAL_GLOSSARY.guidedPrompts.map((p) => (
              <p key={p.en} className="rounded bg-sand-100 px-2 py-1 text-[11px]"><span className="font-bold">{p.hi}</span> · {p.en}</p>
            ))}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {REGIONAL_GLOSSARY.symptoms.slice(0, 4).map((s) => (
              <span key={s.en} className="chip bg-sand-200 text-ink-700" title={s.en}>{s.hi}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Bhashini transcription panel for a recorded voice note.
 * States: OFFLINE_VOICE_NOTE_ONLY (queued for user-approved send),
 * BHASHINI — CREDENTIALS REQUIRED, timeout/unavailable, LIVE (UNREVIEWED →
 * user confirms/edits → audited). Regional notes are never sent to ASR.
 */
export function BhashiniPanel({ voiceNote, caseRef, consentRef, regional, onConfirmed }: {
  voiceNote: VoiceNoteMeta | null;
  caseRef: string;
  consentRef: string;
  regional: boolean;
  onConfirmed: (transcript: string, status: "CONFIRMED_AS_RETURNED" | "CONFIRMED_AFTER_EDIT") => void;
}) {
  const app = useApp();
  useDemoStore((s) => s.getState()); // re-render on store changes
  const [state, setState] = useState<BhashiniState | null>(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const [queue, setQueue] = useState(transcriptionQueue());
  const [confirmedMsg, setConfirmedMsg] = useState("");

  if (!voiceNote) return null;

  if (regional) {
    return (
      <p className="mt-1.5 rounded-md bg-saffron-100 px-2 py-1 text-[11px] font-bold text-saffron-700">
        REGIONAL SPEECH — HUMAN REVIEW REQUIRED: voice note {voiceNote.id} is preserved on-device and routed to a human expert. No ASR attempted.
      </p>
    );
  }

  const offline = !app.effectiveOnline;
  const connected = app.apiMode === "api-connected";
  const queued = queue.find((r) => r.voiceNoteId === voiceNote.id);

  const transcribe = async () => {
    setBusy(true); setState(null);
    try {
      const blob = await getVoiceNoteBlob(voiceNote.id);
      if (!blob) throw new Error("voice note blob missing from IndexedDB");
      const audioBase64 = await blobToBase64(blob);
      const res = await postBhashiniAsr({ audioBase64, mimeType: voiceNote.mime, consentRef, caseRef });
      setState(res.state);
      setDraft(res.transcript); // UNREVIEWED — user must confirm/edit
    } catch (e) {
      setState(bhashiniStateFromError(e));
    } finally {
      setBusy(false);
    }
  };

  const confirm = (edited: boolean) => {
    if (draft == null) return;
    const status = edited ? "CONFIRMED_AFTER_EDIT" : "CONFIRMED_AS_RETURNED";
    if (connected && !caseRef.startsWith("DRAFT")) {
      void confirmVoiceTranscript(caseRef, {
        transcript: draft, confirmationStatus: status, consentRef, voiceNoteHash: voiceNote.hash,
      }).then(() => setConfirmedMsg("Confirmation audited on the demo backend."))
        .catch(() => setConfirmedMsg("Backend confirmation failed — kept locally."));
    } else if (!caseRef.startsWith("DRAFT")) {
      getStore().confirmVoiceTranscript(caseRef, { transcript: draft, confirmationStatus: status });
      setConfirmedMsg("Confirmation audited in the standalone demo store.");
    }
    onConfirmed(draft, status);
    if (queued) { dequeueTranscription(queued.id); setQueue(transcriptionQueue()); }
  };

  return (
    <div className="mt-1.5 rounded-md border border-sand-300 bg-sand-50 p-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-extrabold text-ink-800">Bhashini Hindi transcription (PoC)</span>
        {offline && <span className="chip bg-saffron-100 text-saffron-700">OFFLINE_VOICE_NOTE_ONLY</span>}
        {state === "LIVE_BHASHINI_POC" && <span className="chip bg-leaf-100 text-leaf-700">LIVE_BHASHINI_POC</span>}
        {state && state !== "LIVE_BHASHINI_POC" && <span className="chip bg-saffron-100 text-saffron-700">{state}</span>}
      </div>

      {offline && !queued && (
        <button type="button" className="btn-secondary mt-1.5 !py-1 text-xs"
          onClick={() => { queueTranscription({ voiceNoteId: voiceNote.id, voiceNoteHash: voiceNote.hash, mime: voiceNote.mime, caseRef, consentRef, regional }); setQueue(transcriptionQueue()); }}>
          Queue transcription request (send after reconnect, with your approval)
        </button>
      )}
      {queued && (
        <p className="mt-1 text-[11px] text-ink-600">
          Queued {queued.id} — recording safe on-device. {offline ? "Send when back online." : "You may send it now:"}
          {!offline && (
            <button type="button" className="ml-1 font-bold underline" onClick={() => void transcribe()}>Approve &amp; send to Bhashini</button>
          )}
        </p>
      )}

      {!offline && !connected && (
        <p className="mt-1 text-[11px] text-ink-500">
          Bhashini runs on the demo backend — this screen is in standalone mode, so the voice note stays on-device (IndexedDB) with typed input available.
        </p>
      )}

      {!offline && connected && !queued && draft == null && (
        <button type="button" className="btn-secondary mt-1.5 !py-1 text-xs" disabled={busy} onClick={() => void transcribe()}>
          {busy ? "…transcribing via Bhashini pipeline" : "⇪ Transcribe voice note with Bhashini (hi)"}
        </button>
      )}

      {state === "BHASHINI_CREDENTIALS_REQUIRED" && (
        <div className="mt-1.5 rounded-md border border-saffron-500 bg-saffron-50 p-2">
          <p className="text-[11px] font-extrabold text-saffron-700">BHASHINI — CREDENTIALS REQUIRED</p>
          <p className="text-[11px] text-ink-700">
            Live Bhashini needs ULCA credentials on the API host (BHASHINI_USER_ID / BHASHINI_API_KEY / BHASHINI_PIPELINE_ID — see docs/integrations/bhashini.md).
            Your recording is untouched on this device; typed Hindi input and the browser dictation fallback remain available.
          </p>
        </div>
      )}
      {(state === "BHASHINI_TIMEOUT" || state === "BHASHINI_UNAVAILABLE" || state === "BHASHINI_CONFIGURATION_ERROR") && (
        <p className="mt-1 text-[11px] font-semibold text-alert-700">Bhashini call failed ({state}) — the recording is safe on-device; you can retry or type instead.</p>
      )}

      {draft != null && (
        <div className="mt-1.5">
          <p className="text-[10px] font-extrabold text-saffron-700">UNREVIEWED Bhashini transcript — confirm or edit before it enters the case:</p>
          <textarea className="input mt-1 min-h-[56px] w-full" value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="Confirm Bhashini transcript" />
          <div className="mt-1 flex gap-2">
            <button type="button" className="btn-primary !py-1 text-xs" onClick={() => confirm(true)}>✓ Confirm (edited) transcript</button>
            <button type="button" className="btn-secondary !py-1 text-xs" onClick={() => setDraft(null)}>discard</button>
          </div>
        </div>
      )}
      {confirmedMsg && <p className="mt-1 text-[10px] font-semibold text-leaf-700">{confirmedMsg}</p>}
    </div>
  );
}

/** Bhashini TTS for allowlisted non-chemical messages; browser TTS is a labelled fallback. */
export function BhashiniTtsButton({ kind, caseId }: { kind: string; caseId: string }) {
  const app = useApp();
  const connected = app.apiMode === "api-connected" && app.effectiveOnline;
  const [state, setState] = useState<BhashiniState | null>(null);
  const [busy, setBusy] = useState(false);

  const play = async () => {
    setBusy(true); setState(null);
    try {
      const res = await postBhashiniTts(kind, { case_id: caseId });
      setState("LIVE_BHASHINI_POC");
      playBase64Audio(res.audioBase64, res.audioFormat ?? "wav");
    } catch (e) {
      setState(bhashiniStateFromError(e));
    } finally {
      setBusy(false);
    }
  };

  if (!connected) {
    return (
      <button type="button" className="btn-secondary !py-1 text-xs"
        onClick={() => speak("कृपया पत्ते की साफ़ तस्वीर दोबारा लें।", "hi-IN")}>
        🔊 {TTS_KIND_LABELS[kind] ?? kind} (browser TTS fallback — not Bhashini)
      </button>
    );
  }
  return (
    <span className="inline-flex items-center gap-1">
      <button type="button" className="btn-secondary !py-1 text-xs" disabled={busy} onClick={() => void play()}>
        {busy ? "…" : "🔊"} {TTS_KIND_LABELS[kind] ?? kind} (Bhashini TTS)
      </button>
      {state === "BHASHINI_CREDENTIALS_REQUIRED" && <span className="chip bg-saffron-100 text-saffron-700">BHASHINI — CREDENTIALS REQUIRED</span>}
      {state && state !== "LIVE_BHASHINI_POC" && state !== "BHASHINI_CREDENTIALS_REQUIRED" && (
        <span className="chip bg-alert-100 text-alert-700">{state}</span>
      )}
    </span>
  );
}

/** Surface queued transcription requests (e.g. on the case page after reconnect). */
export function QueuedTranscriptions() {
  const [queue, setQueue] = useState<TranscriptionRequestLike[]>([]);
  useEffect(() => setQueue(transcriptionQueue()), []);
  if (queue.length === 0) return null;
  return (
    <div className="rounded-lg border border-saffron-500 bg-saffron-50 p-2.5 text-xs">
      <p className="font-extrabold text-saffron-700">{queue.length} queued transcription request{queue.length === 1 ? "" : "s"} — recordings safe on-device</p>
      {queue.map((r) => (
        <p key={r.id} className="mt-0.5 text-ink-700">{r.id} → {r.caseRef} · queued {new Date(r.queuedAt).toLocaleString()} · awaiting your approval on the scan/case screen</p>
      ))}
    </div>
  );
}
type TranscriptionRequestLike = ReturnType<typeof transcriptionQueue>[number];
