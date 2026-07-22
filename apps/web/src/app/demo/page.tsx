"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DemoBanner } from "@/components/bits";
import GovInfraPath from "@/components/GovInfraPath";
import NegativePath from "@/components/NegativePath";
import { apiDemoReset } from "@/lib/httpProvider";
import { nearestKvks } from "@/lib/kvk";
import { getStore, useDemoStore } from "@/lib/store";

const GOLDEN = "C-2614";
const CLUSTER = "CL-2601";
const POOR = { leafClose: true, lowerLeaf: false, wholePlant: false, lightingOk: false };
const FULL = { leafClose: true, lowerLeaf: true, wholePlant: true, lightingOk: true };

type Mode = "golden" | "negative" | "govinfra";

interface ProofAct {
  number: string;
  title: string;
  outcome: string;
  judges: string;
  link?: { href: string; label: string };
}

const ACTS: ProofAct[] = [
  {
    number: "01",
    title: "See the operational picture",
    outcome: "Begin at the command centre: pilot-district risk, expert decisions, outbreak signals and field response are visible in one screen.",
    judges: "This is not a dashboard of vanity metrics. Every number leads to a case, cluster, mission or outcome.",
    link: { href: "/command-centre", label: "Open command centre" },
  },
  {
    number: "02",
    title: "Prove offline evidence before AI",
    outcome: "Reject a poor capture, guide recapture, restore connectivity and route the usable report through honest triage. The real field route also retains image and voice evidence offline.",
    judges: "Weak evidence is refused with specific guidance. Offline work survives, sync is explicit and uncertainty remains visible. Hindi voice is supported where configured; regional speech remains human-reviewed.",
    link: { href: "/field/scan", label: "Try real image + voice capture" },
  },
  {
    number: "03",
    title: "Put the expert in control",
    outcome: "A structured expert decision confirms the suspected condition, creates a governed learning record and strengthens the nearby outbreak signal.",
    judges: "The system supports confirm, correct, unknown, recapture and field visit. AI never silently becomes an agronomic decision, and no model retrains itself.",
    link: { href: "/expert", label: "Open expert desk" },
  },
  {
    number: "04",
    title: "Coordinate mission, KVK and advisory",
    outcome: "Generate a representative field mission, prepare a referral for the nearest sourced KVK and issue only the approved, versioned non-chemical advisory.",
    judges: "The visit order is reproducible, the KVK pack is privacy-masked and READY TO SHARE rather than falsely marked delivered, and chemical guidance remains locked.",
    link: { href: "/support", label: "Open KVK support desk" },
  },
  {
    number: "05",
    title: "Close the loop and learn safely",
    outcome: "Record farmer improvement, preserve the audit chain and retain expert-labelled local evidence for a future evaluated model cycle.",
    judges: "The product measures what happened after advice. Corrections become reviewable learning records, not uncontrolled model updates.",
    link: { href: "/learning", label: "Open learning evidence" },
  },
];

