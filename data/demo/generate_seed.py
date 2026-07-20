#!/usr/bin/env python3
"""FarmGraph Rakshak — deterministic demo seed generator (single source of truth).

Generates data/demo/seed.json. Everything here is SIMULATED demo data with
pseudonymous identifiers only. No real farmer, field or government data.

Run:  python3 data/demo/generate_seed.py
"""
from __future__ import annotations

import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
DEMO_NOW = "2026-07-17T11:00:00+05:30"
POLICY = json.loads((HERE / "policy.json").read_text())
TAXONOMY = json.loads((HERE / "taxonomy.json").read_text())
W = POLICY["captureQuality"]["weights"]
MIN_COV = POLICY["captureQuality"]["minCoverage"]

COND = {c["id"]: c for c in TAXONOMY["conditions"]}
DIAG = TAXONOMY["diagnosisTable"]
REASONS = TAXONOMY["reasons"]
MISSING = TAXONOMY["missingEvidence"]


def quality(checklist: dict) -> dict:
    cov = round(sum(W[k] for k in ("leafClose", "lowerLeaf", "wholePlant", "lightingOk") if checklist.get(k)), 2)
    issues, reqs = [], []
    if not checklist.get("leafClose"):
        issues.append("Missing close-up of affected leaf")
        reqs.append("leafClose")
    if not checklist.get("lowerLeaf"):
        issues.append("Lower leaf surface not captured")
        reqs.append("lowerLeaf")
    if not checklist.get("wholePlant"):
        issues.append("Whole-plant context missing")
        reqs.append("wholePlant")
    if not checklist.get("lightingOk"):
        issues.append("Poor lighting / glare")
        reqs.append("retake in better light")
    passed = (
        cov >= MIN_COV
        and checklist.get("leafClose", False)
        and sum(1 for v in ("lowerLeaf", "wholePlant") if checklist.get(v)) >= POLICY["captureQuality"]["minSecondaryViews"]
        and checklist.get("lightingOk", False)
    )
    return {"coverageScore": cov, "passed": passed, "issues": issues if not passed else [], "recaptureRequests": reqs if not passed else []}


def diagnosis(crop: str, symptom: str, checklist: dict, at: str) -> dict:
    key = f"{crop}:{symptom}"
    rows = DIAG.get(key)
    if rows is None:
        rows = [{"conditionId": "unknown", "base": 0.50}, {"conditionId": "healthy", "base": 0.30}, {"conditionId": "unknown", "base": 0.20}]
    penalty = 0.0 if (checklist.get("lowerLeaf") and checklist.get("wholePlant")) else POLICY["triage"]["missingViewsScorePenalty"]
    cands = []
    for i, r in enumerate(rows):
        score = r["base"]
        if i == 0:
            score = round(max(0.05, score - penalty), 2)
        cid = r["conditionId"]
        cands.append({
            "conditionId": cid,
            "label": COND[cid]["labelEn"],
            "simConfidence": score,
            "reasons": REASONS.get(cid, REASONS["unknown"]),
            "missingEvidence": MISSING.get(cid, MISSING["_default"]),
        })
    lead, second = cands[0], cands[1] if len(cands) > 1 else {"simConfidence": 0}
    margin = round(lead["simConfidence"] - second["simConfidence"], 2)
    t = POLICY["triage"]
    high_spread = COND[lead["conditionId"]]["spreadRisk"] == "high" and lead["simConfidence"] >= t["highSpreadRiskMinScore"]
    if lead["conditionId"] == "unknown" and lead["simConfidence"] >= t["abstainOtherThreshold"]:
        routing = {"decision": "abstain", "reason": "Out-of-distribution indicator: no candidate strong enough. Expert must decide; never forced into a known label."}
    elif lead["simConfidence"] >= t["autonomousMinScore"] and margin >= t["autonomousMinMargin"] and not high_spread:
        routing = {"decision": "autonomous", "reason": "Lead score and margin exceed prototype autonomous thresholds; safe advisory may issue without expert."}
    else:
        routing = {"decision": "expert", "reason": f"Lead score {lead['simConfidence']:.2f} below autonomous threshold {t['autonomousMinScore']} or margin {margin:.2f} too small; expert review required."}
    escalation = bool(high_spread and t["highSpreadRiskEscalates"])
    return {
        "provider": "demo-rules", "modelVersion": "0.1.0-demo", "provenance": "SIMULATED",
        "at": at, "crop": crop, "symptomCategory": symptom,
        "candidates": cands, "margin": margin, "routing": routing,
        "highSpreadRisk": high_spread, "escalationRequired": escalation,
        "recommendedNext": MISSING.get(lead["conditionId"], MISSING["_default"]) if routing["decision"] != "abstain" else MISSING["unknown"],
        "thresholdsUsed": {"autonomousMinScore": t["autonomousMinScore"], "autonomousMinMargin": t["autonomousMinMargin"], "abstainOtherThreshold": t["abstainOtherThreshold"]},
        "note": "Simulated scores from deterministic demo rules — not measured model accuracy.",
    }


_evid = [0]
def ev(at, type_, actor, summary):
    _evid[0] += 1
    return {"id": f"EV-{_evid[0]:04d}", "at": at, "type": type_, "actor": actor, "summary": summary, "provenance": "SIMULATED"}


SYS = "system (demo)"
FARMER = "farmer (demo)"
FW = "field worker FW-07 (demo)"
EXP = "expert — KVK persona (demo)"
OFF = "district officer (demo)"


