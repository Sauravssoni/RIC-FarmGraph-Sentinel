"use client";
/**
 * CaptureStudio — real image-evidence capture for the field flow.
 * Camera/upload → pixel-quality analysis (real ImageData) → recapture
 * guidance → optional on-device pixel inference (EDGE_HEURISTIC) with
 * optional MobileNetV2 OOD screening (EDGE_MODEL). Everything labelled.
 */
import { useCallback, useRef, useState } from "react";
import {
  processImageFile, getImageURL, getImageData, deleteImage,
  ImageRejected, type StoredImageMeta,
} from "@/lib/images";
import { analyzePixels, type PixelQualityResult } from "@/lib/pixelQuality";
import {
  scoreWithPixfeat, runOnnxScreening, onnxScreeningAvailable, type InferenceOutput,
} from "@/lib/edgeModel";
import { speak } from "@/lib/voice";

export interface CaptureBundle {
  imageIds: string[];
  imageHashes: string[];
  pixelQuality: { score: number; pass: boolean; failedChecks: string[]; recaptureInstructions: string[] };
  inference: InferenceOutput | null;
}

interface EvidenceItem {
  meta: StoredImageMeta;
  url: string;
  quality: PixelQualityResult;
}

export default function CaptureStudio({ crop, onChange }: { crop: string; onChange: (b: CaptureBundle) => void }) {
  const [items, setItems] = useState<EvidenceItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [inferring, setInferring] = useState(false);
  const [inference, setInference] = useState<InferenceOutput | null>(null);
  const [onnxNote, setOnnxNote] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const emit = useCallback((next: EvidenceItem[], inf: InferenceOutput | null) => {
    const failed = next.flatMap((i) => i.quality.checks.filter((c) => !c.pass).map((c) => `${c.label}: ${c.detail}`));
    const instructions = [...new Set(next.flatMap((i) => i.quality.recaptureInstructions))];
    const score = next.length ? next.reduce((a, i) => a + i.quality.score, 0) / next.length : 0;
    onChange({
      imageIds: next.map((i) => i.meta.id),
      imageHashes: next.map((i) => i.meta.hash),
      pixelQuality: {
        score: Math.round(score * 100) / 100,
        pass: next.length > 0 && next.every((i) => i.quality.pass),
        failedChecks: failed,
        recaptureInstructions: instructions,
      },
      inference: inf,
    });
  }, [onChange]);

  const handleFile = useCallback(async (file: File) => {
    setError(null); setBusy(true);
    try {
      const meta = await processImageFile(file);
      if (meta.duplicateOf) {
        setError(`Duplicate image detected (content hash matches ${meta.duplicateOf}) — the original evidence is reused, no second copy stored.`);
      }
      const imgData = await getImageData(meta.duplicateOf ?? meta.id);
      if (!imgData) throw new Error("Could not read stored image");
      const quality = analyzePixels(imgData);
      const url = (await getImageURL(meta.duplicateOf ?? meta.id))!;
      setInference(null);
      setItems((prev) => {
        const next = [...prev.filter((i) => i.meta.id !== meta.id), { meta, url, quality }];
        emit(next, null);
        return next;
      });
    } catch (e) {
      if (e instanceof ImageRejected) setError(e.message);
      else setError("Image could not be processed on this device.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }, [emit]);

  const removeItem = useCallback(async (id: string) => {
    await deleteImage(id);
    setInference(null);
    setItems((prev) => {
      const next = prev.filter((i) => i.meta.id !== id);
      emit(next, null);
      return next;
    });
  }, [emit]);

  const runInference = useCallback(async () => {
    const best = items.find((i) => i.quality.pass) ?? items[0];
    if (!best) return;
    setInferring(true); setOnnxNote(null);
    try {
      const imgData = await getImageData(best.meta.id);
      if (!imgData) return;
      const out = scoreWithPixfeat(best.quality.features, crop);
      // Optional real MobileNetV2 screening (out-of-distribution check).
      const hasOnnx = await onnxScreeningAvailable();
      if (hasOnnx) {
        const screening = await runOnnxScreening(imgData);
        if (screening) {
          out.screening = screening;
          if (!screening.plantLike) {
            out.abstain = true;
            out.abstainReasons = [...out.abstainReasons, `MobileNetV2 screening: top ImageNet label "${screening.topLabel}" — plant material not confidently detected`];
          }
          setOnnxNote(`EDGE_MODEL screening ran in-browser (MobileNetV2, ImageNet — out-of-distribution check only, not a crop-disease classifier). Top label: ${screening.topLabel} (${(screening.topProb * 100).toFixed(1)}%).`);
        } else {
          setOnnxNote("MobileNetV2 screening unavailable on this device — heuristic pixel scorer still ran (labelled EDGE_HEURISTIC).");
        }
      } else {
        setOnnxNote("Screening model file not bundled in this build — heuristic pixel scorer ran (labelled EDGE_HEURISTIC).");
      }
      setInference(out);
      setItems((prev) => { emit(prev, out); return prev; });
    } finally {
      setInferring(false);
    }
  }, [items, crop, emit]);

  const allPass = items.length > 0 && items.every((i) => i.quality.pass);

  return (
    <div className="mt-3 space-y-3">
      <p className="text-xs text-ink-500">
        <span className="font-bold text-ink-700">Stage 1 — capture quality</span> (pixels are actually analysed: sharpness, exposure, glare, plant coverage).{" "}
        <span className="font-bold text-ink-700">Stage 2 — pixel inference</span> is a separate, clearly-labelled step. Neither is expert confirmation.
      </p>

      <label className={`btn-secondary flex min-h-[56px] w-full cursor-pointer items-center justify-center gap-2 text-base ${busy ? "opacity-60" : ""}`}>
        📷 {busy ? "Processing image…" : "Capture / upload crop photo"}
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only"
          disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); }} />
      </label>
      {error && <p className="rounded-lg border border-alert-600/40 bg-alert-50 px-3 py-2 text-xs font-semibold text-alert-700" role="alert">{error}</p>}

      {items.map((item) => (
        <article key={item.meta.id} className="rounded-lg border border-sand-300 bg-sand-50 p-3">
          <div className="flex gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.url} alt={`Crop evidence ${item.meta.id}`} className="h-24 w-24 rounded-md border border-sand-300 object-cover" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className={`text-sm font-extrabold ${item.quality.pass ? "text-leaf-700" : "text-saffron-700"}`}>
                  {item.quality.pass ? "✓ Quality acceptable" : "↻ Recapture needed"} · {(item.quality.score * 100).toFixed(0)}%
                </span>
                <button type="button" className="text-xs font-bold text-alert-600 underline" onClick={() => void removeItem(item.meta.id)}>Delete</button>
              </div>
              <ul className="mt-1 grid grid-cols-2 gap-x-3 text-[11px] text-ink-600">
                {item.quality.checks.map((c) => (
                  <li key={c.id} className={c.pass ? "" : "font-bold text-saffron-700"}>
                    {c.pass ? "✓" : "✗"} {c.label}
                  </li>
                ))}
              </ul>
              <p className="mt-1 font-mono text-[10px] text-ink-400">sha256 {item.meta.hash.slice(0, 16)}… · {item.meta.width}×{item.meta.height} · {(item.meta.storedBytes / 1024).toFixed(0)} KB · EXIF stripped</p>
            </div>
          </div>
          {!item.quality.pass && (
            <div className="mt-2 rounded-md bg-saffron-50 px-4 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold text-saffron-800">Recapture instructions</span>
                <button type="button" className="text-xs font-bold text-ink-700 underline"
                  onClick={() => speak(item.quality.recaptureInstructions.join(". "), "en-IN")}>
                  🔊 read aloud
                </button>
              </div>
              <ul className="list-disc space-y-0.5 text-xs font-semibold text-saffron-800">
                {item.quality.recaptureInstructions.map((r) => <li key={r}>{r}</li>)}
              </ul>
            </div>
          )}
        </article>
      ))}

      {items.length > 0 && (
        <div className="rounded-lg border border-ink-800/20 bg-white p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-extrabold text-ink-900">Stage 2 — on-device pixel inference</p>
              <p className="text-[11px] text-ink-500">Runs on this device. Works offline. Research preview — never labelled accuracy.</p>
            </div>
            <button type="button" className="btn-primary" disabled={inferring || !items.some((i) => i.quality.pass)} onClick={() => void runInference()}>
              {inferring ? "Analysing pixels…" : "▶ Analyse pixels"}
            </button>
          </div>
          {!allPass && <p className="mt-1 text-xs font-semibold text-saffron-700">At least one photo must pass quality before inference is meaningful.</p>}

          {inference && (
            <div className="mt-3 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="chip bg-ink-800 text-white">{inference.providerKind}</span>
                <span className="text-xs font-mono text-ink-500">{inference.providerId} v{inference.modelVersion} · {inference.runtime} · {inference.durationMs} ms</span>
                {inference.abstain && <span className="chip bg-saffron-100 text-saffron-800">ABSTAINED — expert review required</span>}
              </div>
              <ul className="space-y-1">
                {inference.candidates.slice(0, 3).map((c, i) => (
                  <li key={c.classId} className="flex items-center gap-2 text-sm">
                    <span className="w-24 text-xs font-bold text-ink-500">{i === 0 ? "Leading" : i === 1 ? "Alternative" : "Remaining"}</span>
                    <span className="flex-1 font-semibold text-ink-800">{c.label}{!c.supportedForCrop ? " (unsupported for crop)" : ""}</span>
                    <span className="tabular-nums text-xs font-bold">{c.rawScore.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-ink-600">Uncertainty (1−margin): <span className="font-bold">{inference.uncertainty.toFixed(2)}</span> · raw uncalibrated scores.</p>
              {inference.abstainReasons.length > 0 && (
                <ul className="list-disc space-y-0.5 rounded-md bg-saffron-50 px-4 py-2 text-xs text-saffron-800">
                  {inference.abstainReasons.map((r) => <li key={r}>{r}</li>)}
                </ul>
              )}
              {inference.recommendedNext.length > 0 && (
                <p className="text-xs text-ink-600"><span className="font-bold">Next evidence:</span> {inference.recommendedNext.join(" · ")}</p>
              )}
              {onnxNote && <p className="rounded-md bg-sand-100 px-2 py-1.5 text-[11px] text-ink-600">{onnxNote}</p>}
              <p className="rounded-md border border-saffron-500/30 bg-saffron-50 px-2 py-1.5 text-[11px] font-semibold text-saffron-800">{inference.note}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
