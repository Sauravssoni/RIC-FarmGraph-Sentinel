"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getStore } from "@/lib/store";
import { useApp } from "@/lib/app";
import { useI18n } from "@/lib/i18n";
import { captureQuality } from "@/lib/engine";
import { CROPS, SYMPTOMS, SEED } from "@/lib/seed";
import { clearDraft, enqueue, loadDraft, markAttempt, outboxItems, removeOutbox, saveDraft } from "@/lib/offline";
import { DiagnosisPanel } from "@/components/DiagnosisPanel";
import { StatusChip } from "@/components/bits";
import type { CaptureChecklist, Case, DiagnosisResult } from "@contracts";

const formSchema = z.object({
  crop: z.string().min(1, "Select a crop"),
  cropStage: z.string().min(1, "Select a stage"),
  symptomCategory: z.string().min(1, "Select what you see"),
  symptomNote: z.string().max(500).optional(),
});
type FormValues = z.infer<typeof formSchema>;

const CHECKLIST: { key: keyof CaptureChecklist; tKey: "scan.capture.leafClose" | "scan.capture.lowerLeaf" | "scan.capture.wholePlant" | "scan.capture.lightingOk" }[] = [
  { key: "leafClose", tKey: "scan.capture.leafClose" },
  { key: "lowerLeaf", tKey: "scan.capture.lowerLeaf" },
  { key: "wholePlant", tKey: "scan.capture.wholePlant" },
  { key: "lightingOk", tKey: "scan.capture.lightingOk" },
];

type Phase = "consent" | "details" | "capture" | "result";
const GOLDEN_PLOT = SEED.plots.find((p) => p.id === "RJ-DEMO-PLOT-118");