class CaseBuilder:
    def __init__(self, cid, farmer, plot, crop, stage, season, district, block, lat, lon, acres,
                 created, offline=False, pending_sync=False):
        self.c = {
            "id": cid, "farmerId": farmer, "plotId": plot, "crop": crop, "cropStage": stage, "season": season,
            "district": district, "block": block, "lat": lat, "lon": lon, "areaAcres": acres,
            "state": "DRAFT", "createdAt": created, "updatedAt": created,
            "createdOffline": offline, "pendingSync": pending_sync,
            "consent": {"given": True, "at": created, "channel": "typed", "purposeNote": "Crop-health advisory and outbreak response (demo consent text)"},
            "observations": [], "diagnosis": None, "reviews": [], "advisoryRef": None,
            "followUps": [], "outcome": None, "expertConfirmedCondition": None, "duplicateOf": None,
            "timeline": [],
        }
        self._o = 0
        self.tl("case_created", FARMER if offline else FW, f"Report opened for {crop} plot {plot}" + (" (offline, on device)" if offline else ""))

    def tl(self, type_, actor, summary, at=None):
        self.c["timeline"].append(ev(at or self._last_at(), type_, actor, summary))
        self.c["updatedAt"] = self.c["timeline"][-1]["at"]

    def _last_at(self):
        return self.c["timeline"][-1]["at"] if self.c["timeline"] else self.c["createdAt"]

    def state(self, s, at=None, summary=None, actor=SYS):
        self.c["state"] = s
        self.tl("state_change", actor, summary or f"State → {s}", at)

    def observe(self, at, symptom, note, checklist, actor=FARMER):
        self._o += 1
        q = quality(checklist)
        obs = {"id": f"{self.c['id']}-O{self._o}", "at": at, "symptomCategory": symptom, "symptomNote": note,
               "checklist": checklist, "imageCount": sum(1 for k in ("leafClose", "lowerLeaf", "wholePlant") if checklist.get(k)),
               "imageRef": f"sim-evidence://{self.c['id']}/{self._o}", "quality": q}
        self.c["observations"].append(obs)
        self.c["updatedAt"] = at
        self.c["timeline"].append(ev(at, "capture_submitted", actor, f"Evidence capture submitted ({obs['imageCount']} view(s), coverage {q['coverageScore']:.2f})"))
        if not q["passed"]:
            self.c["state"] = "NEEDS_RECAPTURE"
            self.c["timeline"].append(ev(at, "quality_failed", SYS, "Quality gate failed: " + "; ".join(q["issues"])))
        else:
            self.c["timeline"].append(ev(at, "quality_passed", SYS, f"Capture quality gate passed (coverage {q['coverageScore']:.2f})"))
        return obs

    def triage(self, at, symptom=None, checklist=None):
        obs = self.c["observations"][-1]
        symptom = symptom or obs["symptomCategory"]
        checklist = checklist or obs["checklist"]
        d = diagnosis(self.c["crop"], symptom, checklist, at)
        self.c["diagnosis"] = d
        self.c["state"] = "TRIAGED"
        self.c["timeline"].append(ev(at, "triage_completed", SYS,
            f"Deterministic demo triage: lead {d['candidates'][0]['label']} (simulated {d['candidates'][0]['simConfidence']:.2f}), margin {d['margin']:.2f}"))
        if d["routing"]["decision"] == "expert":
            self.c["state"] = "AWAITING_EXPERT"
            self.c["timeline"].append(ev(at, "escalated_to_expert", SYS, d["routing"]["reason"]))
        elif d["routing"]["decision"] == "abstain":
            self.c["state"] = "AWAITING_EXPERT"
            self.c["timeline"].append(ev(at, "escalated_to_expert", SYS, "Abstention: " + d["routing"]["reason"]))
        return d

    def review(self, at, decision, note, condition=None, reviewer=EXP):
        r = {"id": f"{self.c['id']}-R{len(self.c['reviews'])+1}", "at": at, "reviewer": reviewer,
             "decision": decision, "conditionId": condition, "note": note}
        self.c["reviews"].append(r)
        lead = self.c["diagnosis"]["candidates"][0]["conditionId"] if self.c["diagnosis"] else None
        if decision == "confirm":
            self.c["expertConfirmedCondition"] = condition or lead
            self.c["state"] = "EXPERT_CONFIRMED"
            self.tl("expert_confirmed", reviewer, f"Expert confirmed {COND[self.c['expertConfirmedCondition']]['labelEn']}: {note}", at)
        elif decision == "correct":
            self.c["expertConfirmedCondition"] = condition
            self.c["state"] = "EXPERT_CORRECTED"
            self.tl("expert_corrected", reviewer, f"Expert corrected AI triage ({COND.get(lead,{}).get('labelEn','?')} → {COND[condition]['labelEn']}): {note}", at)
        elif decision == "unknown":
            self.c["expertConfirmedCondition"] = "unknown"
            self.c["state"] = "CLOSED_UNKNOWN"
            self.tl("expert_marked_unknown", reviewer, f"Expert marked condition UNKNOWN — not forced into a known label. {note}", at)
        elif decision == "field_visit":
            self.c["state"] = "FIELD_VISIT_REQUIRED"
            self.tl("field_visit_required", reviewer, f"Field verification required: {note}", at)
        elif decision == "recapture":
            self.c["state"] = "NEEDS_RECAPTURE"
            self.tl("recapture_requested", reviewer, f"Expert requested recapture: {note}", at)
        return r

    def advisory(self, at, adv_id):
        self.c["advisoryRef"] = adv_id
        self.c["state"] = "ADVISORY_ISSUED"
        self.tl("advisory_issued", SYS, f"Safe advisory {adv_id} issued (non-chemical immediate actions; chemical section locked)", at)

    def follow_up(self, at, status, note, actor=FW):
        fu = {"id": f"{self.c['id']}-F{len(self.c['followUps'])+1}", "at": at, "channel": "field visit / call (simulated)",
              "status": status, "note": note}
        self.c["followUps"].append(fu)
        self.c["state"] = {"improving": "IMPROVING", "not_improving": "NOT_IMPROVING", "resolved": "RESOLVED"}[status]
        self.tl("follow_up_recorded", actor, f"Follow-up: {status.replace('_',' ')} — {note}", at)
        if status == "not_improving":
            self.tl("escalated_to_expert", SYS, "No improvement — escalated for expert re-review and field verification", at)
        return fu

    def close(self, at, status, note):
        self.c["outcome"] = {"status": status, "note": note, "updatedAt": at}
        if status == "resolved":
            self.c["state"] = "RESOLVED"
        self.tl("outcome_updated", OFF if status != "resolved" else SYS, f"Outcome: {status} — {note}", at)

    def duplicate(self, at, of):
        self.c["duplicateOf"] = of
        self.c["state"] = "CLOSED_DUPLICATE"
        self.tl("marked_duplicate", EXP, f"Marked duplicate of {of} (same plot, same reporting window)", at)

    def done(self):
        return self.c


CASES = []
def add(b: CaseBuilder):
    CASES.append(b.done())

# ---------------- Kharif 2026 active cases ----------------

# C-2602 healthy bajra, Luni
b = CaseBuilder("C-2602", "RJ-DEMO-F1007", "RJ-DEMO-PLOT-041", "bajra", "vegetative", "kharif-2026",
                "Jodhpur", "Luni", 26.011, 72.998, 2.4, "2026-07-08T09:10:00+05:30")
b.state("READY_FOR_TRIAGE", "2026-07-08T09:12:00+05:30", "Report synced; queued for triage")
b.observe("2026-07-08T09:14:00+05:30", "none", "Routine check — no visible symptoms", {"leafClose": True, "lowerLeaf": True, "wholePlant": True, "lightingOk": True}, FW)
b.triage("2026-07-08T09:14:20+05:30")
b.review("2026-07-08T15:40:00+05:30", "confirm", "No disease indicators; healthy check confirmed")
b.close("2026-07-09T10:00:00+05:30", "resolved", "Healthy verification; no action required")
add(b)

# C-2605/C-2606 Osian duplicate pair
b = CaseBuilder("C-2606", "RJ-DEMO-F1011", "RJ-DEMO-PLOT-077", "bajra", "seedling", "kharif-2026",
                "Jodhpur", "Osian", 27.049, 72.897, 1.8, "2026-07-05T11:05:00+05:30")
b.state("READY_FOR_TRIAGE", "2026-07-05T11:07:00+05:30", "Report synced; queued for triage")
b.observe("2026-07-05T11:09:00+05:30", "pale_streaking", "Pale streaks on seedling leaves", {"leafClose": True, "lowerLeaf": True, "wholePlant": True, "lightingOk": True}, FW)
b.triage("2026-07-05T11:09:25+05:30")
add(b)

b = CaseBuilder("C-2605", "RJ-DEMO-F1011", "RJ-DEMO-PLOT-077", "bajra", "seedling", "kharif-2026",
                "Jodhpur", "Osian", 27.061, 72.912, 1.8, "2026-07-05T16:40:00+05:30", offline=True)
b.observe("2026-07-05T16:45:00+05:30", "pale_streaking", "Same plot reported again by farmer", {"leafClose": True, "lowerLeaf": True, "wholePlant": True, "lightingOk": True})
b.triage("2026-07-05T18:02:10+05:30")
b.duplicate("2026-07-08T12:20:00+05:30", "C-2606")
add(b)

# C-2609 verified downy mildew, Balesar (cluster anchor)
b = CaseBuilder("C-2609", "RJ-DEMO-F1023", "RJ-DEMO-PLOT-096", "bajra", "vegetative", "kharif-2026",
                "Jodhpur", "Balesar", 26.404, 72.962, 3.1, "2026-07-12T08:25:00+05:30", offline=True)
