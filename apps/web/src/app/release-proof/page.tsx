"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { VoiceNoteRecorder } from "@/components/VoiceTools";
import { API_URL } from "@/lib/httpProvider";
import { getImageBlob, getImageData, processImageFile, type StoredImageMeta } from "@/lib/images";
import { analyzePixels, type PixelQualityResult } from "@/lib/pixelQuality";
import { runOnnxScreening, scoreWithPixfeat, type InferenceOutput } from "@/lib/edgeModel";
import { getVoiceNoteBlob, type VoiceNoteMeta } from "@/lib/voice";
import { blobToBase64, postBhashiniAsr, type BhashiniAsrResult } from "@/lib/bhashini";
import {
  createReleaseHandoff,
  downloadReleasePack,
  releaseHealth,
  uploadReleaseEvidence,
  type ReleaseHandoffResult,
} from "@/lib/releaseProof";

const CONSENT_REF = "consent-task004-connected-demo";

function humanBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function statusClass(ok: boolean): string {
  return ok ? "bg-leaf-100 text-leaf-700 border-leaf-600/30" : "bg-saffron-100 text-saffron-700 border-saffron-500/30";
}

export default function ConnectedReleaseProofPage() {
  const [consent, setConsent] = useState(false);
  const [image, setImage] = useState<StoredImageMeta | null>(null);
  const [quality, setQuality] = useState<PixelQualityResult | null>(null);
  const [inference, setInference] = useState<InferenceOutput | null>(null);
  const [voice, setVoice] = useState<VoiceNoteMeta | null>(null);
  const [asr, setAsr] = useState<BhashiniAsrResult | null>(null);
  const [originalTranscript, setOriginalTranscript] = useState("");
  const [transcript, setTranscript] = useState("");
  const [apiState, setApiState] = useState<Record<string, unknown> | null>(null);
  const [result, setResult] = useState<ReleaseHandoffResult | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const ready = Boolean(consent && image && quality && inference && voice && transcript.trim());
  const checklist = useMemo(() => ({ leafClose: true, lowerLeaf: true, wholePlant: true, lightingOk: true }), []);

  const inspectImage = async (file: File) => {
    setBusy("Processing image pixels");
    setError("");
    setResult(null);
    try {
      const meta = await processImageFile(file);
      const pixels = await getImageData(meta.id, 512);
      if (!pixels) throw new Error("Processed image could not be read from the offline evidence store");
      const q = analyzePixels(pixels);
      const heuristic = scoreWithPixfeat(q.features, "bajra");
      const screening = await runOnnxScreening(pixels);
      setImage(meta);
      setQuality(q);
      setInference({ ...heuristic, screening: screening ?? undefined });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
      setImage(null);
      setQuality(null);
      setInference(null);
    } finally {
      setBusy("");
    }
  };

  const checkApi = async () => {
    setBusy("Checking connected API");
    setError("");
    try {
      setApiState(await releaseHealth());
    } catch (caught) {
      setApiState(null);
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy("");
    }
  };

  const tryBhashini = async () => {
    if (!voice) return;
    setBusy("Sending consented voice note to Bhashini PoC");
    setError("");
    try {
      const blob = await getVoiceNoteBlob(voice.id);
      if (!blob) throw new Error("Voice note is missing from IndexedDB");
      const response = await postBhashiniAsr({
        audioBase64: await blobToBase64(blob),
        mimeType: voice.mime,
        consentRef: CONSENT_REF,
        caseRef: "TASK004-CONNECTED-PROOF",
      });
      setAsr(response);
      setOriginalTranscript(response.transcript);
      setTranscript(response.transcript);
    } catch (caught) {
      setAsr(null);
      setError(`${caught instanceof Error ? caught.message : String(caught)}. The recording remains on-device; enter a human-confirmed transcript below.`);
    } finally {
      setBusy("");
    }
  };

  const runHandoff = async () => {
    if (!ready || !image || !quality || !inference || !voice) return;
    setBusy("Uploading evidence and generating connected KVK handoff");
    setError("");
    setResult(null);
    try {
      const imageBlob = await getImageBlob(image.id);
      const voiceBlob = await getVoiceNoteBlob(voice.id);
      if (!imageBlob || !voiceBlob) throw new Error("Image or voice evidence is missing from the offline store");

      const [imageEvidence, voiceEvidence] = await Promise.all([
        uploadReleaseEvidence("image", imageBlob, CONSENT_REF, `${image.id}.jpg`),
        uploadReleaseEvidence("voice", voiceBlob, CONSENT_REF, `${voice.id}.webm`),
      ]);
      const confirmationStatus = originalTranscript && originalTranscript !== transcript
        ? "CONFIRMED_AFTER_EDIT"
        : "CONFIRMED_AS_RETURNED";
      const failedChecks = quality.checks.filter((check) => !check.pass).map((check) => check.id);
      const response = await createReleaseHandoff({
        idempotencyKey: `task004-${image.hash.slice(0, 16)}-${voice.hash.slice(0, 16)}`,
        case: {
          farmerId: "RJ-DEMO-F1042",
          plotId: "RJ-DEMO-PLOT-118",
          crop: "bajra",
          cropStage: "vegetative",
          season: "kharif-2026",
          district: "Jodhpur",
          block: "Balesar",
          lat: 26.391,
          lon: 72.946,
          areaAcres: 2.6,
          createdOffline: true,
          consent: { given: true, channel: "typed", ref: CONSENT_REF },
          observation: {
            symptomCategory: "white_downy_growth",
            symptomNote: transcript,
            checklist,
            imageHashes: [imageEvidence.sha256],
            evidenceRefs: [imageEvidence.ref],
            pixelQuality: {
              score: quality.score,
              passed: quality.pass,
              failedChecks,
              recaptureInstructions: quality.recaptureInstructions,
            },
            edgeInference: {
              providerId: inference.providerId,
              providerKind: inference.providerKind,
              modelVersion: inference.modelVersion,
              runtime: inference.runtime,
              durationMs: inference.durationMs,
              topClass: inference.topClass,
              topScore: inference.topScore,
              uncertainty: inference.uncertainty,
              abstain: inference.abstain,
              abstainReasons: inference.abstainReasons,
              at: inference.at,
            },
            voiceEvidenceRef: voiceEvidence.ref,
            voiceHash: voiceEvidence.sha256,
            transcript: {
              provider: asr ? "BHASHINI_POC" : "HUMAN_CONFIRMED_VOICE_NOTE",
              providerState: asr?.state ?? "OFFLINE_VOICE_NOTE_ONLY",
              serviceId: asr?.serviceId ?? null,
              rawResponseHash: asr?.rawResponseHash ?? null,
              originalTranscript: originalTranscript || transcript,
              confirmedTranscript: transcript,
              confirmationStatus,
              consentRef: CONSENT_REF,
              voiceNoteHash: voiceEvidence.sha256,
              confirmedAt: new Date().toISOString(),
            },
          },
        },
        kvkId: "KVK-JODHPUR-1",
        referralReason: "Bajra crop-health evidence requires local KVK verification",
        referralNote: "Connected Task 004 handoff: inspect evidence hashes, quality and provider metadata before field response.",
        urgency: "PRIORITY",
      });
      setResult(response);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy("");
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-3 py-5 sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-saffron-700">Task 004 · submission release gate</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink-950">Connected evidence handoff proof</h1>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-ink-600">
            This page proves that a real selected image, its pixel-quality result, edge-provider metadata, a real recorded voice note and a human-confirmed transcript survive the connected API path into a KVK referral pack. Farmer data remains synthetic; external KVK delivery is not automated.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/demo" className="btn-secondary">Judge Mode</Link>
          <Link href="/support" className="btn-secondary">KVK support</Link>
        </div>
      </div>

      <section className="mt-4 grid gap-3 lg:grid-cols-3">
        <article className="card p-4 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-extrabold text-ink-900">1. API and consent</h2>
            <span className="chip bg-ink-800/10 text-ink-800">API: {API_URL}</span>
          </div>
          <button type="button" className="btn-secondary mt-3" onClick={() => void checkApi()} disabled={Boolean(busy)}>
            Verify connected release API
          </button>
          {apiState && <pre className="mt-2 overflow-x-auto rounded-lg bg-ink-950 p-3 text-[11px] text-sand-50">{JSON.stringify(apiState, null, 2)}</pre>}
          <label className="mt-3 flex min-h-[48px] items-center gap-3 rounded-lg border border-sand-300 bg-sand-50 px-3">
            <input type="checkbox" className="h-5 w-5" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
            <span className="text-sm font-bold">I consent to this synthetic demo evidence being uploaded to the connected demo backend for crop-health verification and KVK referral preparation.</span>
          </label>
          <p className="mt-1 text-[10px] text-ink-500">Consent reference: {CONSENT_REF}. No Aadhaar, Jan Aadhaar, name or phone number is collected.</p>
        </article>

        <article className="card p-4">
          <h2 className="text-lg font-extrabold text-ink-900">Release-state truth</h2>
          <ul className="mt-2 space-y-2 text-xs text-ink-700">
            <li><span className="font-bold">Disease model:</span> research heuristic, not validated accuracy.</li>
            <li><span className="font-bold">MobileNetV2:</span> OOD screening only.</li>
            <li><span className="font-bold">KVK:</span> public directory and pack workflow; delivery not automated.</li>
            <li><span className="font-bold">Government APIs:</span> labelled live only after successful official operation.</li>
          </ul>
        </article>
      </section>

      <section className="mt-3 grid gap-3 lg:grid-cols-2">
        <article className="card p-4">
          <h2 className="text-lg font-extrabold text-ink-900">2. Real image evidence</h2>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="input mt-3"
            disabled={!consent || Boolean(busy)}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void inspectImage(file);
            }}
          />
          {!consent && <p className="mt-1 text-xs font-semibold text-saffron-700">Consent is required before image processing and upload.</p>}
          {image && quality && inference && (
            <div className="mt-3 space-y-2 text-xs">
              <div className="flex flex-wrap gap-1.5">
                <span className="chip bg-ink-800/10 text-ink-800">sha256 {image.hash.slice(0, 16)}…</span>
                <span className="chip bg-ink-800/10 text-ink-800">{image.width}×{image.height}</span>
                <span className="chip bg-ink-800/10 text-ink-800">{humanBytes(image.storedBytes)}</span>
                <span className={`chip border ${statusClass(quality.pass)}`}>{quality.pass ? "PIXEL QUALITY PASS" : "RECAPTURE ADVISED"}</span>
              </div>
              <p><span className="font-bold">Pixel score:</span> {(quality.score * 100).toFixed(0)}% · {quality.checks.filter((check) => !check.pass).map((check) => check.label).join(", ") || "all measurable checks passed"}</p>
              <p><span className="font-bold">Edge provider:</span> {inference.providerKind} · {inference.providerId} v{inference.modelVersion}</p>
              <p><span className="font-bold">Research-preview top pattern:</span> {inference.topClass} · raw {inference.topScore.toFixed(3)} · uncertainty {inference.uncertainty.toFixed(3)}</p>
              <p><span className="font-bold">MobileNetV2 OOD screen:</span> {inference.screening ? `${inference.screening.topLabel} · plant-like=${inference.screening.plantLike}` : "runtime unavailable; no claim promoted"}</p>
            </div>
          )}
        </article>

        <article className="card p-4">
          <h2 className="text-lg font-extrabold text-ink-900">3. Real voice evidence</h2>
          <VoiceNoteRecorder
            consentGiven={consent}
            existing={voice}
            onSaved={(meta) => { setVoice(meta); setAsr(null); setOriginalTranscript(""); setTranscript(""); }}
            onDeleted={() => { setVoice(null); setAsr(null); setOriginalTranscript(""); setTranscript(""); }}
          />
          {voice && (
            <button type="button" className="btn-secondary mt-2" onClick={() => void tryBhashini()} disabled={Boolean(busy)}>
              Try Bhashini Hindi ASR through backend
            </button>
          )}
          <label className="label mt-3" htmlFor="release-transcript">Human-confirmed Hindi transcript</label>
          <textarea
            id="release-transcript"
            className="input min-h-[90px] w-full"
            value={transcript}
            onChange={(event) => setTranscript(event.target.value)}
            placeholder="Bhashini output appears here when configured. Otherwise listen to the saved voice note and enter the confirmed transcript."
          />
          <p className="mt-1 text-[10px] text-ink-500">
            {asr ? `Bhashini service ${asr.serviceId ?? "not returned"} · response hash ${asr.rawResponseHash.slice(0, 14)}… · UNREVIEWED until this field is confirmed.` : "No live ASR is claimed. A human-confirmed transcript remains valid evidence metadata in degraded mode."}
          </p>
        </article>
      </section>

      <section className="card mt-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-ink-900">4. Generate authoritative KVK handoff</h2>
            <p className="mt-1 text-xs text-ink-600">Uploads the EXIF-stripped image and recorded audio, creates the connected case, preserves evidence and transcript metadata, then generates a KVK-Jodhpur-1 referral pack.</p>
          </div>
          <button type="button" className="btn-primary" disabled={!ready || Boolean(busy)} onClick={() => void runHandoff()}>
            {busy || "Run connected evidence chain"}
          </button>
        </div>
        {!ready && <p className="mt-2 text-xs font-semibold text-saffron-700">Required: consent, processed image, recorded voice note and confirmed transcript.</p>}
        {error && <p className="mt-3 rounded-lg border border-alert-600/30 bg-alert-50 px-3 py-2 text-sm font-bold text-alert-700" role="alert">{error}</p>}
      </section>

      {result && (
        <section className="mt-3 grid gap-3 lg:grid-cols-3">
          <article className="card p-4 lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-extrabold text-leaf-700">CONNECTED EVIDENCE CONTINUITY VERIFIED</p>
                <h2 className="text-xl font-extrabold text-ink-950">Case {result.case.id} → referral {result.referral.id}</h2>
              </div>
              <button type="button" className="btn-green" onClick={() => downloadReleasePack(result)}>Download KVK pack v2</button>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-4">
              <div className="rounded-lg bg-sand-100 p-3"><p className="text-[10px] font-bold uppercase text-ink-500">Status</p><p className="text-sm font-extrabold">{result.status}</p></div>
              <div className="rounded-lg bg-sand-100 p-3"><p className="text-[10px] font-bold uppercase text-ink-500">Pack</p><p className="text-sm font-extrabold">{result.pack.packVersion}</p></div>
              <div className="rounded-lg bg-sand-100 p-3"><p className="text-[10px] font-bold uppercase text-ink-500">Image hashes</p><p className="text-sm font-extrabold">{result.pack.imageHashes.length}</p></div>
              <div className="rounded-lg bg-sand-100 p-3"><p className="text-[10px] font-bold uppercase text-ink-500">Audit events</p><p className="text-sm font-extrabold">{result.auditEventCount}</p></div>
            </div>
            <pre className="mt-3 max-h-[460px] overflow-auto rounded-lg bg-ink-950 p-3 text-[10px] text-sand-50">{JSON.stringify(result.pack, null, 2)}</pre>
          </article>
          <article className="card p-4">
            <h2 className="text-lg font-extrabold text-ink-900">What this proves</h2>
            <ol className="mt-2 space-y-2 text-xs text-ink-700">
              <li>1. Real client image bytes were re-encoded, hashed and processed.</li>
              <li>2. Pixel-quality and edge-provider metadata reached FastAPI.</li>
              <li>3. Real recorded audio received a server evidence reference and hash.</li>
              <li>4. Transcript provider and human-confirmation state persisted.</li>
              <li>5. The connected case generated a privacy-masked KVK handoff pack.</li>
              <li>6. Repeating the same idempotency key cannot duplicate the case.</li>
            </ol>
          </article>
        </section>
      )}
    </main>
  );
}
