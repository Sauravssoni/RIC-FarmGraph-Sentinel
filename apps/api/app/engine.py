"""Deterministic demo engine — mirrors data/demo/generate_seed.py exactly.

This is NOT a trained model. Scores are simulated and labelled as such.
Thresholds come from data/demo/policy.json and are prototype policies only.
"""
from __future__ import annotations

import math
from typing import Any


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


class DeterministicEngine:
    def __init__(self, policy: dict[str, Any], taxonomy: dict[str, Any]):
        self.policy = policy
        self.taxonomy = taxonomy
        self.conditions = {c["id"]: c for c in taxonomy["conditions"]}

    # ---------------- capture quality gate ----------------
    def capture_quality(self, checklist: dict[str, bool]) -> dict[str, Any]:
        cq = self.policy["captureQuality"]
        w = cq["weights"]
        cov = round(sum(w[k] for k in ("leafClose", "lowerLeaf", "wholePlant", "lightingOk") if checklist.get(k)), 2)
        issues: list[str] = []
        reqs: list[str] = []
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
            cov >= cq["minCoverage"]
            and checklist.get("leafClose", False)
            and sum(1 for v in cq["secondaryViews"] if checklist.get(v)) >= cq["minSecondaryViews"]
            and checklist.get("lightingOk", False)
        )
        return {"coverageScore": cov, "passed": passed, "issues": issues if not passed else [], "recaptureRequests": reqs if not passed else []}

    # ---------------- deterministic triage ----------------
    def diagnose(self, crop: str, symptom: str, checklist: dict[str, bool], at: str) -> dict[str, Any]:
        tax = self.taxonomy
        rows = tax["diagnosisTable"].get(f"{crop}:{symptom}")
        if rows is None:
            rows = [{"conditionId": "unknown", "base": 0.50}, {"conditionId": "healthy", "base": 0.30}, {"conditionId": "unknown", "base": 0.20}]
        t = self.policy["triage"]
        penalty = 0.0 if (checklist.get("lowerLeaf") and checklist.get("wholePlant")) else t["missingViewsScorePenalty"]
        cands: list[dict[str, Any]] = []
        for i, r in enumerate(rows):
            score = r["base"]
            if i == 0:
                score = round(max(0.05, score - penalty), 2)
            cid = r["conditionId"]
            cands.append({
                "conditionId": cid,
                "label": self.conditions[cid]["labelEn"],
                "simConfidence": score,
                "reasons": tax["reasons"].get(cid, tax["reasons"]["unknown"]),
                "missingEvidence": tax["missingEvidence"].get(cid, tax["missingEvidence"]["_default"]),
            })
        lead = cands[0]
        second = cands[1] if len(cands) > 1 else {"simConfidence": 0}
        margin = round(lead["simConfidence"] - second["simConfidence"], 2)
        high_spread = self.conditions[lead["conditionId"]]["spreadRisk"] == "high" and lead["simConfidence"] >= t["highSpreadRiskMinScore"]
        if lead["conditionId"] == "unknown" and lead["simConfidence"] >= t["abstainOtherThreshold"]:
            routing = {"decision": "abstain", "reason": "Out-of-distribution indicator: no candidate strong enough. Expert must decide; never forced into a known label."}
        elif lead["simConfidence"] >= t["autonomousMinScore"] and margin >= t["autonomousMinMargin"] and not high_spread:
            routing = {"decision": "autonomous", "reason": "Lead score and margin exceed prototype autonomous thresholds; safe advisory may issue without expert."}
        else:
            routing = {"decision": "expert", "reason": f"Lead score {lead['simConfidence']:.2f} below autonomous threshold {t['autonomousMinScore']} or margin {margin:.2f} too small; expert review required."}
        return {
            "provider": "demo-rules", "modelVersion": "0.1.0-demo", "provenance": "SIMULATED",
            "at": at, "crop": crop, "symptomCategory": symptom,
            "candidates": cands, "margin": margin, "routing": routing,
            "highSpreadRisk": high_spread, "escalationRequired": bool(high_spread and t["highSpreadRiskEscalates"]),
            "recommendedNext": tax["missingEvidence"].get(lead["conditionId"], tax["missingEvidence"]["_default"]) if routing["decision"] != "abstain" else tax["missingEvidence"]["unknown"],
            "thresholdsUsed": {"autonomousMinScore": t["autonomousMinScore"], "autonomousMinMargin": t["autonomousMinMargin"], "abstainOtherThreshold": t["abstainOtherThreshold"]},
            "note": "Simulated scores from deterministic demo rules — not measured model accuracy.",
        }

    # ---------------- outbreak scoring ----------------
    def outbreak_score(self, cluster: dict[str, Any], cases: list[dict[str, Any]]) -> dict[str, Any]:
        members = [c for c in cases if c["id"] in cluster["memberCaseIds"] and c["state"] != "CLOSED_DUPLICATE"]
        verified = [c for c in members if c.get("expertConfirmedCondition") == cluster["conditionId"]]
        member_count = max(1, len(members))
        verified_ratio = len(verified) / member_count
        ob = self.policy["outbreak"]
        w = ob["weights"]
        sig = cluster["seedSignals"]
        components = {
            "verifiedRatio": round(verified_ratio, 3),
            "spatialDensity": sig["spatialDensity"],
            "temporalGrowth": sig["temporalGrowth"],
            "cropStageCompat": sig["cropStageCompat"],
            "weatherSuitability": cluster["weatherSuitability"],
            "severityIndex": sig["severityIndex"],
        }
        positive = sum(w[k] * components[k] for k in w)
        penalty = ob["duplicatePenaltyWeight"] * sig["duplicatePenalty"]
        score = round(max(0.0, min(100.0, 100.0 * (positive - penalty))), 1)
        if cluster["status"] == "DISMISSED":
            status = "DISMISSED"
        elif score >= ob["thresholds"]["verifiedOutbreak"]:
            status = "VERIFIED"
        elif score >= ob["thresholds"]["suspected"]:
            status = "SUSPECTED"
        else:
            status = "WATCH"
        top = sorted(((k, w[k] * components[k]) for k in w), key=lambda x: -x[1])[:2]
        explanation = (
            f"Score {score} driven mainly by {top[0][0]} ({components[top[0][0]]}) and {top[1][0]} ({components[top[1][0]]}); "
            f"{len(verified)}/{member_count} member cases expert-verified; duplicate penalty {sig['duplicatePenalty']}."
        )
        return {
            "clusterId": cluster["id"], "score": score, "status": status,
            "components": components, "weights": w, "duplicatePenalty": sig["duplicatePenalty"],
            "verifiedCount": len(verified), "memberCount": member_count,
            "explanation": explanation, "provenance": "SIMULATED",
        }

    # ---------------- expert queue priority ----------------
    def expert_priority(self, case: dict[str, Any]) -> tuple[float, str]:
        """Deterministic queue priority. Higher = review sooner. Documented policy."""
        score = 10.0
        reasons: list[str] = []
        d = case.get("diagnosis")
        if d:
            if d.get("highSpreadRisk"):
                score += 50
                reasons.append("high-spread-risk candidate")
            if d.get("escalationRequired"):
                score += 25
                reasons.append("escalation required by policy")
            lead = d["candidates"][0]
            if lead["conditionId"] == "unknown":
                score += 20
                reasons.append("abstained / out-of-distribution")
            if lead["simConfidence"] < 0.5:
                score += 10
                reasons.append("very low lead score")
            reasons.append(f"lead {lead['conditionId']} (simulated {lead['simConfidence']:.2f})")
        if case.get("pendingSync"):
            score -= 5
            reasons.append("sync pending")
        return min(100.0, score), "; ".join(reasons)

    # ---------------- mission representative ordering ----------------
    def representative_order(self, cluster: dict[str, Any], cases: list[dict[str, Any]], limit: int = 3) -> list[str]:
        members = [c for c in cases if c["id"] in cluster["memberCaseIds"] and c["state"] != "CLOSED_DUPLICATE"]

        def dist(c: dict[str, Any]) -> float:
            return haversine_km(c["lat"], c["lon"], cluster["centerLat"], cluster["centerLon"])

        unverified = sorted([c for c in members if c.get("expertConfirmedCondition") != cluster["conditionId"]], key=dist)
        verified = sorted([c for c in members if c.get("expertConfirmedCondition") == cluster["conditionId"]], key=dist)
        return [c["id"] for c in (unverified + verified)][:limit]