b.state("READY_FOR_TRIAGE", "2026-07-12T10:15:00+05:30", "Synced when connectivity returned")
b.observe("2026-07-12T10:17:00+05:30", "pale_streaking", "Pale streaking, affected emerging leaves", {"leafClose": True, "lowerLeaf": True, "wholePlant": True, "lightingOk": True}, FW)
b.triage("2026-07-12T10:17:22+05:30")
b.review("2026-07-14T11:30:00+05:30", "confirm", "Downy mildew confirmed on lower-leaf sporulation evidence")
b.advisory("2026-07-14T11:31:00+05:30", "ADV-2601-v0.3")
b.follow_up("2026-07-16T09:00:00+05:30", "improving", "Roguing done; no new streaking on re-visit")
add(b)

# C-2611 suspected DM Balesar
b = CaseBuilder("C-2611", "RJ-DEMO-F1031", "RJ-DEMO-PLOT-104", "bajra", "vegetative", "kharif-2026",
                "Jodhpur", "Balesar", 26.377, 72.928, 2.2, "2026-07-15T07:50:00+05:30")
b.state("READY_FOR_TRIAGE", "2026-07-15T07:52:00+05:30", "Report synced; queued for triage")
b.observe("2026-07-15T07:55:00+05:30", "pale_streaking", "Pale streaking on lower leaves", {"leafClose": True, "lowerLeaf": True, "wholePlant": True, "lightingOk": True}, FW)
b.triage("2026-07-15T07:55:21+05:30")
add(b)

# C-2617 severe DM, not improving
b = CaseBuilder("C-2617", "RJ-DEMO-F1036", "RJ-DEMO-PLOT-112", "bajra", "seedling", "kharif-2026",
                "Jodhpur", "Balesar", 26.362, 72.951, 4.0, "2026-07-10T06:40:00+05:30")
b.state("READY_FOR_TRIAGE", "2026-07-10T06:42:00+05:30", "Report synced; queued for triage")
b.observe("2026-07-10T06:45:00+05:30", "white_downy_growth", "White downy growth under leaves; stunted seedlings", {"leafClose": True, "lowerLeaf": True, "wholePlant": True, "lightingOk": True}, FW)
b.triage("2026-07-10T06:45:18+05:30")
b.review("2026-07-10T14:10:00+05:30", "confirm", "Severe downy mildew; high spread risk in current humidity (simulated signal)")
b.review("2026-07-10T14:11:00+05:30", "field_visit", "Severity and spread require on-ground verification")
b.advisory("2026-07-10T15:00:00+05:30", "ADV-2601-v0.3")
b.follow_up("2026-07-15T10:30:00+05:30", "not_improving", "Spread continuing to adjacent rows despite roguing")
add(b)

# C-2620 suspected DM Balesar
b = CaseBuilder("C-2620", "RJ-DEMO-F1039", "RJ-DEMO-PLOT-121", "bajra", "vegetative", "kharif-2026",
                "Jodhpur", "Balesar", 26.386, 72.968, 2.9, "2026-07-16T08:35:00+05:30")
b.state("READY_FOR_TRIAGE", "2026-07-16T08:37:00+05:30", "Report synced; queued for triage")
b.observe("2026-07-16T08:40:00+05:30", "pale_streaking", "Streaking appeared after overnight humidity", {"leafClose": True, "lowerLeaf": True, "wholePlant": True, "lightingOk": True}, FW)
b.triage("2026-07-16T08:40:19+05:30")
add(b)

# C-2626 healthy bajra Balesar
b = CaseBuilder("C-2626", "RJ-DEMO-F1018", "RJ-DEMO-PLOT-088", "bajra", "vegetative", "kharif-2026",
                "Jodhpur", "Balesar", 26.410, 72.940, 2.0, "2026-07-06T10:05:00+05:30")
b.state("READY_FOR_TRIAGE", "2026-07-06T10:07:00+05:30", "Report synced; queued for triage")
b.observe("2026-07-06T10:10:00+05:30", "none", "Preventive check near affected area", {"leafClose": True, "lowerLeaf": True, "wholePlant": True, "lightingOk": True}, FW)
b.triage("2026-07-06T10:10:21+05:30")
b.review("2026-07-07T09:20:00+05:30", "confirm", "Healthy check confirmed; continue monitoring")
b.close("2026-07-07T09:21:00+05:30", "resolved", "Healthy verification; no action required")
add(b)

# GOLDEN CASE C-2614 — seeded as offline DRAFT; guided demo walks it through the loop
b = CaseBuilder("C-2614", "RJ-DEMO-F1042", "RJ-DEMO-PLOT-118", "bajra", "vegetative", "kharif-2026",
                "Jodhpur", "Balesar", 26.391, 72.946, 2.6, "2026-07-16T17:35:00+05:30", offline=True, pending_sync=True)
b.c["timeline"].append(ev("2026-07-16T17:35:30+05:30", "sync_pending", SYS, "Created offline; waiting for connectivity to sync"))
add(b)

# C-2616 nutrient stress, follow-up due
b = CaseBuilder("C-2616", "RJ-DEMO-F1027", "RJ-DEMO-PLOT-052", "bajra", "vegetative", "kharif-2026",
                "Jodhpur", "Luni", 25.997, 73.015, 3.4, "2026-07-09T09:30:00+05:30")
b.state("READY_FOR_TRIAGE", "2026-07-09T09:32:00+05:30", "Report synced; queued for triage")
b.observe("2026-07-09T09:35:00+05:30", "yellowing", "General yellowing of older leaves", {"leafClose": True, "lowerLeaf": True, "wholePlant": True, "lightingOk": True}, FW)
b.triage("2026-07-09T09:35:22+05:30")
b.review("2026-07-09T16:45:00+05:30", "confirm", "Nutrient stress pattern; no pathogen signs on evidence")
b.advisory("2026-07-09T16:46:00+05:30", "ADV-2604-v0.2")
b.c["state"] = "FOLLOW_UP_DUE"
b.tl("follow_up_due", SYS, "Follow-up due on 2026-07-18 (5-day check)", "2026-07-14T09:00:00+05:30")
add(b)

# C-2619 healthy bajra Osian
b = CaseBuilder("C-2619", "RJ-DEMO-F1012", "RJ-DEMO-PLOT-079", "bajra", "seedling", "kharif-2026",
                "Jodhpur", "Osian", 27.032, 72.884, 1.5, "2026-07-11T08:15:00+05:30")
b.state("READY_FOR_TRIAGE", "2026-07-11T08:17:00+05:30", "Report synced; queued for triage")
b.observe("2026-07-11T08:20:00+05:30", "none", "Routine check", {"leafClose": True, "lowerLeaf": True, "wholePlant": True, "lightingOk": True}, FW)
b.triage("2026-07-11T08:20:20+05:30")
b.review("2026-07-11T13:00:00+05:30", "confirm", "Healthy check confirmed")
b.close("2026-07-11T13:01:00+05:30", "resolved", "Healthy verification; no action required")
add(b)

# C-2625 pending-sync bajra Bhinmal (poor connectivity)
b = CaseBuilder("C-2625", "RJ-DEMO-F1048", "RJ-DEMO-PLOT-133", "bajra", "vegetative", "kharif-2026",
                "Jalore", "Bhinmal", 24.993, 72.283, 2.7, "2026-07-16T19:20:00+05:30", offline=True, pending_sync=True)
b.observe("2026-07-16T19:25:00+05:30", "pale_streaking", "Streaking noticed at dusk", {"leafClose": True, "lowerLeaf": True, "wholePlant": True, "lightingOk": True})
b.triage("2026-07-16T19:25:30+05:30")
b.c["timeline"].append(ev("2026-07-16T19:26:00+05:30", "sync_pending", SYS, "Triaged on device; sync retry pending — poor connectivity area"))
b.c["syncNote"] = "3 retry attempts failed (simulated); will sync on next connectivity window"
add(b)

# ---------------- Guar cases ----------------

