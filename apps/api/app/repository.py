"""Deterministic demo repository with SQLite document persistence (Phase G).

Seeded from data/demo/seed.json and restored by POST /api/v1/demo/reset.
Persistence: a labelled single-node SQLite JSON-document store
(app/persistence.py) — reviews, referrals, learning records, missions and
audit events now survive a process restart. Set FGR_PERSIST=memory to fall
back to pure in-memory behaviour (test-suite default). All data remains
SIMULATED and is labelled as such; no government adapter is live.
"""
from __future__ import annotations

import copy
import json
import os
import threading
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any, Optional

from .engine import DeterministicEngine
from .persistence import SQLStore, default_store

REPO_ROOT = Path(__file__).resolve().parents[3]
DATA_DIR = REPO_ROOT / "data" / "demo"
REF_DIR = REPO_ROOT / "data" / "reference"
POLICY_DIR = REPO_ROOT / "data" / "policy"

CLOSED_STATES = {"RESOLVED", "CLOSED_UNKNOWN", "CLOSED_DUPLICATE"}
VERIFIED_STATES = {"EXPERT_CONFIRMED", "EXPERT_CORRECTED", "FIELD_VISIT_REQUIRED", "ADVISORY_ISSUED", "FOLLOW_UP_DUE", "IMPROVING", "NOT_IMPROVING"}


def _load(name: str) -> Any:
    return json.loads((DATA_DIR / name).read_text(encoding="utf-8"))


def _load_ref(name: str) -> Any:
    return json.loads((REF_DIR / name).read_text(encoding="utf-8"))