export default function DemoController() {
  const store = getStore();
  const [mode, setMode] = useState<Mode>("golden");
  const [act, setAct] = useState(0);
  const [overviewSeen, setOverviewSeen] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const golden = useDemoStore((s) => s.getState().cases.find((c) => c.id === GOLDEN));
  const cluster = useDemoStore((s) => s.clustersWithScores().find((c) => c.id === CLUSTER));
  const missions = useDemoStore((s) => s.getState().missions);
  const referrals = useDemoStore((s) => s.getState().referrals);
  const learningRecords = useDemoStore((s) => s.getState().learningRecords);

  const currentGolden = () => store.getState().cases.find((c) => c.id === GOLDEN);
  const say = (message: string) => setLog((items) => [...items, message]);
  const referral = referrals.find((item) => item.caseId === GOLDEN);
  const caseLearningRecords = learningRecords.filter((item) => item.caseId === GOLDEN);

  const done = useMemo(() => {
    if (!golden) return [overviewSeen, false, false, false, false];
    const hasMission = missions.some((m) => m.clusterId === CLUSTER);
    const hasReferral = referrals.some((item) => item.caseId === GOLDEN);
    const hasLearningRecord = learningRecords.some((item) => item.caseId === GOLDEN);
    return [
      overviewSeen,
      golden.observations.some((o) => !o.quality.passed) && golden.observations.some((o) => o.quality.passed) && golden.diagnosis !== null,
      golden.reviews.some((r) => r.decision === "confirm") && hasLearningRecord,
      hasMission && hasReferral && golden.advisoryRef !== null,
      golden.followUps.length > 0 && hasLearningRecord,
    ];
  }, [golden, learningRecords, missions, overviewSeen, referrals]);

  const beginProof = () => {
    if (overviewSeen) return;
    setOverviewSeen(true);
    say("Operational picture acknowledged → every KPI remains linked to underlying evidence and action.");
  };

  const runEvidenceProof = () => {
    let current = currentGolden();
    if (!current) return;

    if (!current.observations.some((o) => !o.quality.passed)) {
      store.addObservation(GOLDEN, {
        symptomCategory: "pale_streaking",
        symptomNote: "Pale streaking on emerging leaves (first attempt)",
        checklist: POOR,
      });
      say("Poor capture rejected → lower-leaf, whole-plant and lighting guidance shown.");
    }

    current = currentGolden();
    if (current && !current.observations.some((o) => o.quality.passed)) {
      store.markSynced(GOLDEN);
      store.addObservation(GOLDEN, {
        symptomCategory: "pale_streaking",
        symptomNote: "Recapture: lower leaf surface + whole plant, good light",
        checklist: FULL,
      });
      say("Guided recapture passed → offline report synced → ready for triage.");
    }

    current = currentGolden();
    if (current && !current.diagnosis) {
      const diagnosis = store.triage(GOLDEN);
      if (diagnosis) {
        say(`Honest triage → ${diagnosis.candidates.map((c) => `${c.conditionId} ${c.simConfidence}`).join(" / ")} → expert review required.`);
      }
    }
  };

  const runExpertProof = () => {
    const current = currentGolden();
    if (!current || current.reviews.some((r) => r.decision === "confirm")) return;
    store.review(GOLDEN, {
      decision: "confirm",
      conditionId: "downy_mildew",
      note: "Lower-leaf sporulation evidence consistent; pattern matches cluster cases.",
    });
    say("Expert confirmation recorded → learning record created → cluster score strengthened.");
  };

  const runResponseProof = () => {
    const current = currentGolden();
    if (!current) return;

    if (!store.getState().missions.some((m) => m.clusterId === CLUSTER && m.status !== "COMPLETED")) {
      const mission = store.generateMission(CLUSTER);
      say("error" in mission ? mission.error : `Mission ${mission.id} created: ${mission.routeOrder.join(" → ")}.`);
    }

    if (!store.getState().referrals.some((item) => item.caseId === GOLDEN)) {
      const nearest = nearestKvks(current.lat, current.lon, current.district, 1)[0];
      if (nearest) {
        const created = store.createReferral(GOLDEN, {
          kvkId: nearest.id,
          reason: "Expert-confirmed high-spread-risk crop-health signal",
          note: "Privacy-masked evidence pack prepared for agronomy review; external delivery is not automated in this demo.",
          urgency: "PRIORITY",
        });
        if (created) {
          say(`Referral ${created.id} prepared for ${nearest.name} (${nearest.distanceKm} km estimated) → READY TO SHARE; delivery not claimed.`);
        }
      }
    }

    const refreshed = currentGolden();
    if (refreshed && !refreshed.advisoryRef) {
      store.issueAdvisory(GOLDEN, "ADV-2601-v0.3");
      say("Approved advisory issued → non-chemical action only → chemical section remains locked.");
    }
  };

  const runOutcomeProof = () => {
    const current = currentGolden();
    if (!current || current.followUps.length > 0) return;
    store.followUp(GOLDEN, {
      status: "improving",
      note: "Roguing done; no new streaking on re-visit (simulated follow-up)",
    });
    say("Five-day follow-up recorded → improving → outcome and audit trail updated.");
  };

  const actions: Array<{ label: string; run: () => void }> = [
    { label: "Begin evaluator proof", run: beginProof },
    { label: "Run evidence-quality proof", run: runEvidenceProof },
    { label: "Record expert verification", run: runExpertProof },
    { label: "Launch field + KVK response", run: runResponseProof },
    { label: "Record measured outcome", run: runOutcomeProof },
  ];

  const reset = () => {
    store.reset();
    void apiDemoReset();
    setOverviewSeen(false);
    setLog([]);
    setAct(0);
  };

  const completedCount = done.filter(Boolean).length;
  const currentAct = ACTS[act];
  const action = actions[act];
  const nextIncomplete = done.findIndex((item) => !item);

  return (
    <div className="mx-auto max-w-[1320px] px-3 pb-10 pt-4 sm:px-5 sm:pt-6">
      <section className="surface-dark px-5 py-5 sm:px-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-saffron-500">Evaluator mode</p>
              <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-ink-400">Deterministic · resettable · traceable</span>
            </div>
            <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.035em] text-white sm:text-4xl">The complete proof in five acts.</h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-ink-400">
              Pilot-district risk → offline evidence → expert verification → mission and KVK response → measured outcome. One primary action per act; deeper technical proof stays secondary.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <ProofBadge value="5 acts" />
            <ProofBadge value="≈3 minutes" />
            <button type="button" className="inline-flex min-h-[44px] items-center rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/10" onClick={reset}>↺ Reset proof</button>
          </div>
        </div>
      </section>

      <div className="mt-3"><DemoBanner /></div>

      <section className="mt-3 overflow-hidden rounded-2xl border border-sand-200 bg-sand-200" aria-label="Official challenge coverage">
        <div className="grid gap-px sm:grid-cols-2 xl:grid-cols-4">
          <ChallengeFit title="Offline crop workflow" detail="Bajra · mustard · guar · cumin; conservative research screening" />
          <ChallengeFit title="Hindi + regional voice" detail="Real recorder; Hindi ASR when configured; dialect notes human-reviewed" href="/field/scan" />
          <ChallengeFit title="Nearest KVK linkage" detail="Sourced directory, distance match, SLA and evidence pack in Act 4" />
          <ChallengeFit title="Local learning loop" detail="Expert-labelled records; evaluated promotion only, never auto-training" />
        </div>
      </section>

      <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Demo mode">
        <button type="button" role="tab" aria-selected={mode === "golden"} onClick={() => setMode("golden")} className={`btn-secondary ${mode === "golden" ? "!border-ink-900 !bg-ink-900 !text-white" : ""}`}>Primary evaluator proof</button>
        <button type="button" role="tab" aria-selected={mode === "negative"} onClick={() => setMode("negative")} className={`btn-secondary ${mode === "negative" ? "!border-ink-900 !bg-ink-900 !text-white" : ""}`}>Stress tests</button>
        <button type="button" role="tab" aria-selected={mode === "govinfra"} onClick={() => setMode("govinfra")} className={`btn-secondary ${mode === "govinfra" ? "!border-ink-900 !bg-ink-900 !text-white" : ""}`}>Government infrastructure</button>
      </div>

      {mode === "negative" && <NegativePath />}
      {mode === "govinfra" && <GovInfraPath />}

      {mode === "golden" && (
        <>
          <div className="mt-4 grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="card p-3">
              <div className="px-2 pb-3 pt-1">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="eyebrow">Proof progress</p>
                    <p className="mt-1 text-sm font-extrabold text-ink-950">{completedCount} of {ACTS.length} proof acts complete</p>
                  </div>
                  <span className="text-lg font-extrabold text-leaf-700 tabular-nums">{Math.round((completedCount / ACTS.length) * 100)}%</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-sand-200" role="progressbar" aria-valuenow={completedCount} aria-valuemax={ACTS.length} aria-label="Demo progress">
                  <div className="h-full rounded-full bg-leaf-600 transition-all" style={{ width: `${(completedCount / ACTS.length) * 100}%` }} />
                </div>
              </div>

              <ol className="space-y-1" aria-label="Demo acts">
                {ACTS.map((item, index) => (
                  <li key={item.number}>
                    <button
                      type="button"
                      onClick={() => setAct(index)}
                      aria-current={index === act ? "step" : undefined}
                      className={`w-full rounded-xl px-3 py-3 text-left transition ${index === act ? "bg-ink-900 text-white" : "hover:bg-sand-50"}`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold ${index === act ? "bg-white/10 text-white" : done[index] ? "bg-leaf-100 text-leaf-700" : "bg-sand-100 text-ink-500"}`}>
                          {done[index] ? "✓" : item.number}
                        </span>
                        <span className="pt-1 text-sm font-extrabold leading-snug">{item.title}</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ol>
            </aside>

            <section className="card overflow-hidden" aria-live="polite">
              <div className="border-b border-sand-200 bg-sand-50/70 px-5 py-4 sm:px-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="eyebrow">Act {currentAct.number}</p>
                    <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-ink-950">{currentAct.title}</h2>
                  </div>
                  {done[act] && <span className="chip border-leaf-600/30 bg-leaf-100 text-leaf-700">✓ proof complete</span>}
                </div>
              </div>

              <div className="p-5 sm:p-6">
                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
                  <div>
                    <p className="text-base leading-8 text-ink-700">{currentAct.outcome}</p>
                    <div className="mt-5 rounded-2xl border border-ink-800/10 bg-ink-800/[0.035] p-4">
                      <p className="eyebrow">What the committee should notice</p>
                      <p className="mt-2 text-sm leading-7 text-ink-700">{currentAct.judges}</p>
                    </div>

                    <div className="mt-6 flex flex-wrap gap-3">
                      <button type="button" className="btn-green" onClick={action.run} disabled={done[act]}>
                        {done[act] ? "Proof completed" : action.label} →
                      </button>
                      {currentAct.link && <Link href={currentAct.link.href} className="btn-primary">{currentAct.link.label}</Link>}
                      {nextIncomplete >= 0 && nextIncomplete !== act && (
                        <button type="button" className="btn-secondary" onClick={() => setAct(nextIncomplete)}>Go to next incomplete act</button>
                      )}
                    </div>
                  </div>

                  {golden && (
                    <section className="rounded-2xl border border-sand-200 bg-sand-50/70 p-4 text-sm" aria-label="Golden case live state">
                      <p className="eyebrow">Golden case live state</p>
                      <p className="mt-2 font-mono text-xs font-extrabold text-ink-950">C-2614</p>
                      <div className="mt-4 space-y-3">
                        <LiveStateRow label="Case state" value={humanState(golden.state)} technical={golden.state} />
                        <LiveStateRow label="Observations" value={golden.observations.length} />
                        <LiveStateRow label="Expert reviews" value={golden.reviews.length} />
                        <LiveStateRow label="Learning records" value={caseLearningRecords.length} />
                        <LiveStateRow label="KVK referral" value={referral ? humanState(referral.status) : "Not prepared"} technical={referral?.status} />
                        <LiveStateRow label="Follow-ups" value={golden.followUps.length} />
                        <LiveStateRow label="Cluster score" value={cluster?.score.score ?? "—"} />
                        <LiveStateRow label="Cluster status" value={humanState(cluster?.status ?? "—")} technical={cluster?.status} />
                        <LiveStateRow label="Verified share" value={`${cluster?.score.verifiedCount ?? 0}/${cluster?.score.memberCount ?? 0}`} />
                      </div>
                    </section>
                  )}
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-sand-200 pt-4">
                  <button type="button" className="btn-secondary" disabled={act === 0} onClick={() => setAct((value) => Math.max(0, value - 1))}>← Previous act</button>
                  <button type="button" className="btn-secondary" disabled={act === ACTS.length - 1} onClick={() => setAct((value) => Math.min(ACTS.length - 1, value + 1))}>Next act →</button>
                </div>
              </div>
            </section>
          </div>

          {log.length > 0 && (
            <section className="card mt-4 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="eyebrow">Action log</p>
                  <h3 className="mt-1 text-base font-extrabold text-ink-950">What the deterministic proof changed</h3>
                </div>
                <button type="button" className="text-xs font-extrabold text-ink-500" onClick={() => setLog([])}>Clear log</button>
              </div>
              <ul className="mt-3 grid gap-2 md:grid-cols-2">{log.map((item, index) => <li key={`${item}-${index}`} className="rounded-xl border border-sand-200 bg-sand-50/70 px-3 py-2.5 text-sm leading-relaxed text-ink-700">{item}</li>)}</ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function ChallengeFit({ title, detail, href }: { title: string; detail: string; href?: string }) {
  const content = (
    <div className="h-full bg-white px-3 py-3.5">
      <p className="text-xs font-extrabold text-ink-950">✓ {title}</p>
      <p className="mt-1 text-[11px] leading-5 text-ink-500">{detail}</p>
    </div>
  );
  return href ? <Link href={href} className="block h-full hover:bg-sand-50">{content}</Link> : content;
}

function ProofBadge({ value }: { value: string }) {
  return <span className="rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-extrabold text-white">{value}</span>;
}

function humanState(value: string): string {
  if (value === "—") return value;
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function LiveStateRow({ label, value, technical }: { label: string; value: string | number; technical?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-sand-200 pb-2 last:border-0 last:pb-0" title={technical}>
      <span className="text-xs font-semibold text-ink-500">{label}</span>
      <span className="text-right text-xs font-extrabold text-ink-950 tabular-nums">{value}</span>
    </div>
  );
}