# C-2608 guar BLB suspected Nagaur (cluster CL-2603)
b = CaseBuilder("C-2608", "RJ-DEMO-F1052", "RJ-DEMO-PLOT-141", "guar", "vegetative", "kharif-2026",
                "Nagaur", "Nagaur", 27.206, 73.889, 2.1, "2026-07-13T10:20:00+05:30")
b.state("READY_FOR_TRIAGE", "2026-07-13T10:22:00+05:30", "Report synced; queued for triage")
b.observe("2026-07-13T10:25:00+05:30", "leaf_spots", "Water-soaked spots with yellow halo", {"leafClose": True, "lowerLeaf": True, "wholePlant": True, "lightingOk": True}, FW)
b.triage("2026-07-13T10:25:21+05:30")
add(b)

# C-2629 guar BLB suspected Nagaur (cluster CL-2603)
b = CaseBuilder("C-2629", "RJ-DEMO-F1055", "RJ-DEMO-PLOT-147", "guar", "vegetative", "kharif-2026",
                "Nagaur", "Nagaur", 27.195, 73.905, 1.9, "2026-07-16T15:10:00+05:30")
b.state("READY_FOR_TRIAGE", "2026-07-16T15:12:00+05:30", "Report synced; queued for triage")
b.observe("2026-07-16T15:15:00+05:30", "distortion", "Leaf distortion with marginal necrosis", {"leafClose": True, "lowerLeaf": True, "wholePlant": True, "lightingOk": True}, FW)
b.triage("2026-07-16T15:15:20+05:30")
add(b)

# C-2612 healthy guar Bhinmal
b = CaseBuilder("C-2612", "RJ-DEMO-F1046", "RJ-DEMO-PLOT-130", "guar", "vegetative", "kharif-2026",
                "Jalore", "Bhinmal", 25.006, 72.265, 2.3, "2026-07-07T11:00:00+05:30")
b.state("READY_FOR_TRIAGE", "2026-07-07T11:02:00+05:30", "Report synced; queued for triage")
b.observe("2026-07-07T11:05:00+05:30", "none", "Routine check", {"leafClose": True, "lowerLeaf": True, "wholePlant": True, "lightingOk": True}, FW)
b.triage("2026-07-07T11:05:19+05:30")
b.review("2026-07-07T17:30:00+05:30", "confirm", "Healthy check confirmed")
b.close("2026-07-07T17:31:00+05:30", "resolved", "Healthy verification; no action required")
add(b)

# C-2615 healthy guar Merta
b = CaseBuilder("C-2615", "RJ-DEMO-F1058", "RJ-DEMO-PLOT-152", "guar", "vegetative", "kharif-2026",
                "Nagaur", "Merta", 26.641, 74.028, 2.8, "2026-07-09T14:00:00+05:30")
b.state("READY_FOR_TRIAGE", "2026-07-09T14:02:00+05:30", "Report synced; queued for triage")
b.observe("2026-07-09T14:05:00+05:30", "none", "Routine check", {"leafClose": True, "lowerLeaf": True, "wholePlant": True, "lightingOk": True}, FW)
b.triage("2026-07-09T14:05:18+05:30")
b.review("2026-07-09T18:10:00+05:30", "confirm", "Healthy check confirmed")
b.close("2026-07-09T18:11:00+05:30", "resolved", "Healthy verification; no action required")
add(b)

# C-2618 guar anthracnose suspected Jalore
b = CaseBuilder("C-2618", "RJ-DEMO-F1061", "RJ-DEMO-PLOT-158", "guar", "vegetative", "kharif-2026",
                "Jalore", "Jalore", 25.330, 72.640, 1.7, "2026-07-14T09:45:00+05:30")
b.state("READY_FOR_TRIAGE", "2026-07-14T09:47:00+05:30", "Report synced; queued for triage")
b.observe("2026-07-14T09:50:00+05:30", "leaf_spots", "Irregular dark lesions on older leaves", {"leafClose": True, "lowerLeaf": True, "wholePlant": True, "lightingOk": True}, FW)
b.triage("2026-07-14T09:50:22+05:30")
add(b)

# C-2622 guar unknown stem rot Merta — CLOSED_UNKNOWN
b = CaseBuilder("C-2622", "RJ-DEMO-F1064", "RJ-DEMO-PLOT-163", "guar", "vegetative", "kharif-2026",
                "Nagaur", "Merta", 26.652, 74.041, 2.2, "2026-07-08T15:30:00+05:30")
b.state("READY_FOR_TRIAGE", "2026-07-08T15:32:00+05:30", "Report synced; queued for triage")
b.observe("2026-07-08T15:35:00+05:30", "stem_rot", "Unusual collar rot not matching common patterns", {"leafClose": True, "lowerLeaf": True, "wholePlant": True, "lightingOk": True}, FW)
b.triage("2026-07-08T15:35:21+05:30")
b.review("2026-07-09T11:20:00+05:30", "unknown", "Symptoms do not match reference patterns; specimens referred to KVK Nagaur for diagnosis")
add(b)

# C-2624 guar OOD abstain Jalore — AWAITING_EXPERT
b = CaseBuilder("C-2624", "RJ-DEMO-F1067", "RJ-DEMO-PLOT-167", "guar", "vegetative", "kharif-2026",
                "Jalore", "Jalore", 25.315, 72.655, 2.0, "2026-07-15T16:20:00+05:30")
b.state("READY_FOR_TRIAGE", "2026-07-15T16:22:00+05:30", "Report synced; queued for triage")
b.observe("2026-07-15T16:25:00+05:30", "wilting", "Patchy wilting without lesion pattern", {"leafClose": True, "lowerLeaf": True, "wholePlant": True, "lightingOk": True}, FW)
b.triage("2026-07-15T16:25:23+05:30")
add(b)

# C-2628 guar READY_FOR_TRIAGE Nagaur
b = CaseBuilder("C-2628", "RJ-DEMO-F1070", "RJ-DEMO-PLOT-171", "guar", "seedling", "kharif-2026",
                "Nagaur", "Nagaur", 27.212, 73.870, 1.6, "2026-07-17T06:20:00+05:30")
b.state("READY_FOR_TRIAGE", "2026-07-17T06:22:00+05:30", "Report synced; queued for triage")
add(b)

# ---------------- Rabi 2025-26 historical cases (resolved / corrected) ----------------

# C-2601 mustard alternaria resolved
b = CaseBuilder("C-2601", "RJ-DEMO-F1003", "RJ-DEMO-PLOT-012", "mustard", "pod_fill", "rabi-2025-26",
                "Nagaur", "Nagaur", 27.198, 73.875, 3.0, "2026-01-22T10:00:00+05:30")
b.state("READY_FOR_TRIAGE", "2026-01-22T10:02:00+05:30", "Report synced; queued for triage")
b.observe("2026-01-22T10:05:00+05:30", "leaf_spots", "Concentric spots on lower leaves", {"leafClose": True, "lowerLeaf": True, "wholePlant": True, "lightingOk": True}, FW)
b.triage("2026-01-22T10:05:20+05:30")
b.review("2026-01-22T16:00:00+05:30", "confirm", "Alternaria blight confirmed")
b.advisory("2026-01-22T16:05:00+05:30", "ADV-2602-v0.1")
b.follow_up("2026-01-30T10:00:00+05:30", "improving", "Spread arrested after sanitation measures")
b.close("2026-03-05T10:00:00+05:30", "resolved", "Crop recovered; harvested satisfactorily (demo note)")
add(b)

# C-2603 cumin blight resolved
b = CaseBuilder("C-2603", "RJ-DEMO-F1073", "RJ-DEMO-PLOT-201", "cumin", "seed_fill", "rabi-2025-26",
                "Jalore", "Jalore", 25.352, 72.623, 2.5, "2026-02-02T09:00:00+05:30")
