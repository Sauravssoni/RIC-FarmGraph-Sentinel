"use client";
/**
 * VoiceTools — voice-note recorder (real MediaRecorder pipeline) and labelled
 * Hindi dictation for the field flow. Honest states: unsupported browsers get
 * a clear typed-fallback message; dictation output must be confirmed by edit.
 */
import { useEffect, useRef, useState } from "react";
import {
  startRecording, getVoiceNoteURL, deleteVoiceNote, dictateHindi,
  voiceSupported, hindiRecognitionSupported, type VoiceNoteMeta, type Recording,
} from "@/lib/voice";

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
        Unreviewed machine transcription — always check and edit before submitting. Marwari/Mewari dialect ASR is not claimed (research-stage per Bhashini assessments).
      </p>
    </div>
  );
}
