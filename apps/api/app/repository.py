"""In-memory deterministic demo repository.

Task 001 limitation (documented): persistence is process memory only, seeded from
data/demo/seed.json and restored by POST /api/v1/demo/reset. This is deliberate
for the prototype and is stated openly in /health and the OpenAPI description.
"""
from __future__ import annotations

import copy
import json
import threading
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

from .engine import DeterministicEngine

REPO_ROOT = Path(__file__).resolve().parents[3]
DATA_DIR = REPO_ROOT / "data" / "demo"

CLOSED_STATES = {"RESOLVED", "CLOSED_UNKNOWN", "CLOSED_DUPLICATE"}
VERIFIED_STATES = {"EXPERT_CONFIRMED", "EXPERT_CORRECTED", "FIELD_VISIT_REQUIRED", "ADVISORY_ISSUED", "FOLLOW_UP_DUE", "IMPROVING", "NOT_IMPROVING"}


def _load(name: str) -> Any:
    return json.loads((DATA_DIR / name).read_text(encoding="utf-8"))


class DemoRepository:
    def __init__(self) -> None:
        self._lock = threading.RLock()
        self.policy = _load("policy.json")
        self.taxonomy = _load("taxonomy.json")
        self.integrations = _load("integrations.json")
        self.engine = DeterministicEngine(self.policy, self.taxonomy)
        self._seed = _load("seed.json")
        self.reset()

    # ---------------- lifecycle ----------------
    def reset(self) -> None:
        with self._lock:
            data = copy.deepcopy(self._seed)
            self.meta = data["meta"]
            self.personas = data["personas"]
            self.farmers = data["farmers"]
            self.plots = data["plots"]
            self.crop_seasons = data["cropSeasons"]
            self.cases: dict[str, dict[str, Any]] = {c["id"]: c for c in data["cases"]}
            self.clusters: dict[str, dict[str, Any]] = {c["id"]: c for c in data["clusters"]}
            self.missions: dict[str, dict[str, Any]] = {m["id"]: m for m in data["missions"]}
            self.advisories = data["advisories"]
            self.model_versions = data["modelVersions"]
            self.audit_events: list[dict[str, Any]] = data["auditEvents"]
            self._ev_counter = max(
                (int(e["id"].split("-")[1]) for e in self.audit_events if e["id"].startswith("EV-")),
                default=0,
            )

    # ---------------- helpers ----------------
    def _now(self) -> str:
        # Frozen demo clock: real clock would be used in production.
        return datetime.now().astimezone().isoformat(timespec="seconds")

    def _event(self, at: str, type_: str, actor: str, summary: str) -> dict[str, Any]:
        self._ev_counter += 1
        return {"id": f"EV-{self._ev_counter:04d}", "at": at, "type": type_, "actor": actor, "summary": summary, "provenance": "SIMULATED"}

    def _append(self, case: dict[str, Any], at: str, type_: str, actor: str, summary: str) -> None:
        e = self._event(at, type_, actor, summary)
        case["timeline"].append(e)
        case["updatedAt"] = at
        self.audit_events.append({**e, "caseId": case["id"]})

    def get_case(self, case_id: str) -> Optional[dict[str, Any]]:
        return self.cases.get(case_id)

    def cases_list(self) -> list[dict[str, Any]]:
        return list(self.cases.values())

    def cluster_cases(self, cluster: dict[str, Any]) -> list[dict[str, Any]]:
        return [self.cases[cid] for cid in cluster["memberCaseIds"] if cid in self.cases]

    # ---------------- mutations ----------------
    def create_case(self, body: dict[str, Any]) -> dict[str, Any]:
        with self._lock:
            nums = [int(cid.split("-")[1]) for cid in self.cases]
            cid = f"C-{max(nums) + 1}"
            at = self._now()
            case = {
                "id": cid, "farmerId": body["farmerId"], "plotId": body["plotId"],
                "crop": body["crop"], "cropStage": body["cropStage"], "season": body["season"],
                "district": body["district"], "block": body["block"],
                "lat": body["lat"], "lon": body["lon"], "areaAcres": body["areaAcres"],
                "state": "DRAFT", "createdAt": at, "updatedAt": at,
                "createdOffline": body.get("createdOffline", False), "pendingSync": body.get("createdOffline", False),
                "consent": {"given": body["consent"]["given"], "at": at, "channel": body["consent"]["channel"],
                            "purposeNote": "Crop-health advisory and outbreak response (demo consent text)"},
                "observations": [], "diagnosis": None, "reviews": [], "advisoryRef": None,
                "followUps": [], "outcome": None, "expertConfirmedCondition": None, "duplicateOf": None,
                "timeline": [],
            }
            self.cases[cid] = case
            self._append(case, at, "case_created", "farmer (demo)", f"Report opened for {case['crop']} plot {case['plotId']}")
            return case

    def add_observation(self, case: dict[str, Any], body: dict[str, Any]) -> dict[str, Any]:
        with self._lock:
            at = body.get("at") or self._now()
            q = self.engine.capture_quality(body["checklist"])
            n = len(case["observations"]) + 1
            obs = {
                "id": f"{case['id']}-O{n}", "at": at, "symptomCategory": body["symptomCategory"],
                "symptomNote": body.get("symptomNote", ""), "checklist": body["checklist"],
                "imageCount": sum(1 for k in ("leafClose", "lowerLeaf", "wholePlant") if body["checklist"].get(k)),
                "imageRef": f"sim-evidence://{case['id']}/{n}", "quality": q,
            }
            case["observations"].append(obs)
            if case.get("pendingSync"):
                case["pendingSync"] = False
                self._append(case, at, "sync_completed", "system (demo)", "Offline report synced (simulated connectivity)")
            self._append(case, at, "capture_submitted", "field worker FW-07 (demo)",
                         f"Evidence capture submitted ({obs['imageCount']} view(s), coverage {q['coverageScore']:.2f})")
            if not q["passed"]:
                case["state"] = "NEEDS_RECAPTURE"
                self._append(case, at, "quality_failed", "system (demo)", "Quality gate failed: " + "; ".join(q["issues"]))
            else:
                self._append(case, at, "quality_passed", "system (demo)", f"Capture quality gate passed (coverage {q['coverageScore']:.2f})")
                if case["state"] in ("DRAFT", "CAPTURE_PENDING", "NEEDS_RECAPTURE"):
                    case["state"] = "READY_FOR_TRIAGE"
            return obs

    def triage(self, case: dict[str, Any]) -> dict[str, Any]:
        with self._lock:
            obs = case["observations"][-1]
            at = self._now()
            d = self.engine.diagnose(case["crop"], obs["symptomCategory"], obs["checklist"], at)
            case["diagnosis"] = d
            case["state"] = "TRIAGED"
            self._append(case, at, "triage_completed", "system (demo)",
                         f"Deterministic demo triage: lead {d['candidates'][0]['label']} (simulated {d['candidates'][0]['simConfidence']:.2f}), margin {d['margin']:.2f}")
            if d["routing"]["decision"] in ("expert", "abstain"):
                case["state"] = "AWAITING_EXPERT"
                prefix = "Abstention: " if d["routing"]["decision"] == "abstain" else ""
                self._append(case, at, "escalated_to_expert", "system (demo)", prefix + d["routing"]["reason"])
            return d

    def review(self, case: dict[str, Any], body: dict[str, Any]) -> tuple[dict[str, Any], list[dict[str, Any]]]:
        with self._lock:
            at = self._now()
            reviewer = body.get("reviewer") or "expert — KVK persona (demo)"
            decision = body["decision"]
            condition = body.get("conditionId")
            lead = case["diagnosis"]["candidates"][0]["conditionId"] if case.get("diagnosis") else None
            r = {"id": f"{case['id']}-R{len(case['reviews']) + 1}", "at": at, "reviewer": reviewer,
                 "decision": decision, "conditionId": condition, "note": body["note"]}
            case["reviews"].append(r)
            cond_label = self.engine.conditions
            if decision == "confirm":
                case["expertConfirmedCondition"] = condition or lead
                case["state"] = "EXPERT_CONFIRMED"
                self._append(case, at, "expert_confirmed", reviewer,
                             f"Expert confirmed {cond_label[case['expertConfirmedCondition']]['labelEn']}: {body['note']}")
            elif decision == "correct":
                case["expertConfirmedCondition"] = condition
                case["state"] = "EXPERT_CORRECTED"
                self._append(case, at, "expert_corrected", reviewer,
                             f"Expert corrected AI triage ({cond_label.get(lead, {}).get('labelEn', '?')} → {cond_label[condition]['labelEn']}): {body['note']}")
            elif decision == "unknown":
                case["expertConfirmedCondition"] = "unknown"
                case["state"] = "CLOSED_UNKNOWN"
                self._append(case, at, "expert_marked_unknown", reviewer,
                             f"Expert marked condition UNKNOWN — not forced into a known label. {body['note']}")
            elif decision == "field_visit":
                case["state"] = "FIELD_VISIT_REQUIRED"
                self._append(case, at, "field_visit_required", reviewer, f"Field verification required: {body['note']}")
            elif decision == "recapture":
                case["state"] = "NEEDS_RECAPTURE"
                self._append(case, at, "recapture_requested", reviewer, f"Expert requested recapture: {body['note']}")
            affected: list[dict[str, Any]] = []
            if decision in ("confirm", "correct"):
                for cl in self.clusters.values():
                    if case["id"] in cl["memberCaseIds"]:
                        breakdown = self.engine.outbreak_score(cl, self.cases_list())
                        cl["status"] = breakdown["status"]
                        affected.append(breakdown)
                        self._append(case, at, "cluster_updated", "system (demo)",
                                     f"Cluster {cl['id']} re-scored to {breakdown['score']} ({breakdown['status']}) after expert decision")
            return r, affected

    def add_follow_up(self, case: dict[str, Any], body: dict[str, Any]) -> dict[str, Any]:
        with self._lock:
            at = self._now()
            status = body["status"]
            fu = {"id": f"{case['id']}-F{len(case['followUps']) + 1}", "at": at,
                  "channel": "field visit / call (simulated)", "status": status, "note": body["note"]}
            case["followUps"].append(fu)
            case["state"] = {"improving": "IMPROVING", "not_improving": "NOT_IMPROVING", "resolved": "RESOLVED"}[status]
            self._append(case, at, "follow_up_recorded", "field worker FW-07 (demo)",
                         f"Follow-up: {status.replace('_', ' ')} — {body['note']}")
            if status == "not_improving":
                self._append(case, at, "escalated_to_expert", "system (demo)",
                             "No improvement — escalated for expert re-review and field verification")
            if status == "resolved":
                case["outcome"] = {"status": "resolved", "note": body["note"], "updatedAt": at}
            return fu

    def create_mission(self, cluster: dict[str, Any]) -> dict[str, Any]:
        with self._lock:
            open_existing = [m for m in self.missions.values() if m.get("clusterId") == cluster["id"] and m["status"] != "COMPLETED"]
            if open_existing:
                raise MissionConflict(f"Open mission already exists for {cluster['id']}")
            nums = [int(mid.split("-")[1]) for mid in self.missions]
            mid = f"M-{max(nums) + 1}"
            reps = self.engine.representative_order(cluster, self.cases_list(), limit=3)
            at = self._now()
            mission = {
                "id": mid, "clusterId": cluster["id"],
                "purpose": f"Representative field verification — {cluster['name']}",
                "assignedRole": "field worker (demo)", "status": "PLANNED",
                "representativeCaseIds": reps, "routeOrder": reps,
                "offlinePack": "READY", "createdAt": at,
                "infoGainNote": "Deterministic order: unverified cases first (highest information gain), then nearest to cluster centre; not a route optimiser.",
                "checklist": ["Whole-block context photos", "20-plant inspection count", "Lower-leaf close-ups", "Spread-direction sketch", "Farmer interview (consent confirmed)"],
                "visits": [], "syncStatus": "PENDING",
            }
            self.missions[mid] = mission
            for cid in reps:
                if cid in self.cases:
                    self._append(self.cases[cid], at, "mission_created", "system (demo)", f"Mission {mid} created covering this case (representative inspection)")
            return mission

    # ---------------- reads / aggregates ----------------
    def overview(self) -> dict[str, Any]:
        cases = self.cases_list()
        active = [c for c in cases if c["state"] not in CLOSED_STATES]
        awaiting = [c for c in cases if c["state"] == "AWAITING_EXPERT"]
        high = [c for c in cases if (c.get("diagnosis") or {}).get("highSpreadRisk") or c["state"] in ("FIELD_VISIT_REQUIRED", "NOT_IMPROVING")]
        scored = [self.engine.outbreak_score(cl, cases) for cl in self.clusters.values()]
        suspected = [s for s in scored if s["status"] in ("SUSPECTED", "VERIFIED")]
        deltas = []
        for c in cases:
            if c["reviews"]:
                t0 = datetime.fromisoformat(c["createdAt"])
                t1 = datetime.fromisoformat(c["reviews"][0]["at"])
                deltas.append((t1 - t0).total_seconds() / 3600.0)
        deltas.sort()
        median = round(deltas[len(deltas) // 2], 1) if deltas else None
        advised = [c for c in cases if c.get("advisoryRef")]
        with_fu = [c for c in advised if c["followUps"]]
        fu_pct = round(100.0 * len(with_fu) / len(advised), 1) if advised else 0.0
        return {
            "activeCases": len(active), "awaitingExpert": len(awaiting), "highPriority": len(high),
            "suspectedClusters": len(suspected), "medianReportToReviewHours": median,
            "pendingSync": len([c for c in cases if c.get("pendingSync")]),
            "followUpCompletionPct": fu_pct,
            "resolvedOrImproving": len([c for c in cases if c["state"] in ("RESOLVED", "IMPROVING")]),
            "generatedAt": self._now(), "demoNow": self.meta["demoNow"], "provenance": "SIMULATED",
        }

    def expert_queue(self) -> list[dict[str, Any]]:
        items = []
        for c in self.cases_list():
            if c["state"] == "AWAITING_EXPERT":
                score, reason = self.engine.expert_priority(c)
                items.append({"case": c, "priorityScore": score, "priorityReason": reason})
        items.sort(key=lambda i: (-i["priorityScore"], i["case"]["createdAt"]))
        return items

    def clusters_with_scores(self) -> list[dict[str, Any]]:
        out = []
        for cl in self.clusters.values():
            breakdown = self.engine.outbreak_score(cl, self.cases_list())
            cl["status"] = breakdown["status"] if cl["status"] != "DISMISSED" else "DISMISSED"
            out.append({**cl, "score": breakdown})
        return out


class MissionConflict(Exception):
    pass