b.state("READY_FOR_TRIAGE", "2026-02-02T09:02:00+05:30", "Report synced; queued for triage")
b.observe("2026-02-02T09:05:00+05:30", "leaf_spots", "Small brown spots on stems and leaves", {"leafClose": True, "lowerLeaf": True, "wholePlant": True, "lightingOk": True}, FW)
b.triage("2026-02-02T09:05:19+05:30")
b.review("2026-02-02T15:30:00+05:30", "confirm", "Cumin blight confirmed")
b.advisory("2026-02-02T15:35:00+05:30", "ADV-2605-v0.1")
b.follow_up("2026-02-12T09:00:00+05:30", "improving", "No new lesions observed")
b.close("2026-03-10T09:00:00+05:30", "resolved", "Resolved with non-chemical measures (demo note)")
add(b)

# C-2604 mustard aphid resolved
b = CaseBuilder("C-2604", "RJ-DEMO-F1076", "RJ-DEMO-PLOT-205", "mustard", "flowering", "rabi-2025-26",
                "Nagaur", "Nagaur", 27.212, 73.870, 2.2, "2026-02-10T11:00:00+05:30")
b.state("READY_FOR_TRIAGE", "2026-02-10T11:02:00+05:30", "Report synced; queued for triage")
b.observe("2026-02-10T11:05:00+05:30", "insect_presence", "Aphid colonies on tender shoots", {"leafClose": True, "lowerLeaf": True, "wholePlant": True, "lightingOk": True}, FW)
b.triage("2026-02-10T11:05:21+05:30")
b.review("2026-02-10T17:00:00+05:30", "confirm", "Aphid infestation confirmed; monitoring thresholds advised")
b.advisory("2026-02-10T17:05:00+05:30", "ADV-2606-v0.1")
b.follow_up("2026-02-20T11:00:00+05:30", "resolved", "Population below threshold after conservation measures")
add(b)

# C-2607 mustard — EXPERT CORRECTED the AI triage (white rust -> alternaria)
b = CaseBuilder("C-2607", "RJ-DEMO-F1079", "RJ-DEMO-PLOT-209", "mustard", "pod_fill", "rabi-2025-26",
                "Nagaur", "Nagaur", 27.214, 73.891, 2.9, "2026-02-14T10:30:00+05:30")
b.state("READY_FOR_TRIAGE", "2026-02-14T10:32:00+05:30", "Report synced; queued for triage")
b.observe("2026-02-14T10:35:00+05:30", "leaf_spots", "Spots with slight yellow halo on leaves", {"leafClose": True, "lowerLeaf": True, "wholePlant": True, "lightingOk": True}, FW)
b.triage("2026-02-14T10:35:20+05:30")
b.c["diagnosis"]["candidates"][0]["conditionId"] = "white_rust"
b.c["diagnosis"]["candidates"][0]["label"] = COND["white_rust"]["labelEn"]
b.review("2026-02-14T16:40:00+05:30", "correct", "Lesion morphology matches Alternaria, not white rust; no pustules on lower surface", condition="alternaria_blight")
b.advisory("2026-02-14T16:45:00+05:30", "ADV-2602-v0.1")
b.follow_up("2026-02-24T10:00:00+05:30", "improving", "Spread controlled; correction validated in field")
b.close("2026-03-12T10:00:00+05:30", "resolved", "Resolved after corrected diagnosis (demo note)")
add(b)

# C-2610 cumin powdery mildew resolved
b = CaseBuilder("C-2610", "RJ-DEMO-F1082", "RJ-DEMO-PLOT-214", "cumin", "seed_fill", "rabi-2025-26",
                "Jalore", "Jalore", 25.339, 72.608, 1.8, "2026-02-18T09:30:00+05:30")
b.state("READY_FOR_TRIAGE", "2026-02-18T09:32:00+05:30", "Report synced; queued for triage")
b.observe("2026-02-18T09:35:00+05:30", "white_powdery_coating", "White powdery coating on foliage", {"leafClose": True, "lowerLeaf": True, "wholePlant": True, "lightingOk": True}, FW)
b.triage("2026-02-18T09:35:19+05:30")
b.review("2026-02-18T15:00:00+05:30", "confirm", "Powdery mildew confirmed")
b.advisory("2026-02-18T15:05:00+05:30", "ADV-2607-v0.1")
b.follow_up("2026-02-28T09:00:00+05:30", "improving", "Coating reduced; airflow improved")
b.close("2026-03-15T09:00:00+05:30", "resolved", "Resolved (demo note)")
add(b)

# C-2613 mustard white rust resolved
b = CaseBuilder("C-2613", "RJ-DEMO-F1085", "RJ-DEMO-PLOT-219", "mustard", "flowering", "rabi-2025-26",
                "Nagaur", "Nagaur", 27.189, 73.869, 2.6, "2026-01-28T10:00:00+05:30")
b.state("READY_FOR_TRIAGE", "2026-01-28T10:02:00+05:30", "Report synced; queued for triage")
b.observe("2026-01-28T10:05:00+05:30", "white_downy_growth", "White pustules on lower leaf surface", {"leafClose": True, "lowerLeaf": True, "wholePlant": True, "lightingOk": True}, FW)
b.triage("2026-01-28T10:05:20+05:30")
b.review("2026-01-28T16:20:00+05:30", "confirm", "White rust confirmed")
b.advisory("2026-01-28T16:25:00+05:30", "ADV-2608-v0.1")
b.follow_up("2026-02-08T10:00:00+05:30", "improving", "Pustule spread arrested")
b.close("2026-03-08T10:00:00+05:30", "resolved", "Resolved (demo note)")
add(b)

# C-2621 cumin wilt improving (rabi tail)
b = CaseBuilder("C-2621", "RJ-DEMO-F1088", "RJ-DEMO-PLOT-223", "cumin", "seed_fill", "rabi-2025-26",
                "Jalore", "Jalore", 25.360, 72.600, 2.1, "2026-02-25T09:00:00+05:30")
b.state("READY_FOR_TRIAGE", "2026-02-25T09:02:00+05:30", "Report synced; queued for triage")
b.observe("2026-02-25T09:05:00+05:30", "wilting", "Patchy wilting in one field zone", {"leafClose": True, "lowerLeaf": True, "wholePlant": True, "lightingOk": True}, FW)
b.triage("2026-02-25T09:05:22+05:30")
b.review("2026-02-25T15:40:00+05:30", "confirm", "Wilt confirmed in one zone; isolation advised")
b.advisory("2026-02-25T15:45:00+05:30", "ADV-2609-v0.1")
b.follow_up("2026-03-05T09:00:00+05:30", "improving", "No new wilt patches after zone isolation")
add(b)

# C-2623 mustard healthy resolved
b = CaseBuilder("C-2623", "RJ-DEMO-F1091", "RJ-DEMO-PLOT-227", "mustard", "pod_fill", "rabi-2025-26",
                "Nagaur", "Nagaur", 27.220, 73.895, 2.4, "2026-02-20T10:00:00+05:30")
b.state("READY_FOR_TRIAGE", "2026-02-20T10:02:00+05:30", "Report synced; queued for triage")
b.observe("2026-02-20T10:05:00+05:30", "none", "Routine check", {"leafClose": True, "lowerLeaf": True, "wholePlant": True, "lightingOk": True}, FW)
b.triage("2026-02-20T10:05:18+05:30")
b.review("2026-02-20T14:30:00+05:30", "confirm", "Healthy check confirmed")
b.close("2026-02-20T14:31:00+05:30", "resolved", "Healthy verification; no action required")
add(b)

# C-2627 mustard aphid resolved Merta
b = CaseBuilder("C-2627", "RJ-DEMO-F1094", "RJ-DEMO-PLOT-231", "mustard", "flowering", "rabi-2025-26",
                "Nagaur", "Merta", 26.655, 74.019, 2.0, "2026-02-22T11:00:00+05:30")
