/**
 * Referral evidence pack (kvk-referral-pack/v1) — standalone builder.
 *
 * Mirrors apps/api/app/repository.py::build_referral_pack field-for-field.
 * When the demo backend is connected the API pack endpoint is authoritative;
 * this builder produces the identical artefact from the browser DemoStore so
 * standalone mode degrades safely without inventing data.
 *
 * Privacy rule (both sides): coordinates rounded to 2 dp (~1 km); the farmer
 * reference is the pseudonymous FarmGraph ID only — never a name, phone,
 * Aadhaar or Jan Aadhaar number.
 */
import type { Case, KvkRecord, Referral, ReferralPack } from "@contracts";
import { DEFAULT_SLA_HOURS, referralSlaStatus } from "./kvk";

interface PackContext {
  kase: Case;
  referral: Referral;
  kvk: KvkRecord | undefined;
  outbreakRelationship: string;
  generatedAt?: string;
}

export function buildReferralPack({ kase, referral, kvk, outbreakRelationship, generatedAt }: PackContext): ReferralPack {
  const obs = kase.observations ?? [];
  const latest = obs[obs.length - 1];
  const diag = (kase.diagnosis ?? {}) as {
    provider?: string; modelVersion?: string;
    candidates?: { conditionId?: string; simConfidence?: number; label?: string }[];
  };
  const top = diag.candidates?.[0] ?? {};
  const verified = Boolean(kase.expertConfirmedCondition) || kase.state === "EXPERT_CONFIRMED";
  const referralEvents = kase.timeline.filter((e) => e.type.startsWith("kvk_referral"));
  const consent = kase.consent as { given?: boolean; purposeNote?: string } | undefined;

  // Prefer real Phase-B evidence (SHA-256 hashes, pixel quality, edge
  // inference) when the observation carries it; fall back to seeded refs.
  const imageHashes = obs.flatMap((o) => o.imageHashes ?? (o.imageRef ? [o.imageRef] : []));
  const imageQuality = latest?.pixelQuality
    ? `pixel score=${latest.pixelQuality.score}, pass=${latest.pixelQuality.pass}`
    : latest?.quality
      ? `passed=${latest.quality.passed}, coverageScore=${latest.quality.coverageScore}`
      : "no quality record";
  const inference = latest?.edgeInference
    ? { provider: latest.edgeInference.providerId, version: latest.edgeInference.modelVersion,
        topLabel: latest.edgeInference.topClass, topScore: latest.edgeInference.topScore }
    : { provider: diag.provider ?? "none", version: diag.modelVersion ?? "n/a",
        topLabel: top.conditionId ?? null, topScore: top.simConfidence ?? null };

  return {
    packVersion: "kvk-referral-pack/v1",
    generatedAt: generatedAt ?? new Date().toISOString(),
    referralId: referral.id,
    referralStatus: referral.status,
    caseId: kase.id,
    farmerRef: kase.farmerId,
    plotRef: kase.plotId,
    district: kase.district,
    block: kase.block,
    coordinates: {
      lat: Math.round(kase.lat * 100) / 100,
      lon: Math.round(kase.lon * 100) / 100,
      precisionNote: "Rounded to ~1 km for farmer privacy (demo policy)",
    },
    crop: kase.crop,
    cropStage: kase.cropStage,
    symptomSummary: latest?.symptomNote || top.label || "See case evidence",
    imageHashes,
    imageQuality,
    inference,
    verificationStatement: verified
      ? "Expert-reviewed in demo workflow — see review history"
      : "UNVERIFIED — screening result only; not confirmed by an agronomist",
    expertReviewState: kase.state,
    urgency: referral.urgency ?? "PRIORITY",
    outbreakRelationship,
    requestedAction: `${referral.reason}. ${referral.note ?? ""}`.trim(),
    originatingRole: referral.createdBy ?? "expert (demo)",
    consentStatus: consent?.given
      ? `CONSENT RECORDED (demo) — ${consent.purposeNote ?? "crop-health purpose"}`
      : "NO CONSENT RECORDED",
    createdAt: referral.createdAt,
    sla: {
      targetHours: referral.slaTargetHours ?? DEFAULT_SLA_HOURS,
      dueAt: referral.dueAt,
      status: referralSlaStatus(referral),
    },
    auditReference: referralEvents.length > 0 ? referralEvents[referralEvents.length - 1].id : "no audit event",
    farmgraphContact: "FarmGraph Rakshak demo helpdesk — callback placeholder (no live helpdesk in prototype)",
    kvk: kvk
      ? { id: kvk.id, name: kvk.name, district: kvk.district, phone: kvk.phone || null, email: kvk.email || null, address: kvk.address }
      : { id: referral.kvkId, name: "unknown", district: "", phone: null, email: null, address: "" },
    provenance:
      "SIMULATED DEMO PACK — case data synthetic; KVK contact from sourced official directory " +
      "(see data/reference/kvk-directory.json); delivery to KVK not automated",
  };
}

