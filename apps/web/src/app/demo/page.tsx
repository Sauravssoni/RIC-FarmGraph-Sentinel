"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { getStore, useDemoStore } from "@/lib/store";
import { apiDemoReset } from "@/lib/httpProvider";
import { DemoBanner } from "@/components/bits";
import NegativePath from "@/components/NegativePath";

const GOLDEN = "C-2614";
const CLUSTER = "CL-2601";
const POOR = { leafClose: true, lowerLeaf: false, wholePlant: false, lightingOk: false };
const FULL = { leafClose: true, lowerLeaf: true, wholePlant: true, lightingOk: true };

interface Step {
  title: string;
  presenter: string;
  judges: string;
  link?: { href: string; label: string };
}

const STEPS: Step[] = [
  {
    title: "State-level command centre",
    presenter: "Open on the command centre. This is the district officer's morning view: active cases, expert queue, suspected clusters, pending offline syncs.",
    judges: "Every KPI drills into underlying cases; nothing is a vanity metric. Demo-data banner and provider mode are always visible.",
    link: { href: "/command-centre", label: "Open command centre" },
  },
  {
    title: "Farmer starts an offline report",
    presenter: "Golden case C-2614: farmer RJ-DEMO-F1042, plot RJ-DEMO-PLOT-118, Balesar (Jodhpur), bajra at vegetative stage, pale streaking. Report was created offline on device and is waiting to sync.",
    judges: "The field scan works fully offline: draft survives refresh, outbox queues the report, consent is explicit, Hindi UI available.",
    link: { href: "/field/scan", label: "Open field scan" },
  },
  {
    title: "First capture fails the quality gate",
    presenter: "Run the action: the farmer submits only a top-leaf photo in poor light. The quality gate rejects it and names exactly what is missing.",
    judges: "No garbage-in: the system refuses weak evidence and says why (lower leaf surface + whole-plant context missing).",
  },
  {
    title: "Guided recapture",
    presenter: "Run the action: guided checklist walks the farmer through lower-leaf and whole-plant captures; connectivity returns and the report syncs.",
    judges: "Recapture is guided, not blamed. Sync is explicit in the timeline.",
  },
  {
    title: "Differential diagnosis with uncertainty",
    presenter: "Run the action: the deterministic demo engine returns downy mildew 0.62, nutrient stress 0.27, unknown 0.11 — clearly labelled simulated scores.",
    judges: "Alternatives and uncertainty are shown, not a single overconfident label. No accuracy is claimed anywhere.",
  },
  {
    title: "Case enters the expert queue",
    presenter: "Confidence is below the autonomous threshold and similar cases exist nearby, so the case routes to expert review with a priority reason.",
    judges: "Abstention/routing policy is visible; AI triage is never presented as expert confirmation.",
    link: { href: "/expert", label: "Open expert queue" },
  },
  {
    title: "Expert confirms the suspected condition",
    presenter: "Run the action (or do it live in the expert queue with a structured note): the expert confirms downy mildew on the evidence.",
    judges: "Structured note required — no one-click approve-all. Correction and mark-unknown are equally supported.",
  },
  {
    title: "Outbreak cluster strengthens",
    presenter: "Confirmation raises the verified share of cluster CL-2601; its score crosses the verified-outbreak threshold (watch the breakdown).",
    judges: "Scoring is explainable — every component and the duplicate penalty are visible. A dismissed duplicate cluster is shown for contrast.",
    link: { href: "/outbreaks", label: "Open outbreak intelligence" },
  },
  {
    title: "Field mission is generated",
    presenter: "Run the action: a representative verification mission is created for the cluster with a deterministic, explainable visit order.",
    judges: "Information-gain ordering is honest (unverified first, then nearest) — not a fake optimiser.",
    link: { href: "/missions", label: "Open missions" },
  },
  {
    title: "Safe advisory is issued",
    presenter: "Run the action: advisory ADV-2601-v0.3 (approved, versioned) is issued: roguing, irrigation timing, drainage, monitoring, escalation triggers.",
    judges: "Chemical section stays LOCKED — approved expert content required. No invented doses anywhere.",
    link: { href: `/cases/${GOLDEN}`, label: "Open golden case" },
  },
  {
    title: "Farmer follow-up is recorded",
    presenter: "Run the action: five days on, the field worker records improvement — the case moves to IMPROVING. (C-2617 shows the opposite: no improvement, escalated.)",
    judges: "Outcomes close the loop; non-improvement escalates instead of disappearing.",
  },
  {
    title: "Outcome & audit evidence",
    presenter: "Close on governance: the full case-to-outcome chain, advisory lifecycle board, honest model registry and the append-only audit stream.",
    judges: "Everything the committee just saw is reconstructable from audit events. Reset restores the deterministic demo.",
    link: { href: "/governance", label: "Open governance" },
  },
];