export default function FieldScan() {
  const { t, locale } = useI18n();
  const app = useApp();
  const store = getStore();
  const [phase, setPhase] = useState<Phase>("consent");
  const [consent, setConsent] = useState(false);
  const [checklist, setChecklist] = useState<CaptureChecklist>({ leafClose: false, lowerLeaf: false, wholePlant: false, lightingOk: false });
  const [photos, setPhotos] = useState<string[]>([]);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [done, setDone] = useState<{ c: Case; d: DiagnosisResult | null } | null>(null);
  const [resume, setResume] = useState(false);
  const [outboxN, setOutboxN] = useState(0);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { crop: "bajra", cropStage: "vegetative", symptomCategory: "", symptomNote: "" },
  });
  const values = form.watch();

  // Restore draft on mount (offline-safe: no data loss on refresh)
  useEffect(() => {
    loadDraft().then((d) => {
      if (d) {
        const p = d.payload as { values?: FormValues; checklist?: CaptureChecklist; phase?: Phase; consent?: boolean };
        if (p.values) form.reset(p.values);
        if (p.checklist) setChecklist(p.checklist);
        if (p.consent) setConsent(true);
        if (p.phase && p.phase !== "result") setPhase(p.phase);
        setResume(true);
      }
    });
    outboxItems().then((items) => setOutboxN(items.length)).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosave draft (debounced)
  useEffect(() => {
    if (done) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveDraft({ id: "current", step: 0, payload: { values, checklist, phase, consent }, updatedAt: new Date().toISOString() }).catch(() => undefined);
    }, 400);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [values, checklist, phase, consent, done]);

  const quality = useMemo(() => captureQuality(checklist), [checklist]);
  const crop = CROPS.find((c) => c.id === values.crop);
  const isHi = locale === "hi";

  const submit = async () => {
    const valid = await form.trigger();
    if (!valid) { setPhase("details"); return; }
    const offline = !app.effectiveOnline;
    let c: Case;
    if (activeCaseId) {
      // Guided recapture on the SAME case (no duplicate report).
      c = store.getCase(activeCaseId)!;
    } else {
      c = store.createCase({
        farmerId: "RJ-DEMO-F1042",
        plotId: GOLDEN_PLOT?.id ?? "RJ-DEMO-PLOT-118",
        crop: values.crop, cropStage: values.cropStage,
        season: crop?.season === "kharif" ? "kharif-2026" : "rabi-2025-26",
        district: GOLDEN_PLOT?.district ?? "Jodhpur", block: GOLDEN_PLOT?.block ?? "Balesar",
        lat: GOLDEN_PLOT?.lat ?? 26.391, lon: GOLDEN_PLOT?.lon ?? 72.946,
        areaAcres: GOLDEN_PLOT?.areaAcres ?? 2.6,
        createdOffline: offline, consentChannel: "typed",
      });
    }
    store.addObservation(c.id, { symptomCategory: values.symptomCategory, symptomNote: values.symptomNote ?? "", checklist });
    let d: DiagnosisResult | null = null;
    if (quality.passed) d = store.triage(c.id) ?? null;
    if (offline && !activeCaseId) {
      await enqueue({ kind: "case-report", payload: { caseId: c.id } });
      setOutboxN((n) => n + 1);
      app.refreshOutbox();
    }
    await clearDraft();
    setActiveCaseId(null);
    setDone({ c: store.getCase(c.id)!, d });
    setPhase("result");
  };

  const syncNow = useCallback(async () => {
    const items = await outboxItems();
    if (items.length === 0) { setSyncMsg("Outbox empty — nothing to sync."); return; }
    if (!app.effectiveOnline) { setSyncMsg("Still offline — reports stay safely on this device."); return; }
    for (const item of items) {
      const cid = (item.payload as { caseId?: string }).caseId;
      if (cid) store.markSynced(cid);
      await markAttempt(item.id!, null);
      await removeOutbox(item.id!);
    }
    setOutboxN(0);
    app.refreshOutbox();
    setSyncMsg(t("scan.synced") + ` — ${items.length} report(s)`);
    setDone((prev) => (prev ? { ...prev, c: store.getCase(prev.c.id)! } : prev));
  }, [app, store, t]);

  const stepIndex = phase === "consent" ? 0 : phase === "details" ? 1 : phase === "capture" ? 2 : 3;
  const steps = [t("scan.step.consent"), t("scan.step.crop"), t("scan.step.capture"), t("scan.step.review")];

  return (
    <div className="mx-auto max-w-xl px-3 py-4 sm:px-5">
      <h1 className="text-xl font-extrabold tracking-tight text-ink-950">{t("scan.title")}</h1>
      <p className="mt-0.5 text-xs text-ink-500">
        {t("common.demoData")} · {isHi ? "डेमो" : "Demo"} farmer RJ-DEMO-F1042 · plot {GOLDEN_PLOT?.id} ({GOLDEN_PLOT?.block}, {GOLDEN_PLOT?.district})
      </p>

      {/* connectivity / outbox strip */}
      <div className={`mt-3 flex items-center justify-between rounded-lg border px-3 py-2 text-sm font-semibold ${app.effectiveOnline ? "border-leaf-600/40 bg-leaf-50 text-leaf-700" : "border-alert-600/40 bg-alert-50 text-alert-700"}`} role="status">
        <span>{app.effectiveOnline ? `● ${t("common.online")}` : `○ ${t("common.offline")} — ${t("scan.saved.offline")}`}</span>
        <span className="flex items-center gap-2">
          {outboxN > 0 && <span className="rounded-full bg-saffron-500 px-2 py-0.5 text-xs font-extrabold text-ink-950">{outboxN} {t("common.pendingSync")}</span>}
          <button type="button" className="btn-secondary !min-h-[36px] px-2 text-xs" onClick={() => void syncNow()}>{t("common.syncNow")}</button>
          <button type="button" className="btn-secondary !min-h-[36px] px-2 text-xs" onClick={() => app.setSimulateOffline(!app.simulateOffline)}>
            {app.simulateOffline ? "Back online" : "Simulate offline"}
          </button>
          <button type="button" className={`btn-secondary !min-h-[36px] px-2 text-xs ${app.lowBandwidth ? "!bg-ink-900 !text-sand-50" : ""}`} onClick={() => app.setLowBandwidth(!app.lowBandwidth)} title="Reduces non-essential rendering">
            Low-bandwidth
          </button>
        </span>
      </div>
      {syncMsg && <div className="mt-2 rounded-lg border border-ink-800/20 bg-ink-800/5 px-3 py-2 text-xs font-semibold text-ink-700" role="status">{syncMsg}</div>}

      {/* step indicator */}
      <ol className="mt-4 flex items-center gap-1" aria-label="Progress">
        {steps.map((s, i) => (
          <li key={s} className="flex flex-1 items-center gap-1">
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${i <= stepIndex ? "bg-ink-900 text-sand-50" : "bg-sand-200 text-ink-500"}`}>{i + 1}</span>
            <span className={`hidden text-xs font-bold sm:block ${i <= stepIndex ? "text-ink-900" : "text-ink-400"}`}>{s}</span>
            {i < steps.length - 1 && <span className="h-0.5 flex-1 bg-sand-300" aria-hidden="true" />}
          </li>
        ))}
      </ol>
      {resume && phase !== "result" && <div className="mt-3 rounded-lg border border-ink-800/20 bg-ink-800/5 px-3 py-2 text-xs font-semibold text-ink-700">Draft restored from this device — nothing was lost on refresh.</div>}

      {phase === "consent" && (
        <section className="card mt-4 p-4">
          <h2 className="text-lg font-extrabold text-ink-900">{t("scan.consent.title")}</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-700">{t("scan.consent.body")}</p>
          <label className="mt-3 flex min-h-[48px] items-center gap-3 rounded-lg border border-sand-300 px-3">
            <input type="checkbox" className="h-5 w-5" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span className="text-sm font-bold">{t("scan.consent.agree")}</span>
          </label>
          <button type="button" className="btn-primary mt-4 w-full" disabled={!consent} onClick={() => setPhase("details")}>{t("common.next")} →</button>
        </section>
      )}

      {phase === "details" && (
        <section className="card mt-4 p-4">
          <div className="grid gap-3">
            <div>
              <label className="label" htmlFor="crop">{t("scan.crop")}</label>
              <select id="crop" className="input" {...form.register("crop")}>
                {CROPS.map((c) => <option key={c.id} value={c.id}>{isHi ? c.nameHi : c.nameEn}</option>)}
              </select>
              {form.formState.errors.crop && <p className="mt-1 text-xs text-alert-700">{form.formState.errors.crop.message}</p>}
            </div>
            <div>
              <label className="label" htmlFor="stage">{t("scan.stage")}</label>
              <select id="stage" className="input" {...form.register("cropStage")}>
                {(crop?.stages ?? []).map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
              </select>
            </div>
            <div>
              <span className="label">{t("scan.symptom")}</span>
              <div className="grid grid-cols-2 gap-2" role="radiogroup">
                {SYMPTOMS.map((s) => (
                  <label key={s.id} className={`flex min-h-[48px] cursor-pointer items-center rounded-lg border px-3 text-sm font-semibold ${values.symptomCategory === s.id ? "border-ink-900 bg-ink-900 text-sand-50" : "border-sand-300 bg-white"}`}>
                    <input type="radio" className="sr-only" value={s.id} {...form.register("symptomCategory")} />
                    {isHi ? s.labelHi : s.labelEn}
                  </label>
                ))}
              </div>
              {form.formState.errors.symptomCategory && <p className="mt-1 text-xs text-alert-700">{form.formState.errors.symptomCategory.message}</p>}
            </div>
            <div>
              <label className="label" htmlFor="note">{t("scan.note")}</label>
              <textarea id="note" className="input min-h-[64px]" {...form.register("symptomNote")} />
            </div>
            <div className="rounded-lg border border-sand-300 p-3">
              <button type="button" className="btn-secondary w-full text-sm" onClick={() => setVoiceOpen((v) => !v)}>🎙 {t("scan.voice")}</button>
              {voiceOpen && <p className="mt-2 text-xs text-ink-600">{t("scan.voice.note")}</p>}
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button type="button" className="btn-secondary flex-1" onClick={() => setPhase("consent")}>← {t("common.back")}</button>
            <button type="button" className="btn-primary flex-1" onClick={async () => { if (await form.trigger()) setPhase("capture"); }}>{t("common.next")} →</button>
          </div>
        </section>
      )}

      {phase === "capture" && (
        <section className="card mt-4 p-4">
          <h2 className="text-lg font-extrabold text-ink-900">{t("scan.capture.title")}</h2>
          <p className="mt-1 text-xs text-ink-500">Quality gate is checklist-driven in Task 001 (no computer-vision claims). Each item is one photo/view.</p>
          <div className="mt-3 grid gap-2">
            {CHECKLIST.map((item) => (
              <label key={item.key} className={`flex min-h-[52px] items-center gap-3 rounded-lg border px-3 text-sm font-semibold ${checklist[item.key] ? "border-leaf-600/50 bg-leaf-50" : "border-sand-300"}`}>
                <input type="checkbox" className="h-5 w-5" checked={checklist[item.key]} onChange={(e) => setChecklist((c) => ({ ...c, [item.key]: e.target.checked }))} />
                {t(item.tKey)}
              </label>
            ))}
          </div>
          <label className="btn-secondary mt-3 flex w-full cursor-pointer items-center justify-center gap-2">
            📷 {t("scan.capture.addPhoto")}
            <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) setPhotos((p) => [...p, f.name]); }} />
          </label>
          {photos.length > 0 && !app.lowBandwidth && <p className="mt-1 text-xs text-ink-500">Attached: {photos.join(", ")}</p>}

          <div className={`mt-3 rounded-lg border px-3 py-2 ${quality.passed ? "border-leaf-600/40 bg-leaf-50" : "border-saffron-500/40 bg-saffron-50"}`} aria-live="polite">
            <div className="flex items-center justify-between text-sm font-bold">
              <span>{quality.passed ? `✓ ${t("scan.quality.pass")}` : `↻ ${t("scan.quality.fail")}`}</span>
              <span className="tabular-nums">{(quality.coverageScore * 100).toFixed(0)}%</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-sand-200"><div className={`h-2 rounded-full ${quality.passed ? "bg-leaf-600" : "bg-saffron-500"}`} style={{ width: `${quality.coverageScore * 100}%` }} /></div>
            {!quality.passed && (
              <div className="mt-1 text-xs text-ink-700">
                <span className="font-bold">{t("scan.quality.recapture")}</span> {quality.recaptureRequests.join(", ")}
              </div>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <button type="button" className="btn-secondary flex-1" onClick={() => setPhase("details")}>← {t("common.back")}</button>
            <button type="button" className="btn-green flex-1" onClick={() => void submit()}>{t("common.submit")}</button>
          </div>
        </section>
      )}

      {phase === "result" && done && (
        <section className="mt-4 space-y-3">
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-ink-900">{t("field.case")} {done.c.id}</h2>
              <StatusChip state={done.c.state} />
            </div>
            {!done.d && (
              <div className="mt-2 rounded-lg border border-saffron-500/40 bg-saffron-50 px-3 py-2 text-sm">
                <span className="font-bold">{t("scan.quality.fail")}.</span>{" "}
                {done.c.observations.at(-1)?.quality.recaptureRequests.join(", ")}.{" "}
                <button type="button" className="font-bold underline" onClick={() => { setActiveCaseId(done.c.id); setPhase("capture"); setChecklist({ leafClose: true, lowerLeaf: false, wholePlant: false, lightingOk: false }); setDone(null); }}>
                  ↻ Guided recapture
                </button>
              </div>
            )}
            {done.d && (
              <div className="mt-2 rounded-lg border border-ink-800/20 bg-ink-800/5 px-3 py-2 text-sm font-semibold text-ink-800" role="note">
                {t("scan.result.notExpert")}
              </div>
            )}
            <p className="mt-2 text-xs text-ink-500">
              {done.c.pendingSync ? t("scan.saved.offline") : t("scan.synced")} · report and photos stay available offline on this device.
            </p>
          </div>
          {done.d && <DiagnosisPanel d={done.d} compact />}
          <div className="flex gap-2">
            <Link href="/cases" className="btn-secondary flex-1 text-center">{t("nav.cases")} →</Link>
            <button type="button" className="btn-primary flex-1" onClick={() => { setDone(null); setPhase("consent"); setConsent(false); setChecklist({ leafClose: false, lowerLeaf: false, wholePlant: false, lightingOk: false }); setPhotos([]); form.reset({ crop: "bajra", cropStage: "vegetative", symptomCategory: "", symptomNote: "" }); }}>
              + New report
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