b.state("READY_FOR_TRIAGE", "2026-02-22T11:02:00+05:30", "Report synced; queued for triage")
b.observe("2026-02-22T11:05:00+05:30", "insect_presence", "Aphids on inflorescence", {"leafClose": True, "lowerLeaf": True, "wholePlant": True, "lightingOk": True}, FW)
b.triage("2026-02-22T11:05:20+05:30")
b.review("2026-02-22T17:10:00+05:30", "confirm", "Aphid infestation confirmed")
b.advisory("2026-02-22T17:15:00+05:30", "ADV-2606-v0.1")
b.follow_up("2026-03-02T11:00:00+05:30", "resolved", "Below threshold; resolved")
add(b)


# ---------------- Clusters ----------------
CLUSTERS = [
    {
        "id": "CL-2601", "name": "Balesar bajra downy mildew watch", "crop": "bajra", "conditionId": "downy_mildew",
        "status": "SUSPECTED", "centerLat": 26.384, "centerLon": 72.949, "radiusKm": 6.0,
        "memberCaseIds": ["C-2609", "C-2611", "C-2614", "C-2617", "C-2620"],
        "createdAt": "2026-07-14T12:00:00+05:30", "weatherSuitability": 0.8,
        "assignedOfficer": "District officer (demo) — Jodhpur", "slaHours": 48,
        "seedSignals": {"spatialDensity": 0.9, "temporalGrowth": 0.7, "cropStageCompat": 1.0, "severityIndex": 0.7, "duplicatePenalty": 0.0},
        "note": "Weather suitability is a fixed SIMULATED placeholder until a real weather adapter exists.",
    },
    {
        "id": "CL-2602", "name": "Osian bajra streaking reports", "crop": "bajra", "conditionId": "downy_mildew",
        "status": "DISMISSED", "centerLat": 27.055, "centerLon": 72.905, "radiusKm": 6.0,
        "memberCaseIds": ["C-2605", "C-2606"],
        "createdAt": "2026-07-06T09:00:00+05:30", "dismissedAt": "2026-07-08T12:25:00+05:30",
        "dismissedReason": "Duplicate/insufficient evidence: two reports of the same plot within one window; remaining single case proceeds individually.",
        "dismissedBy": "expert — KVK persona (demo)", "weatherSuitability": 0.8,
        "assignedOfficer": "District officer (demo) — Jodhpur", "slaHours": 48,
        "seedSignals": {"spatialDensity": 0.5, "temporalGrowth": 0.3, "cropStageCompat": 1.0, "severityIndex": 0.3, "duplicatePenalty": 0.8},
        "note": "Demonstrates duplicate/evidence penalty and manual dismissal with audit trail.",
    },
    {
        "id": "CL-2603", "name": "Nagaur guar leaf blight watch", "crop": "guar", "conditionId": "bacterial_leaf_blight",
        "status": "SUSPECTED", "centerLat": 27.201, "centerLon": 73.897, "radiusKm": 6.0,
        "memberCaseIds": ["C-2608", "C-2629"],
        "createdAt": "2026-07-16T16:00:00+05:30", "weatherSuitability": 0.7,
        "assignedOfficer": "District officer (demo) — Nagaur", "slaHours": 48,
        "seedSignals": {"spatialDensity": 0.6, "temporalGrowth": 0.5, "cropStageCompat": 1.0, "severityIndex": 0.4, "duplicatePenalty": 0.0},
        "note": "Low-score suspected cluster; monitored before any mission is raised.",
    },
]

# ---------------- Missions ----------------
MISSIONS = [
    {
        "id": "M-2601", "clusterId": None, "purpose": "Rabi verification sweep — mustard alternaria confirmation",
        "assignedRole": "field worker (demo)", "status": "COMPLETED",
        "representativeCaseIds": ["C-2601", "C-2607"], "routeOrder": ["C-2601", "C-2607"],
        "offlinePack": "SYNCED", "createdAt": "2026-02-15T09:00:00+05:30", "completedAt": "2026-02-16T17:00:00+05:30",
        "infoGainNote": "Deterministic order: verified case first (block context), corrected case second (highest residual uncertainty).",
        "checklist": ["Whole-block context photos", "10-plant inspection count", "Specimen bag if uncertain", "Farmer interview (consent confirmed)"],
        "visits": [
            {"caseId": "C-2601", "at": "2026-02-16T10:00:00+05:30", "findings": "Alternaria confirmed in 2 of 10 sampled plants (simulated field note)"},
            {"caseId": "C-2607", "at": "2026-02-16T15:00:00+05:30", "findings": "Correction validated: Alternaria lesion morphology (simulated field note)"},
        ],
        "syncStatus": "SYNCED",
    },
    {
        "id": "M-2602", "clusterId": None, "purpose": "Field verification — severe downy mildew escalation (C-2617)",
        "assignedRole": "field worker (demo)", "status": "IN_PROGRESS",
        "representativeCaseIds": ["C-2617", "C-2609"], "routeOrder": ["C-2617", "C-2609"],
        "offlinePack": "READY", "createdAt": "2026-07-10T15:05:00+05:30",
        "infoGainNote": "Deterministic order: severe unrecovered case first (highest spread risk), then nearest verified case for spread-direction evidence.",
        "checklist": ["Whole-block context photos", "20-plant infection count", "Lower-leaf sporulation close-ups", "Spread-direction sketch", "Farmer interview (consent confirmed)"],
        "visits": [
            {"caseId": "C-2617", "at": "2026-07-15T11:00:00+05:30", "findings": "Severe downy mildew confirmed; ~30% of plot affected (visual estimate, simulated); roguing incomplete"},
        ],
        "syncStatus": "PARTIAL",
    },
]