class DemoRepository:
    def __init__(self) -> None:
        self._lock = threading.RLock()
        self.policy = _load("policy.json")
        self.taxonomy = _load("taxonomy.json")
        self.integrations = _load("integrations.json")
        self.engine = DeterministicEngine(self.policy, self.taxonomy)
        self._seed = _load("seed.json")
        self.kvks = _load_ref("kvk-directory.json")["kvks"]
        self.public_data_snapshot = _load_ref("public-data-snapshot.json")
        self.weather_policy = json.loads((POLICY_DIR / "weather-risk.json").read_text(encoding="utf-8"))
        self._imd_adapter: Any = None
        self.store: Optional[SQLStore] = (
            None if os.environ.get("FGR_PERSIST") == "memory" else default_store()
        )
        self._persisted_boot = False
        self._idem_cache: dict[str, dict[str, Any]] = {}
        self.reset(clear_store=False)

    # ---------------- lifecycle ----------------
    def reset(self, clear_store: bool = True) -> None:
        with self._lock:
            if clear_store and self.store is not None:
                self.store.clear_all()
                self._idem_cache.clear()
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
            self.referrals: dict[str, dict[str, Any]] = {r["id"]: r for r in data.get("referrals", [])}
            self.learning_records: dict[str, dict[str, Any]] = {r["id"]: r for r in data.get("learningRecords", [])}
            self._ev_counter = max(
                (int(e["id"].split("-")[1]) for e in self.audit_events if e["id"].startswith("EV-")),
                default=0,
            )
            self._ref_counter = max(
                (int(rid.split("-")[1]) for rid in self.referrals if rid.startswith("REF-")),
                default=2600,
            )
            self._lr_counter = max(
                (int(rid.split("-")[1]) for rid in self.learning_records if rid.startswith("LR-")),
                default=2600,
            )
            if clear_store:
                self._persisted_boot = False
                self._persist_all()
            else:
                self._load_persisted()

    # ---------------- persistence ----------------
    def _persist_all(self) -> None:
        if self.store is None:
            return
        for c in self.cases.values():
            self.store.put("cases", c["id"], c)
        for m in self.missions.values():
            self.store.put("missions", m["id"], m)
        for r in self.referrals.values():
            self.store.put("referrals", r["id"], r)
        for lr in self.learning_records.values():
            self.store.put("learning_records", lr["id"], lr)
        for e in self.audit_events:
            self.store.put("audit", e["id"], e)

    def _load_persisted(self) -> None:
        if self.store is None:
            return
        stored_cases = self.store.all("cases")
        if not stored_cases:
            self._persist_all()
            return
        self._persisted_boot = True
        self.cases = {d["id"]: d for d in stored_cases}
        missions = self.store.all("missions")
        if missions:
            self.missions = {d["id"]: d for d in missions}
        self.referrals = {d["id"]: d for d in self.store.all("referrals")}
        self.learning_records = {d["id"]: d for d in self.store.all("learning_records")}
        audit = self.store.all("audit")
        if audit:
            self.audit_events = sorted(audit, key=lambda e: e["id"])
            self._ev_counter = max(
                (int(e["id"].split("-")[1]) for e in self.audit_events if e["id"].startswith("EV-")),
                default=self._ev_counter,
            )

    def persistence_label(self) -> str:
        if self.store is None:
            return "in-memory (FGR_PERSIST=memory)"
        return f"sqlite single-node demo store at {self.store.path} (labelled demo persistence — not production infrastructure)"

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
        audit = {**e, "caseId": case["id"]}
        self.audit_events.append(audit)
        if self.store is not None:
            self.store.put("cases", case["id"], case)
            self.store.put("audit", e["id"], audit)

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
            if decision in ("confirm", "correct", "unknown"):
                self._lr_counter += 1
                diag = case.get("diagnosis") or {}
                top = (diag.get("candidates") or [{}])[0]
                lr = {
                    "id": f"LR-{self._lr_counter}",
                    "caseId": case["id"],
                    "observationId": case["observations"][-1]["id"] if case["observations"] else None,
                    "crop": case["crop"], "cropStage": case["cropStage"],
                    "district": case["district"], "block": case["block"],
                    "aiLabel": lead,
                    "aiTopScore": top.get("simConfidence"),
                    "providerId": diag.get("provider"),
                    "expertLabel": case["expertConfirmedCondition"],
                    "reviewAction": decision,
                    "imageIds": [], "voiceNoteId": None,
                    "consentForTraining": bool(case.get("consent", {}).get("given")),
                    "usedInModelVersion": None,
                    "provenance": "EXPERT_VERIFIED_REVIEW",
                    "createdAt": at,
                }
                self.learning_records[lr["id"]] = lr
                if self.store is not None:
                    self.store.put("learning_records", lr["id"], lr)
                self._append(case, at, "learning_recorded", "system (demo)",
                             f"Learning record {lr['id']} captured from expert review ({decision}). No automatic training — record awaits a governed model-update cycle.")
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
            if self.store is not None:
                self.store.put("missions", mid, mission)
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

    # ---------------- referrals (Phase D + Task 003 Phase 2A) ----------------
    # Lifecycle: DRAFT → READY_TO_SHARE → SHARED → ACKNOWLEDGED → RESPONDED →
    # CLOSED, with ESCALATED as an overdue/escalation branch. Creation lands at
    # READY_TO_SHARE (never SHARED): in this demo no external KVK delivery is
    # automated, so a fresh referral must not imply the KVK received anything.
    REFERRAL_FLOW: dict[str, tuple[str, ...]] = {
        "DRAFT": ("READY_TO_SHARE",),
        "READY_TO_SHARE": ("SHARED",),
        "SHARED": ("ACKNOWLEDGED", "ESCALATED"),
        "ACKNOWLEDGED": ("RESPONDED", "ESCALATED"),
        "ESCALATED": ("RESPONDED", "CLOSED"),
        "RESPONDED": ("CLOSED",),
        "CLOSED": (),
    }
    REFERRAL_URGENCY = ("ROUTINE", "PRIORITY", "URGENT")
    DEFAULT_SLA_HOURS = 48

    @staticmethod
    def sla_status(ref: dict[str, Any], now: datetime | None = None) -> str:
        if ref["status"] in ("RESPONDED", "CLOSED"):
            return "COMPLETED"
        now = now or datetime.now().astimezone()
        due = datetime.fromisoformat(ref["dueAt"])
        if now > due:
            return "OVERDUE"
        if now > due - timedelta(hours=12):
            return "DUE_SOON"
        return "WITHIN_SLA"

    def referrals_view(self) -> list[dict[str, Any]]:
        return [{**ref, "slaStatus": self.sla_status(ref)} for ref in self.referrals.values()]

    def create_referral(self, case: dict[str, Any], body: dict[str, Any]) -> dict[str, Any]:
        with self._lock:
            kvk = next((k for k in self.kvks if k["id"] == body["kvkId"]), None)
            if kvk is None:
                raise AdvisoryRejected("KVK_NOT_FOUND", f"KVK {body['kvkId']} is not in the sourced demo directory")
            urgency = body.get("urgency", "PRIORITY")
            if urgency not in self.REFERRAL_URGENCY:
                raise AdvisoryRejected("BAD_URGENCY", f"urgency must be one of {self.REFERRAL_URGENCY}")
            sla_hours = int(body.get("slaTargetHours") or self.DEFAULT_SLA_HOURS)
            self._ref_counter += 1
            at = self._now()
            due = (datetime.fromisoformat(at) + timedelta(hours=sla_hours)).isoformat(timespec="seconds")
            actor = body.get("createdBy") or "expert — KVK persona (demo)"
            ref = {
                "id": f"REF-{self._ref_counter}", "caseId": case["id"], "kvkId": kvk["id"],
                "reason": body["reason"], "note": body.get("note", ""), "urgency": urgency,
                "createdBy": actor, "createdAt": at, "status": "READY_TO_SHARE",
                "statusHistory": [{"status": "READY_TO_SHARE", "at": at, "actor": actor,
                                   "note": "Evidence pack prepared — external KVK delivery not automated (demo)"}],
                "channel": body.get("channel", "in_app_pack"),
                "slaTargetHours": sla_hours, "dueAt": due,
            }
            self.referrals[ref["id"]] = ref
            if self.store is not None:
                self.store.put("referrals", ref["id"], ref)
            self._append(case, at, "kvk_referral", actor,
                         f"Case referred to {kvk['name']} ({kvk['district']}) — {body['reason']} [{urgency}]")
            return {**ref, "slaStatus": self.sla_status(ref)}

    def update_referral(self, ref_id: str, status: str, note: str = "", actor: str = "system (demo)") -> dict[str, Any]:
        with self._lock:
            ref = self.referrals.get(ref_id)
            if ref is None:
                raise AdvisoryRejected("REFERRAL_NOT_FOUND", f"Referral {ref_id} not found")
            if status not in self.REFERRAL_FLOW:
                raise AdvisoryRejected("BAD_STATUS", f"Unknown referral status '{status}'")
            allowed = self.REFERRAL_FLOW[ref["status"]]
            if status not in allowed:
                raise AdvisoryRejected("BAD_TRANSITION",
                                       f"Referral cannot move {ref['status']} → {status} (allowed: {', '.join(allowed) or 'none'})")
            if status == "ESCALATED" and not note.strip():
                raise AdvisoryRejected("ESCALATION_NOTE_REQUIRED", "Escalating a referral requires an escalation note")
            at = self._now()
            ref["status"] = status
            ref["statusHistory"].append({"status": status, "at": at, "actor": actor, "note": note})
            if self.store is not None:
                self.store.put("referrals", ref["id"], ref)
            case = self.cases.get(ref["caseId"])
            if case is not None:
                self._append(case, at, "kvk_referral_status", actor, f"Referral {ref_id} → {status}. {note}".strip())
            return {**ref, "slaStatus": self.sla_status(ref)}

    def build_referral_pack(self, ref_id: str) -> dict[str, Any]:
        """Downloadable KVK referral evidence pack (kvk-referral-pack/v1).

        Privacy: coordinates rounded to 2 dp (~1 km); farmer reference is the
        pseudonymous FarmGraph ID only — no name, phone, Aadhaar/Jan Aadhaar.
        """
        ref = self.referrals.get(ref_id)
        if ref is None:
            raise AdvisoryRejected("REFERRAL_NOT_FOUND", f"Referral {ref_id} not found")
        case = self.cases.get(ref["caseId"])
        if case is None:
            raise AdvisoryRejected("CASE_NOT_FOUND", f"Case {ref['caseId']} not found")
        kvk = next((k for k in self.kvks if k["id"] == ref["kvkId"]), None)
        obs = case.get("observations", [])
        latest = obs[-1] if obs else {}
        diag = case.get("diagnosis") or {}
        top = (diag.get("candidates") or [{}])[0]
        quality = latest.get("quality") or {}
        verified = bool(case.get("expertConfirmedCondition")) or case.get("state") == "EXPERT_CONFIRMED"
        cluster = next((c for c in self.clusters.values() if case["id"] in c.get("memberCaseIds", [])), None)
        referral_events = [e for e in case.get("timeline", []) if str(e.get("type", "")).startswith("kvk_referral")]
        consent = case.get("consent") or {}
        return {
            "packVersion": "kvk-referral-pack/v1",
            "generatedAt": self._now(),
            "referralId": ref["id"], "referralStatus": ref["status"], "caseId": case["id"],
            "farmerRef": case.get("farmerId"), "plotRef": case.get("plotId"),
            "district": case.get("district"), "block": case.get("block"),
            "coordinates": {"lat": round(case.get("lat", 0), 2), "lon": round(case.get("lon", 0), 2),
                            "precisionNote": "Rounded to ~1 km for farmer privacy (demo policy)"},
            "crop": case.get("crop"), "cropStage": case.get("cropStage"),
            "symptomSummary": latest.get("symptomNote") or top.get("label") or "See case evidence",
            "imageHashes": [o["imageRef"] for o in obs if o.get("imageRef")],
            "imageQuality": (f"passed={quality.get('passed')}, coverageScore={quality.get('coverageScore')}"
                             if quality else "no quality record"),
            "inference": {"provider": diag.get("provider", "none"), "version": diag.get("modelVersion", "n/a"),
                          "topLabel": top.get("conditionId"), "topScore": top.get("simConfidence")},
            "verificationStatement": ("Expert-reviewed in demo workflow — see review history"
                                      if verified else
                                      "UNVERIFIED — screening result only; not confirmed by an agronomist"),
            "expertReviewState": case.get("state"),
            "urgency": ref.get("urgency", "PRIORITY"),
            "outbreakRelationship": (f"Member of cluster {cluster['id']} ({cluster['name']}, status {cluster['status']})"
                                     if cluster else "Not part of any outbreak cluster"),
            "requestedAction": f"{ref['reason']}. {ref.get('note', '')}".strip(),
            "originatingRole": ref.get("createdBy", "expert (demo)"),
            "consentStatus": (f"CONSENT RECORDED (demo) — {consent.get('purposeNote', 'crop-health purpose')}"
                              if consent.get("given") else "NO CONSENT RECORDED"),
            "createdAt": ref["createdAt"],
            "sla": {"targetHours": ref.get("slaTargetHours", self.DEFAULT_SLA_HOURS),
                    "dueAt": ref["dueAt"], "status": self.sla_status(ref)},
            "auditReference": referral_events[-1]["id"] if referral_events else "no audit event",
            "farmgraphContact": "FarmGraph Rakshak demo helpdesk — callback placeholder (no live helpdesk in prototype)",
            "kvk": {"id": kvk["id"], "name": kvk["name"], "district": kvk["district"],
                    "phone": kvk.get("phone") or None, "email": kvk.get("email") or None,
                    "address": kvk.get("address", "")} if kvk else
                   {"id": ref["kvkId"], "name": "unknown", "district": "", "phone": None, "email": None, "address": ""},
            "provenance": ("SIMULATED DEMO PACK — case data synthetic; KVK contact from sourced official directory "
                           "(see data/reference/kvk-directory.json); delivery to KVK not automated"),
        }

    # ---------------- voice transcript confirmation (Task 003 Phase 2B) ----------------
    def attach_voice_transcript(self, case: dict[str, Any], body: dict[str, Any]) -> dict[str, Any]:
        """Attach a user-confirmed voice transcript (audited). ASR output only
        enters the case after explicit confirmation/edit; regional speech
        routes the case to human expert review — no dialect ASR is claimed."""
        with self._lock:
            at = self._now()
            actor = body.get("actor") or "field_worker (demo)"
            conf = body["confirmationStatus"]
            regional = bool(body.get("regional"))
            if regional:
                case["state"] = "AWAITING_EXPERT"
                self._append(case, at, "regional_speech_review", actor,
                             "REGIONAL SPEECH — HUMAN REVIEW REQUIRED (Marwari/Mewari voice note; no ASR claimed)")
            edited = "after edit" if conf == "CONFIRMED_AFTER_EDIT" else "as returned"
            note_hash = (body.get("voiceNoteHash") or "")[:10]
            self._append(case, at, "voice_transcript_confirmed", actor,
                         f"Voice transcript confirmed ({edited})"
                         + (f" — voice note sha256 {note_hash}…" if note_hash else ""))
            case["updatedAt"] = at
            if self.store is not None:
                self.store.put("cases", case["id"], case)
            return {
                "caseId": case["id"], "state": case["state"],
                "transcript": body["transcript"], "confirmationStatus": conf,
                "regional": regional, "regionalReviewRequired": regional,
                "at": at, "provenance": "SIMULATED",
            }

    # ---------------- IMD government weather (Task 003 Phase 2C) ----------------
    def weather_for_district(self, district: str) -> dict[str, Any]:
        from .imd import ImdAdapter  # local import keeps module reload order simple
        with self._lock:
            if self._imd_adapter is None:
                om = self.public_data_snapshot.get("sources", {}).get("open_meteo_jodhpur")
                self._imd_adapter = ImdAdapter(open_meteo_snapshot=om)
            return self._imd_adapter.district_weather(district)

    def cluster_weather_context(self, cluster_id: str) -> dict[str, Any]:
        from .imd import weather_suitability_explanation
        cl = self.clusters.get(cluster_id)
        if cl is None:
            raise AdvisoryRejected("CLUSTER_NOT_FOUND", f"Cluster {cluster_id} not found")
        member = next((c for c in self.cases_list() if c["id"] in cl.get("memberCaseIds", [])), None)
        district = (member or {}).get("district", "Jodhpur")
        weather = self.weather_for_district(district)
        explanation = weather_suitability_explanation(
            cl, weather.get("weather"), weather["state"],
            self.weather_policy, self.engine.policy["outbreak"]["weights"]["weatherSuitability"])
        return {
            "clusterId": cluster_id, "district": district,
            "weather": weather, "weatherComponent": explanation,
            "provenance": "Explainable weather component — conservative generic associations only (data/policy/weather-risk.json)",
        }

    # ---------------- learning flywheel (Phase F server side) ----------------
    def learning_summary(self) -> dict[str, Any]:
        records = list(self.learning_records.values())
        by_action: dict[str, int] = {}
        by_crop: dict[str, int] = {}
        by_district: dict[str, int] = {}
        by_label: dict[str, int] = {}
        for r in records:
            by_action[r["reviewAction"]] = by_action.get(r["reviewAction"], 0) + 1
            by_crop[r["crop"]] = by_crop.get(r["crop"], 0) + 1
            by_district[r["district"]] = by_district.get(r["district"], 0) + 1
            by_label[r["expertLabel"]] = by_label.get(r["expertLabel"], 0) + 1
        return {
            "total": len(records),
            "corrections": by_action.get("correct", 0),
            "unknowns": by_action.get("unknown", 0),
            "byAction": by_action, "byCrop": by_crop, "byDistrict": by_district,
            "byExpertLabel": by_label,
            "usedInModelVersion": None,
            "honestyNote": ("Expert review outcomes captured with provenance for a future, human-governed "
                            "model-update cycle. No automatic training occurs; usedInModelVersion stays null "
                            "until a reviewed training run consumes a record."),
            "provenance": "SIMULATED",
        }

    # ---------------- advisory safety invariants (Phase H) ----------------
    def issue_advisory(self, case: dict[str, Any], advisory_id: str) -> dict[str, Any]:
        """Issue an advisory to a case ONLY when every safety invariant holds.
        Raises AdvisoryRejected with a machine-readable code otherwise."""
        with self._lock:
            adv = next((a for a in self.advisories if a["id"] == advisory_id), None)
            if adv is None:
                raise AdvisoryRejected("ADVISORY_NOT_FOUND", f"Advisory {advisory_id} does not exist")
            if adv.get("supersededBy"):
                raise AdvisoryRejected("SUPERSEDED", f"{advisory_id} is superseded by {adv['supersededBy']}; issue the current version")
            if adv["status"] != "APPROVED":
                raise AdvisoryRejected("NOT_APPROVED", f"Advisory status is {adv['status']}; only APPROVED advisories may be issued")
            valid_until = adv.get("validUntil")
            if valid_until and date.today().isoformat() > valid_until:
                raise AdvisoryRejected("EXPIRED", f"Advisory validity ended {valid_until}")
            if adv["crop"] != case["crop"]:
                raise AdvisoryRejected("CROP_MISMATCH", f"Advisory covers {adv['crop']}; case crop is {case['crop']}")
            if not case.get("expertConfirmedCondition"):
                raise AdvisoryRejected("EXPERT_REVIEW_REQUIRED", "An advisory may be issued only after expert confirmation/correction of the diagnosis")
            if adv["conditionId"] != case["expertConfirmedCondition"]:
                raise AdvisoryRejected(
                    "CONDITION_MISMATCH",
                    f"Advisory targets {adv['conditionId']}; expert-confirmed condition is {case['expertConfirmedCondition']}",
                )
            at = self._now()
            case["advisoryRef"] = advisory_id
            case["state"] = "ADVISORY_ISSUED"
            self._append(case, at, "advisory_issued", "officer (demo)",
                         f"Advisory {advisory_id} issued — all safety invariants passed (approved, current, crop- and condition-matched, expert-reviewed)")
            return case

    # ---------------- offline sync (Phase G) ----------------
    def sync_batch(self, body: dict[str, Any]) -> dict[str, Any]:
        """Idempotent offline-outbox sync. The same idempotencyKey never
        applies twice; a replay returns the original result."""
        with self._lock:
            key = body.get("idempotencyKey")
            if not key:
                raise AdvisoryRejected("IDEMPOTENCY_KEY_REQUIRED", "sync_batch requires an idempotencyKey")
            if self.store is not None:
                stored = self.store.get("kv_meta", f"idem:{key}")
                if stored is not None:
                    return {**stored, "status": "already_applied"}
            elif key in self._idem_cache:
                return {**self._idem_cache[key], "status": "already_applied"}
            case_ids: list[str] = []
            for item in body.get("cases", []):
                case = self.create_case(item)
                case_ids.append(case["id"])
                for obs in item.get("observations", []):
                    self.add_observation(case, obs)
            result = {"status": "applied", "idempotencyKey": key, "caseIds": case_ids, "provenance": "SIMULATED"}
            if self.store is not None:
                self.store.put("kv_meta", f"idem:{key}", result)
            else:
                self._idem_cache[key] = result
            return result

    # ---------------- digital twin bundle (Phase C server side) ----------------
    def twin_bundle(self, plot_id: str) -> Optional[dict[str, Any]]:
        plot = next((p for p in self.plots if p["id"] == plot_id), None)
        if plot is None:
            return None
        cases = [c for c in self.cases_list() if c["plotId"] == plot_id]
        season = next((cs for cs in self.crop_seasons if cs.get("plotId") == plot_id), None)
        farmer = next((f for f in self.farmers if f.get("id") == plot.get("farmerId")), None)
        clusters = [cl for cl in self.clusters.values() if any(c["id"] in cl["memberCaseIds"] for c in cases)]
        scores = [self.engine.outbreak_score(cl, self.cases_list()) for cl in clusters]
        conditions = {c.get("expertConfirmedCondition") for c in cases if c.get("expertConfirmedCondition")}
        advisories = [a for a in self.advisories if a["crop"] == plot.get("crop") or a["conditionId"] in conditions]
        return {
            "plot": plot, "cropSeason": season, "farmer": farmer,
            "cases": cases, "clusters": clusters, "clusterScores": scores,
            "advisories": advisories,
            "honestyNote": "Twin derived live from the demo case store — a transparent aggregate, not a predictive model.",
            "provenance": "SIMULATED",
        }


class AdvisoryRejected(Exception):
    """Domain-level rejection with a machine-readable safety code."""

    def __init__(self, code: str, detail: str) -> None:
        super().__init__(detail)
        self.code = code
        self.detail = detail


class MissionConflict(Exception):
    pass