export default function DemoController() {
  const store = getStore();
  const [mode, setMode] = useState<"golden" | "negative">("golden");
  const [step, setStep] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const golden = useDemoStore((s) => s.getState().cases.find((c) => c.id === GOLDEN));
  const cluster = useDemoStore((s) => s.clustersWithScores().find((c) => c.id === CLUSTER));
  const missions = useDemoStore((s) => s.getState().missions);

  const say = (m: string) => setLog((l) => [...l, m]);

  const done = useMemo(() => {
    if (!golden) return [] as boolean[];
    const clusterMission = missions.find((m) => m.clusterId === CLUSTER);
    return [
      true,
      golden.state === "DRAFT" || golden.observations.length >= 0,
      golden.observations.some((o) => !o.quality.passed),
      golden.observations.some((o) => o.quality.passed),
      golden.diagnosis !== null,
      golden.state === "AWAITING_EXPERT" || golden.reviews.length > 0,
      golden.reviews.some((r) => r.decision === "confirm"),
      (cluster?.score.verifiedCount ?? 0) >= 3,
      clusterMission !== undefined,
      golden.advisoryRef !== null,
      golden.followUps.length > 0,
      true,
    ];
  }, [golden, cluster, missions]);

  const actions: (null | { label: string; run: () => void })[] = [
    null,
    null,
    {
      label: "Simulate first capture (low quality)",
      run: () => {
        if (!golden || golden.observations.some((o) => !o.quality.passed)) return;
        store.addObservation(GOLDEN, { symptomCategory: "pale_streaking", symptomNote: "Pale streaking on emerging leaves (first attempt)", checklist: POOR });
        say("First capture submitted → quality gate FAILED → NEEDS_RECAPTURE");
      },
    },
    {
      label: "Simulate guided recapture + sync",
      run: () => {
        if (!golden || golden.observations.some((o) => o.quality.passed)) return;
        store.markSynced(GOLDEN);
        store.addObservation(GOLDEN, { symptomCategory: "pale_streaking", symptomNote: "Recapture: lower leaf surface + whole plant, good light", checklist: FULL });
        say("Recapture passed coverage 1.00 → synced → READY_FOR_TRIAGE");
      },
    },
    {
      label: "Run deterministic demo triage",
      run: () => {
        if (!golden || golden.diagnosis) return;
        const d = store.triage(GOLDEN);
        if (d) say(`Triage: ${d.candidates.map((c) => `${c.conditionId} ${c.simConfidence}`).join(" / ")} → AWAITING_EXPERT`);
      },
    },
    null,
    {
      label: "Expert confirms downy mildew",
      run: () => {
        if (!golden || golden.reviews.some((r) => r.decision === "confirm")) return;
        store.review(GOLDEN, { decision: "confirm", conditionId: "downy_mildew", note: "Lower-leaf sporulation evidence consistent; pattern matches cluster cases." });
        say("Expert confirmed → EXPERT_CONFIRMED → cluster re-scored");
      },
    },
    null,
    {
      label: "Generate verification mission",
      run: () => {
        const r = store.generateMission(CLUSTER);
        say("error" in r ? r.error : `Mission ${r.id} created: ${r.routeOrder.join(" → ")}`);
      },
    },
    {
      label: "Issue safe advisory ADV-2601-v0.3",
      run: () => {
        if (!golden || golden.advisoryRef) return;
        store.issueAdvisory(GOLDEN, "ADV-2601-v0.3");
        say("Safe advisory issued (non-chemical; chemical remains locked)");
      },
    },
    {
      label: "Record follow-up: improving",
      run: () => {
        if (!golden || golden.followUps.length > 0) return;
        store.followUp(GOLDEN, { status: "improving", note: "Roguing done; no new streaking on re-visit (simulated follow-up)" });
        say("Follow-up recorded → IMPROVING → outcome updated");
      },
    },
    null,
  ];

  const reset = () => {
    store.reset();
    void apiDemoReset();
    setLog(["Demo reset — deterministic seed restored"]);
    setStep(0);
  };

  const completedCount = done.filter(Boolean).length;
  const s = STEPS[step];
  const action = actions[step];

  return (
    <div className="mx-auto max-w-4xl px-3 py-4 sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-950">Guided demonstration</h1>
          <p className="text-sm text-ink-500">Presenter-controlled golden path — deterministic, repeatable, honest.</p>
        </div>
        <button type="button" className="btn-amber" onClick={reset}>↺ Reset demo</button>
      </div>
      <div className="mt-3"><DemoBanner /></div>

      {/* Judge mode tabs: golden path vs adversarial negative path */}
      <div className="mt-4 flex gap-2" role="tablist" aria-label="Demo mode">
        <button type="button" role="tab" aria-selected={mode === "golden"} onClick={() => setMode("golden")}
          className={`btn-secondary !min-h-[40px] text-sm ${mode === "golden" ? "!bg-ink-900 !text-sand-50" : ""}`}>
          ① Golden path (12 steps)
        </button>
        <button type="button" role="tab" aria-selected={mode === "negative"} onClick={() => setMode("negative")}
          className={`btn-secondary !min-h-[40px] text-sm ${mode === "negative" ? "!bg-ink-900 !text-sand-50" : ""}`}>
          ② Negative path (adversarial)
        </button>
      </div>

      {mode === "negative" && <NegativePath />}

      {mode === "golden" && (<>
      <div className="mt-4 h-2.5 rounded-full bg-sand-200" role="progressbar" aria-valuenow={completedCount} aria-valuemax={STEPS.length} aria-label="Demo progress">
        <div className="h-2.5 rounded-full bg-leaf-600 transition-all" style={{ width: `${(completedCount / STEPS.length) * 100}%` }} />
      </div>
      <div className="mt-1 text-xs text-ink-500">{completedCount} of {STEPS.length} steps complete</div>

      <ol className="mt-4 flex flex-wrap gap-1.5" aria-label="Steps">
        {STEPS.map((st, i) => (
          <li key={st.title}>
            <button
              type="button"
              onClick={() => setStep(i)}
              aria-current={i === step ? "step" : undefined}
              className={`h-8 w-8 rounded-full text-xs font-extrabold ${i === step ? "bg-ink-900 text-sand-50" : done[i] ? "bg-leaf-600 text-white" : "bg-sand-200 text-ink-600"}`}
              title={st.title}
            >
              {i + 1}
            </button>
          </li>
        ))}
      </ol>

      <section className="card mt-4 p-5" aria-live="polite">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-xl font-extrabold text-ink-900">Step {step + 1}: {s.title}</h2>
          {done[step] && <span className="chip bg-leaf-100 text-leaf-700 border-leaf-600/40">✓ done</span>}
        </div>
        <p className="mt-2 text-sm leading-relaxed text-ink-700">{s.presenter}</p>
        <div className="mt-3 rounded-lg border border-ink-800/20 bg-ink-800/5 px-3 py-2 text-sm">
          <span className="font-extrabold text-ink-900">What judges should notice: </span>{s.judges}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {action && (
            <button type="button" className="btn-green" onClick={action.run} disabled={done[step]}>
              ▶ {action.label}
            </button>
          )}
          {s.link && <Link href={s.link.href} className="btn-primary">{s.link.label} →</Link>}
        </div>
        <div className="mt-4 flex justify-between border-t border-sand-200 pt-3">
          <button type="button" className="btn-secondary" disabled={step === 0} onClick={() => setStep((v) => Math.max(0, v - 1))}>← Previous</button>
          <button type="button" className="btn-secondary" disabled={step === STEPS.length - 1} onClick={() => setStep((v) => Math.min(STEPS.length - 1, v + 1))}>Next →</button>
        </div>
      </section>

      {golden && (
        <section className="card mt-4 p-4 text-sm">
          <h3 className="font-extrabold">Golden case live state</h3>
          <p className="mt-1">C-2614 — state <span className="font-bold">{golden.state}</span> · observations {golden.observations.length} · reviews {golden.reviews.length} · follow-ups {golden.followUps.length} · cluster CL-2601 score <span className="font-bold">{cluster?.score.score}</span> ({cluster?.status}, {cluster?.score.verifiedCount}/{cluster?.score.memberCount} verified)</p>
        </section>
      )}

      {log.length > 0 && (
        <section className="card mt-4 p-4">
          <h3 className="text-sm font-extrabold">Action log</h3>
          <ul className="mt-1 list-disc pl-5 text-sm text-ink-700">{log.map((l, i) => <li key={i}>{l}</li>)}</ul>
        </section>
      )}
      </>)}
    </div>
  );
}
