#!/usr/bin/env python3
"""Decide whether a model evaluation report may advance beyond CANDIDATE.

The gate is intentionally stricter than the report generator. Synthetic fixtures
must be rejected; field evidence must satisfy provenance, sample-support,
performance, calibration, coverage and subgroup-stability criteria.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--report", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--minimum-class-support", type=int, default=50)
    parser.add_argument("--minimum-macro-f1", type=float, default=0.80)
    parser.add_argument("--minimum-priority-recall", type=float, default=0.90)
    parser.add_argument("--maximum-ece", type=float, default=0.08)
    parser.add_argument("--minimum-coverage", type=float, default=0.60)
    parser.add_argument("--maximum-district-accuracy-gap", type=float, default=0.15)
    parser.add_argument(
        "--expect-reject",
        action="store_true",
        help="Return success only when the candidate is rejected (used by the synthetic CI fixture).",
    )
    return parser.parse_args()


def load(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def evaluate(report: dict[str, Any], args: argparse.Namespace) -> dict[str, Any]:
    contract = report["contract"]
    evidence = report["evidence"]
    metrics = report["metrics"]
    per_class = metrics["per_class"]
    districts = report["subgroups"]["district"]

    supports = {label: int(values["support"]) for label, values in per_class.items()}
    district_accuracies = [float(values["end_to_end_accuracy"]) for values in districts.values()]
    district_gap = max(district_accuracies) - min(district_accuracies) if district_accuracies else 1.0

    checks = {
        "leakage_free": bool(contract.get("leakage_free")),
        "field_expert_verified_only": bool(evidence.get("field_expert_verified_only")),
        "minimum_class_support": bool(supports) and all(
            support >= args.minimum_class_support for support in supports.values()
        ),
        "macro_f1_end_to_end": float(metrics["macro_f1_end_to_end"]) >= args.minimum_macro_f1,
        "priority_high_spread_recall": (
            int(metrics["priority_high_spread_support"]) >= args.minimum_class_support
            and float(metrics["priority_high_spread_recall"]) >= args.minimum_priority_recall
        ),
        "expected_calibration_error": float(metrics["expected_calibration_error"]) <= args.maximum_ece,
        "coverage": float(metrics["coverage"]) >= args.minimum_coverage,
        "district_stability": district_gap <= args.maximum_district_accuracy_gap,
    }

    passed = all(checks.values())
    failed = [name for name, value in checks.items() if not value]
    return {
        "schema_version": "farmgraph-model-promotion-v1",
        "decision": "PROMOTE_TO_CHALLENGER" if passed else "REJECT_OR_REMAIN_CANDIDATE",
        "passed": passed,
        "checks": checks,
        "failed_checks": failed,
        "observed": {
            "class_support": supports,
            "macro_f1_end_to_end": metrics["macro_f1_end_to_end"],
            "priority_high_spread_recall": metrics["priority_high_spread_recall"],
            "priority_high_spread_support": metrics["priority_high_spread_support"],
            "expected_calibration_error": metrics["expected_calibration_error"],
            "coverage": metrics["coverage"],
            "district_accuracy_gap": round(district_gap, 6),
        },
        "thresholds": {
            "minimum_class_support": args.minimum_class_support,
            "minimum_macro_f1": args.minimum_macro_f1,
            "minimum_priority_recall": args.minimum_priority_recall,
            "maximum_ece": args.maximum_ece,
            "minimum_coverage": args.minimum_coverage,
            "maximum_district_accuracy_gap": args.maximum_district_accuracy_gap,
        },
        "claim_note": (
            "Promotion gate passed; retain dataset version, expert sign-off and full report with every claim."
            if passed
            else "No field-performance claim or model promotion is permitted."
        ),
    }


def main() -> int:
    args = parse_args()
    decision = evaluate(load(args.report), args)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(decision, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps({"decision": decision["decision"], "failed_checks": decision["failed_checks"]}))
    if args.expect_reject:
        return 0 if not decision["passed"] else 3
    return 0 if decision["passed"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