function esc(s: unknown): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** PDF-friendly printable HTML rendering of the pack (print → save as PDF). */
export function packToPrintableHtml(pack: ReferralPack): string {
  const rows: [string, unknown][] = [
    ["Referral ID", pack.referralId],
    ["Referral status", pack.referralStatus],
    ["Case ID", pack.caseId],
    ["Farmer reference (pseudonymous)", pack.farmerRef],
    ["Plot reference", pack.plotRef],
    ["District / Block", `${pack.district} / ${pack.block}`],
    ["Coordinates", `${pack.coordinates.lat}, ${pack.coordinates.lon} — ${pack.coordinates.precisionNote}`],
    ["Crop / stage", `${pack.crop} / ${pack.cropStage}`],
    ["Symptom summary", pack.symptomSummary],
    ["Evidence references", pack.imageHashes.join(", ") || "none attached"],
    ["Image quality", pack.imageQuality],
    ["Inference", `${pack.inference.provider} v${pack.inference.version} — top: ${pack.inference.topLabel ?? "none"} (${pack.inference.topScore ?? "n/a"})`],
    ["Verification", pack.verificationStatement],
    ["Expert-review state", pack.expertReviewState],
    ["Urgency", pack.urgency],
    ["Outbreak relationship", pack.outbreakRelationship],
    ["Requested KVK action", pack.requestedAction],
    ["Originating role", pack.originatingRole],
    ["Consent", pack.consentStatus],
    ["Created", pack.createdAt],
    ["SLA", `${pack.sla.targetHours}h target — due ${pack.sla.dueAt} — ${pack.sla.status}`],
    ["Audit reference", pack.auditReference],
    ["FarmGraph contact", pack.farmgraphContact],
    ["KVK", `${pack.kvk.name} (${pack.kvk.district}) — ${pack.kvk.phone ?? "no phone listed"} — ${pack.kvk.email ?? "no email listed"}`],
    ["KVK address", pack.kvk.address],
    ["Provenance", pack.provenance],
  ];
  const body = rows
    .map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`)
    .join("\n");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>KVK Referral Pack ${esc(pack.referralId)}</title>
<style>
  body { font-family: system-ui, "Noto Sans", sans-serif; margin: 32px; color: #17233b; }
  h1 { font-size: 20px; margin: 0 0 4px; } h2 { font-size: 13px; font-weight: 600; color: #5a6c90; margin: 0 0 16px; }
  table { border-collapse: collapse; width: 100%; font-size: 12.5px; }
  th, td { border: 1px solid #d9cdb2; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { width: 220px; background: #f4efe3; }
  .banner { border: 2px solid #e08a00; background: #fdf6e9; padding: 8px 10px; font-size: 12px; font-weight: 700; margin-bottom: 14px; }
  footer { margin-top: 18px; font-size: 10.5px; color: #5a6c90; }
  @media print { body { margin: 12mm; } }
</style></head><body>
<div class="banner">DEMO PROTOTYPE — SYNTHETIC FARMER DATA · NO REAL FARMER IDENTITY · KVK DELIVERY NOT AUTOMATED</div>
<h1>KVK Referral Evidence Pack — ${esc(pack.referralId)}</h1>
<h2>FarmGraph Rakshak (demo) · ${esc(pack.packVersion)} · generated ${esc(pack.generatedAt)}</h2>
<table>${body}
</table>
<footer>No Aadhaar/Jan Aadhaar data. Coordinates privacy-rounded. Provenance: ${esc(pack.provenance)}</footer>
</body></html>`;
}

/** Trigger a client-side download of the pack (JSON or printable HTML). */
export function downloadPack(pack: ReferralPack, format: "json" | "html"): void {
  const content = format === "json" ? JSON.stringify(pack, null, 2) : packToPrintableHtml(pack);
  const type = format === "json" ? "application/json" : "text/html";
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${pack.referralId}-evidence-pack.${format === "json" ? "json" : "html"}`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Open the printable HTML in a new tab and invoke the print dialog. */
export function printPack(pack: ReferralPack): void {
  const blob = new Blob([packToPrintableHtml(pack)], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank");
  if (w) w.addEventListener("load", () => w.print());
}