# ---------------- Advisories (safe, non-chemical; chemical locked) ----------------
CHEM_LOCK = {"locked": True, "note": "Approved advisory content required. Chemical recommendations unlock only with an approved, versioned expert advisory sourced from CIB&RC-aligned content (adapter CONTRACT_DEFINED — not connected)."}
ADVISORIES = [
    {
        "id": "ADV-2601-v0.1", "conditionId": "downy_mildew", "crop": "bajra", "version": "0.1-demo", "status": "DRAFT",
        "reviewer": None, "approvedOn": None, "validUntil": None, "supersededBy": "ADV-2601-v0.2",
        "createdAt": "2026-07-05T09:00:00+05:30", "immediateSteps": [], "monitoring": [], "escalateWhen": [], "chemical": CHEM_LOCK,
        "note": "Initial draft retained for governance history.",
    },
    {
        "id": "ADV-2601-v0.2", "conditionId": "downy_mildew", "crop": "bajra", "version": "0.2-demo", "status": "EXPERT_REVIEWED",
        "reviewer": "expert — KVK persona (demo)", "approvedOn": None, "validUntil": None, "supersededBy": "ADV-2601-v0.3",
        "createdAt": "2026-07-09T09:00:00+05:30",
        "immediateSteps": ["Rogue out and bury/burn infected plants away from the field", "Avoid overhead and evening irrigation", "Improve field drainage and airflow"],
        "monitoring": ["Re-inspect every 48 hours", "Photograph the same marked plants each visit"],
        "escalateWhen": ["Spread to new rows despite roguing", "White downy growth appears on many plants"],
        "chemical": CHEM_LOCK, "note": "Expert-reviewed; superseded by approved v0.3.",
    },
    {
        "id": "ADV-2601-v0.3", "conditionId": "downy_mildew", "crop": "bajra", "version": "0.3-demo", "status": "APPROVED",
        "reviewer": "expert — KVK persona (demo)", "approvedOn": "2026-07-11T12:00:00+05:30", "validUntil": "2026-10-31",
        "supersededBy": None, "createdAt": "2026-07-11T09:00:00+05:30",
        "immediateSteps": [
            "Rogue out infected seedlings/plants; bury or burn them away from the field",
            "Do not irrigate in the evening; avoid overhead wetting of foliage",
            "Open up drainage channels; avoid waterlogging",
            "Mark affected patches and keep tools/clothing clean between plots",
        ],
        "monitoring": [
            "Re-inspect marked plants every 48 hours and photograph the same plants",
            "Check neighbouring bajra plots within ~100 m twice a week",
            "Record any new streaking through the Rakshak report flow (works offline)",
        ],
        "escalateWhen": [
            "Spread continues despite roguing within 5 days",
            "White downy growth appears on a large share of plants",
            "Neighbouring plots report similar symptoms",
        ],
        "chemical": CHEM_LOCK,
        "note": "Demo content, placeholder quality — NOT agronomically validated. Chemical section locked pending approved versioned content.",
    },
    {
        "id": "ADV-2602-v0.1", "conditionId": "alternaria_blight", "crop": "mustard", "version": "0.1-demo", "status": "APPROVED",
        "reviewer": "expert — KVK persona (demo)", "approvedOn": "2026-01-20T12:00:00+05:30", "validUntil": "2026-04-30",
        "supersededBy": None, "createdAt": "2026-01-20T09:00:00+05:30",
        "immediateSteps": ["Remove and destroy heavily infected plant debris", "Avoid working the field when foliage is wet"],
        "monitoring": ["Weekly inspection of lower canopy"], "escalateWhen": ["Rapid lesion spread across the field"],
        "chemical": CHEM_LOCK, "note": "Demo content from rabi season; retained for history.",
    },
    {
        "id": "ADV-2604-v0.2", "conditionId": "nutrient_n", "crop": "bajra", "version": "0.2-demo", "status": "APPROVED",
        "reviewer": "expert — KVK persona (demo)", "approvedOn": "2026-07-08T12:00:00+05:30", "validUntil": "2026-10-31",
        "supersededBy": None, "createdAt": "2026-07-08T09:00:00+05:30",
        "immediateSteps": ["Confirm with a soil test or Soil Health Card before any fertiliser decision", "Ensure irrigation is adequate and uniform"],
        "monitoring": ["Watch whether yellowing advances to younger leaves over 5 days"],
        "escalateWhen": ["Yellowing spreads despite corrected irrigation", "Any lesion or growth appears on leaves"],
        "chemical": CHEM_LOCK, "note": "No nutrient doses are prescribed by the prototype; doses require local expert sign-off.",
    },
    {
        "id": "ADV-2603-v0.1", "conditionId": "bacterial_leaf_blight", "crop": "guar", "version": "0.1-demo", "status": "EXPERT_REVIEWED",
        "reviewer": "expert — KVK persona (demo)", "approvedOn": None, "validUntil": None, "supersededBy": None,
        "createdAt": "2026-07-13T09:00:00+05:30",
        "immediateSteps": ["Avoid field entry when foliage is wet", "Remove infected plant residue"],
        "monitoring": ["Inspect twice weekly"], "escalateWhen": ["Lesions reach stems or spread rapidly"],
        "chemical": CHEM_LOCK, "note": "Awaiting approval; demonstrates lifecycle state.",
    },
    {
        "id": "ADV-2605-v0.1", "conditionId": "cumin_blight", "crop": "cumin", "version": "0.1-demo", "status": "APPROVED",
        "reviewer": "expert — KVK persona (demo)", "approvedOn": "2026-02-01T12:00:00+05:30", "validUntil": "2026-04-30",
        "supersededBy": None, "createdAt": "2026-02-01T09:00:00+05:30",
        "immediateSteps": ["Remove infected plant debris", "Avoid overhead irrigation"],
        "monitoring": ["Weekly inspection"], "escalateWhen": ["Lesions on stems spread quickly"],
        "chemical": CHEM_LOCK, "note": "Rabi demo advisory.",
    },
    {
        "id": "ADV-2606-v0.1", "conditionId": "aphid", "crop": "mustard", "version": "0.1-demo", "status": "APPROVED",
        "reviewer": "expert — KVK persona (demo)", "approvedOn": "2026-02-09T12:00:00+05:30", "validUntil": "2026-04-30",
        "supersededBy": None, "createdAt": "2026-02-09T09:00:00+05:30",
        "immediateSteps": ["Conserve natural enemies; avoid broad-spectrum sprays", "Dislodge colonies with water jet on small patches"],
        "monitoring": ["Count colonies on 10 random plants twice weekly"], "escalateWhen": ["Colonies on most plants with curling"],
        "chemical": CHEM_LOCK, "note": "Rabi demo advisory.",
    },
    {
        "id": "ADV-2607-v0.1", "conditionId": "powdery_mildew", "crop": "cumin", "version": "0.1-demo", "status": "APPROVED",
        "reviewer": "expert — KVK persona (demo)", "approvedOn": "2026-02-17T12:00:00+05:30", "validUntil": "2026-04-30",
        "supersededBy": None, "createdAt": "2026-02-17T09:00:00+05:30",
        "immediateSteps": ["Improve airflow; avoid excess nitrogen"], "monitoring": ["Weekly inspection"],
        "escalateWhen": ["Coating covers most foliage"], "chemical": CHEM_LOCK, "note": "Rabi demo advisory.",
    },
    {
        "id": "ADV-2608-v0.1", "conditionId": "white_rust", "crop": "mustard", "version": "0.1-demo", "status": "APPROVED",
        "reviewer": "expert — KVK persona (demo)", "approvedOn": "2026-01-27T12:00:00+05:30", "validUntil": "2026-04-30",
        "supersededBy": None, "createdAt": "2026-01-27T09:00:00+05:30",
        "immediateSteps": ["Remove infected leaves/plants; destroy debris"], "monitoring": ["Twice-weekly inspection"],
        "escalateWhen": ["Staghead symptoms appear"], "chemical": CHEM_LOCK, "note": "Rabi demo advisory.",
    },
    {
        "id": "ADV-2609-v0.1", "conditionId": "wilt", "crop": "cumin", "version": "0.1-demo", "status": "APPROVED",
        "reviewer": "expert — KVK persona (demo)", "approvedOn": "2026-02-24T12:00:00+05:30", "validUntil": "2026-04-30",
        "supersededBy": None, "createdAt": "2026-02-24T09:00:00+05:30",
        "immediateSteps": ["Isolate affected zone; avoid moving soil/tools from it"], "monitoring": ["Mark and re-check zone every 3 days"],
        "escalateWhen": ["New wilt patches appear"], "chemical": CHEM_LOCK, "note": "Rabi demo advisory.",
    },
    {
        "id": "ADV-2501-v0.1", "conditionId": "white_rust", "crop": "mustard", "version": "2025-draft", "status": "WITHDRAWN",
        "reviewer": "expert — KVK persona (demo)", "approvedOn": None, "validUntil": None, "supersededBy": "ADV-2608-v0.1",
        "createdAt": "2025-11-10T09:00:00+05:30", "immediateSteps": ["(withdrawn content)"], "monitoring": [], "escalateWhen": [],
        "chemical": CHEM_LOCK, "note": "Withdrawn: superseded by ADV-2608-v0.1 after expert review.",
    },
    {
        "id": "ADV-2510-v0.1", "conditionId": "root_rot", "crop": "guar", "version": "2025-rabi", "status": "EXPIRED",
        "reviewer": "expert — KVK persona (demo)", "approvedOn": "2025-11-15T12:00:00+05:30", "validUntil": "2026-03-31",
        "supersededBy": None, "createdAt": "2025-11-15T09:00:00+05:30",
        "immediateSteps": ["Improve drainage; remove infected plants"], "monitoring": ["Weekly inspection"],
        "escalateWhen": ["Patch enlarges"], "chemical": CHEM_LOCK,
        "note": "Validity window ended; demonstrates EXPIRED lifecycle state.",
    },
]

MODEL_VERSIONS = [
    {
        "id": "demo-rules-0.1.0", "kind": "deterministic-demo", "status": "ACTIVE_DEMO",
        "trainedOn": "None — hand-authored rule table (data/demo/taxonomy.json)",
        "evaluationNote": "No field accuracy measured. Scores are simulated and labelled as such. Must not be quoted as model performance.",
        "activatedAt": "2026-07-01T09:00:00+05:30",
    },
    {
        "id": "fieldnet-bajra-v0", "kind": "planned-ml", "status": "PLANNED_EVALUATION_REQUIRED",
        "trainedOn": "Planned: licensed Rajasthan field-image dataset (Task 002 scope)",
        "evaluationNote": "Blocked until dataset licensing, provenance review and offline evaluation harness exist (Task 002).",
        "activatedAt": None,
    },
]

PERSONAS = [
    {"id": "farmer", "label": "Farmer (demo)", "role": "farmer", "note": "Pseudonymous demo farmer RJ-DEMO-F1042"},
    {"id": "field-worker", "label": "Field worker FW-07 (demo)", "role": "field_worker", "note": "Captures evidence, runs missions"},
    {"id": "expert", "label": "Expert — KVK persona (demo)", "role": "expert", "note": "Verifies/corrects triage; approves advisories"},
    {"id": "district-officer", "label": "District officer (demo)", "role": "district_officer", "note": "Owns outbreak response SLA"},
    {"id": "state-admin", "label": "State administrator (demo)", "role": "state_admin", "note": "Governance and audit oversight"},
]

FARMERS = [
    {"id": "RJ-DEMO-F1042", "pseudonym": "Demo farmer F-1042", "district": "Jodhpur", "block": "Balesar"},
    {"id": "RJ-DEMO-F1003", "pseudonym": "Demo farmer F-1003", "district": "Nagaur", "block": "Nagaur"},
    {"id": "RJ-DEMO-F1007", "pseudonym": "Demo farmer F-1007", "district": "Jodhpur", "block": "Luni"},
    {"id": "RJ-DEMO-F1011", "pseudonym": "Demo farmer F-1011", "district": "Jodhpur", "block": "Osian"},
    {"id": "RJ-DEMO-F1012", "pseudonym": "Demo farmer F-1012", "district": "Jodhpur", "block": "Osian"},
    {"id": "RJ-DEMO-F1018", "pseudonym": "Demo farmer F-1018", "district": "Jodhpur", "block": "Balesar"},
    {"id": "RJ-DEMO-F1023", "pseudonym": "Demo farmer F-1023", "district": "Jodhpur", "block": "Balesar"},
    {"id": "RJ-DEMO-F1027", "pseudonym": "Demo farmer F-1027", "district": "Jodhpur", "block": "Luni"},
    {"id": "RJ-DEMO-F1031", "pseudonym": "Demo farmer F-1031", "district": "Jodhpur", "block": "Balesar"},
    {"id": "RJ-DEMO-F1036", "pseudonym": "Demo farmer F-1036", "district": "Jodhpur", "block": "Balesar"},
    {"id": "RJ-DEMO-F1039", "pseudonym": "Demo farmer F-1039", "district": "Jodhpur", "block": "Balesar"},
    {"id": "RJ-DEMO-F1046", "pseudonym": "Demo farmer F-1046", "district": "Jalore", "block": "Bhinmal"},
    {"id": "RJ-DEMO-F1048", "pseudonym": "Demo farmer F-1048", "district": "Jalore", "block": "Bhinmal"},
    {"id": "RJ-DEMO-F1052", "pseudonym": "Demo farmer F-1052", "district": "Nagaur", "block": "Nagaur"},
    {"id": "RJ-DEMO-F1055", "pseudonym": "Demo farmer F-1055", "district": "Nagaur", "block": "Nagaur"},
    {"id": "RJ-DEMO-F1058", "pseudonym": "Demo farmer F-1058", "district": "Nagaur", "block": "Merta"},
    {"id": "RJ-DEMO-F1061", "pseudonym": "Demo farmer F-1061", "district": "Jalore", "block": "Jalore"},
    {"id": "RJ-DEMO-F1064", "pseudonym": "Demo farmer F-1064", "district": "Nagaur", "block": "Merta"},
    {"id": "RJ-DEMO-F1067", "pseudonym": "Demo farmer F-1067", "district": "Jalore", "block": "Jalore"},
    {"id": "RJ-DEMO-F1070", "pseudonym": "Demo farmer F-1070", "district": "Nagaur", "block": "Nagaur"},
]

# Referential integrity: every case's farmerId must exist in the farmers registry.
_KNOWN_FARMERS = {f["id"] for f in FARMERS}
for c in CASES:
    if c["farmerId"] not in _KNOWN_FARMERS:
        FARMERS.append({
            "id": c["farmerId"],
            "pseudonym": f"Demo farmer F-{c['farmerId'].rsplit('-F', 1)[-1]}",
            "district": c["district"], "block": c["block"],
        })
        _KNOWN_FARMERS.add(c["farmerId"])
FARMERS.sort(key=lambda f: f["id"])

PLOTS = []
for c in CASES:
    PLOTS.append({"id": c["plotId"], "farmerId": c["farmerId"], "district": c["district"], "block": c["block"],
                  "lat": c["lat"], "lon": c["lon"], "areaAcres": c["areaAcres"], "soilNote": "Demo soil note (simulated)"})

SEASONS = [{"id": f"CS-{c['id']}", "plotId": c["plotId"], "crop": c["crop"], "season": c["season"],
            "stage": c["cropStage"], "sownOn": ("2026-06-28" if c["season"] == "kharif-2026" else "2025-11-05")} for c in CASES]


def main() -> None:
    audit = []
    for c in CASES:
        for e in c["timeline"]:
            audit.append({**e, "caseId": c["id"]})
    audit.append({"id": "EV-9001", "at": "2026-07-01T09:00:00+05:30", "type": "model_activated", "actor": SYS,
                  "summary": "Deterministic demo provider demo-rules-0.1.0 activated (no ML model in Task 001)", "provenance": "SIMULATED", "caseId": None})
    audit.sort(key=lambda e: e["at"])
    seed = {
        "meta": {
            "scenario": "FarmGraph Rakshak golden demo vertical slice",
            "demoNow": DEMO_NOW,
            "generatedBy": "data/demo/generate_seed.py (deterministic; no randomness)",
            "provenance": "SIMULATED — all farmers, cases, scores and outcomes are demo data",
            "pilotRegions": ["Jodhpur (Balesar, Luni, Osian)", "Nagaur (Nagaur, Merta)", "Jalore (Jalore, Bhinmal)"],
        },
        "personas": PERSONAS, "farmers": FARMERS, "plots": PLOTS, "cropSeasons": SEASONS,
        "cases": sorted(CASES, key=lambda c: c["id"]), "clusters": CLUSTERS, "missions": MISSIONS,
        "advisories": ADVISORIES, "modelVersions": MODEL_VERSIONS, "auditEvents": audit,
        "referrals": [], "learningRecords": [],
    }
    out = HERE / "seed.json"
    out.write_text(json.dumps(seed, ensure_ascii=False, indent=1))
    states = {}
    for c in CASES:
        states[c["state"]] = states.get(c["state"], 0) + 1
    print(f"wrote {out} — {len(CASES)} cases, {len(CLUSTERS)} clusters, {len(MISSIONS)} missions, {len(ADVISORIES)} advisories, {len(audit)} audit events")
    print("states:", json.dumps(states, sort_keys=True))


if __name__ == "__main__":
    main()
