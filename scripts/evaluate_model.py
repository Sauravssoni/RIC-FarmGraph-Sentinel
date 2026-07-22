#!/usr/bin/env python3
"""Leakage-safe evaluation contract for future Rajasthan crop-health models.

This tool does not train a model and does not manufacture an accuracy claim. It
validates an expert-labelled prediction manifest and reports end-to-end metrics
that count abstentions as missed detections, alongside selective metrics for the
subset on which the model chose to predict.
"""

from __future__ import annotations

import argparse
import json
import math
import random
import statistics
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Iterable

REQUIRED_FIELDS = {
    "sample_id",
    "source_group",
    "split",
    "crop",
    "district",
    "y_true",
    "y_pred",
    "confidence",
    "abstained",
    "provenance",
}
FIELD_PROVENANCE = "FIELD_EXPERT_VERIFIED"


def load_jsonl(path: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as handle:
        for line_number, raw in enumerate(handle, 1):
            raw = raw.strip()
            if not raw:
                continue
            try:
                row = json.loads(raw)
            except json.JSONDecodeError as exc:
                raise ValueError(f"{path}:{line_number}: invalid JSON: {exc}") from exc
            missing = REQUIRED_FIELDS.difference(row)
            if missing:
                raise ValueError(f"{path}:{line_number}: missing fields {sorted(missing)}")
            if not isinstance(row["abstained"], bool):
                raise ValueError(f"{path}:{line_number}: abstained must be boolean")
            confidence = float(row["confidence"])
            if not 0.0 <= confidence <= 1.0:
                raise ValueError(f"{path}:{line_number}: confidence must be in [0, 1]")
            row["confidence"] = confidence
            rows.append(row)
    if not rows:
        raise ValueError(f"{path}: no records")
    return rows


def validate_contract(rows: list[dict[str, Any]]) -> dict[str, Any]:
    sample_ids = [str(row["sample_id"]) for row in rows]
    duplicates = sorted(sample_id for sample_id, count in Counter(sample_ids).items() if count > 1)
    if duplicates:
        raise ValueError(f"duplicate sample_id values: {duplicates[:10]}")

    group_splits: dict[str, set[str]] = defaultdict(set)
    for row in rows:
        group_splits[str(row["source_group"])].add(str(row["split"]))
    leaking_groups = sorted(group for group, splits in group_splits.items() if len(splits) > 1)
    if leaking_groups:
        raise ValueError(
            "source-group leakage across splits: "
            + ", ".join(f"{group}={sorted(group_splits[group])}" for group in leaking_groups[:10])
        )

    return {
        "records": len(rows),
        "unique_samples": len(sample_ids),
        "unique_source_groups": len(group_splits),
        "leakage_free": True,
        "splits": dict(sorted(Counter(str(row["split"]) for row in rows).items())),
        "provenance": dict(sorted(Counter(str(row["provenance"]) for row in rows).items())),
    }


def safe_div(numerator: float, denominator: float) -> float:
    return numerator / denominator if denominator else 0.0


def class_metrics(rows: list[dict[str, Any]], labels: list[str]) -> dict[str, dict[str, float | int]]:
    metrics: dict[str, dict[str, float | int]] = {}
    for label in labels:
        true_count = sum(row["y_true"] == label for row in rows)
        predicted_count = sum((not row["abstained"]) and row["y_pred"] == label for row in rows)
        true_positive = sum(
            (not row["abstained"]) and row["y_true"] == label and row["y_pred"] == label for row in rows
        )
        false_positive = predicted_count - true_positive
        false_negative = true_count - true_positive  # abstentions count as missed detections
        precision = safe_div(true_positive, true_positive + false_positive)
        recall = safe_div(true_positive, true_positive + false_negative)
        f1 = safe_div(2 * precision * recall, precision + recall)
        metrics[label] = {
            "support": true_count,
            "predicted": predicted_count,
            "true_positive": true_positive,
            "false_positive": false_positive,
            "false_negative_including_abstentions": false_negative,
            "precision": round(precision, 6),
            "recall_end_to_end": round(recall, 6),
            "f1_end_to_end": round(f1, 6),
        }
    return metrics


def expected_calibration_error(rows: list[dict[str, Any]], bins: int = 10) -> float:
    predicted = [row for row in rows if not row["abstained"]]
    if not predicted:
        return 0.0
    total = len(predicted)
    ece = 0.0
    for index in range(bins):
        low = index / bins
        high = (index + 1) / bins
        bucket = [
            row
            for row in predicted
            if (low <= row["confidence"] < high) or (index == bins - 1 and row["confidence"] == 1.0)
        ]
        if not bucket:
            continue
        accuracy = statistics.fmean(row["y_true"] == row["y_pred"] for row in bucket)
        confidence = statistics.fmean(float(row["confidence"]) for row in bucket)
        ece += (len(bucket) / total) * abs(accuracy - confidence)
    return ece


def score_rows(rows: list[dict[str, Any]], high_spread_labels: set[str]) -> dict[str, Any]:
    if not rows:
        raise ValueError("selected split contains no records")
    labels = sorted({str(row["y_true"]) for row in rows})
    per_class = class_metrics(rows, labels)
    predicted = [row for row in rows if not row["abstained"]]
    correct = sum(row["y_true"] == row["y_pred"] for row in predicted)
    coverage = safe_div(len(predicted), len(rows))
    selective_accuracy = safe_div(correct, len(predicted))
    end_to_end_accuracy = safe_div(correct, len(rows))
    macro_f1 = statistics.fmean(float(per_class[label]["f1_end_to_end"]) for label in labels)
    macro_recall = statistics.fmean(float(per_class[label]["recall_end_to_end"]) for label in labels)

    priority_rows = [row for row in rows if row["y_true"] in high_spread_labels]
    priority_correct = sum(
        (not row["abstained"]) and row["y_pred"] == row["y_true"] for row in priority_rows
    )
    priority_recall = safe_div(priority_correct, len(priority_rows))

    brier = statistics.fmean(
        (float(row["confidence"]) - float(row["y_true"] == row["y_pred"])) ** 2 for row in predicted
    ) if predicted else 0.0

    confusion: dict[str, dict[str, int]] = {
        label: {predicted_label: 0 for predicted_label in labels + ["__ABSTAIN__"]} for label in labels
    }
    for row in rows:
        predicted_label = "__ABSTAIN__" if row["abstained"] else str(row["y_pred"])
        if predicted_label not in confusion[str(row["y_true"])]:
            for label in labels:
                confusion[label][predicted_label] = 0
        confusion[str(row["y_true"])][predicted_label] += 1

    return {
        "n": len(rows),
        "labels": labels,
        "coverage": round(coverage, 6),
        "abstention_rate": round(1 - coverage, 6),
        "selective_accuracy": round(selective_accuracy, 6),
        "end_to_end_accuracy": round(end_to_end_accuracy, 6),
        "macro_f1_end_to_end": round(macro_f1, 6),
        "macro_recall_end_to_end": round(macro_recall, 6),
        "priority_high_spread_recall": round(priority_recall, 6),
        "priority_high_spread_support": len(priority_rows),
        "expected_calibration_error": round(expected_calibration_error(rows), 6),
        "brier_score_predicted_subset": round(brier, 6),
        "per_class": per_class,
        "confusion_matrix": confusion,
    }


def subgroup_metrics(rows: list[dict[str, Any]], field: str) -> dict[str, Any]:
    groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        groups[str(row[field])].append(row)
    result: dict[str, Any] = {}
    for name, group in sorted(groups.items()):
        predicted = [row for row in group if not row["abstained"]]
        correct = sum(row["y_true"] == row["y_pred"] for row in predicted)
        result[name] = {
            "n": len(group),
            "coverage": round(safe_div(len(predicted), len(group)), 6),
            "end_to_end_accuracy": round(safe_div(correct, len(group)), 6),
        }
    return result


def percentile(values: list[float], quantile: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    position = (len(ordered) - 1) * quantile
    lower = math.floor(position)
    upper = math.ceil(position)
    if lower == upper:
        return ordered[lower]
    fraction = position - lower
    return ordered[lower] * (1 - fraction) + ordered[upper] * fraction


def bootstrap_intervals(
    rows: list[dict[str, Any]], high_spread_labels: set[str], iterations: int, seed: int
) -> dict[str, dict[str, float]]:
    rng = random.Random(seed)
    samples: dict[str, list[float]] = defaultdict(list)
    for _ in range(iterations):
        resample = [rows[rng.randrange(len(rows))] for _ in rows]
        score = score_rows(resample, high_spread_labels)
        for key in ("coverage", "macro_f1_end_to_end", "priority_high_spread_recall"):
            samples[key].append(float(score[key]))
    return {
        key: {
            "low_95": round(percentile(values, 0.025), 6),
            "high_95": round(percentile(values, 0.975), 6),
        }
        for key, values in samples.items()
    }


def evaluate(
    rows: list[dict[str, Any]], split: str, high_spread_labels: set[str], bootstrap: int, seed: int
) -> dict[str, Any]:
    contract = validate_contract(rows)
    selected = [row for row in rows if str(row["split"]) == split]
    score = score_rows(selected, high_spread_labels)
    field_evidence = bool(selected) and all(row["provenance"] == FIELD_PROVENANCE for row in selected)
    report = {
        "schema_version": "farmgraph-model-evaluation-v1",
        "contract": contract,
        "evaluation_split": split,
        "evidence": {
            "field_expert_verified_only": field_evidence,
            "claim_allowed": field_evidence,
            "claim_note": (
                "Metrics may be cited only with dataset version, class supports and confidence intervals."
                if field_evidence
                else "Synthetic/non-field evidence: metrics are pipeline checks only and must not be cited as model accuracy."
            ),
        },
        "metrics": score,
        "subgroups": {
            "crop": subgroup_metrics(selected, "crop"),
            "district": subgroup_metrics(selected, "district"),
        },
        "bootstrap_95": bootstrap_intervals(selected, high_spread_labels, bootstrap, seed),
        "high_spread_labels": sorted(high_spread_labels),
    }
    return report


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path, help="JSONL prediction manifest")
    parser.add_argument("--output", required=True, type=Path, help="JSON report path")
    parser.add_argument("--split", default="test")
    parser.add_argument("--high-spread-labels", default="downy_mildew")
    parser.add_argument("--bootstrap", type=int, default=500)
    parser.add_argument("--seed", type=int, default=2026)
    parser.add_argument("--require-field-provenance", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.bootstrap < 20:
        raise ValueError("bootstrap iterations must be at least 20")
    rows = load_jsonl(args.input)
    labels = {label.strip() for label in args.high_spread_labels.split(",") if label.strip()}
    report = evaluate(rows, args.split, labels, args.bootstrap, args.seed)
    if args.require_field_provenance and not report["evidence"]["field_expert_verified_only"]:
        raise ValueError("field promotion gate requires FIELD_EXPERT_VERIFIED provenance for every evaluated row")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps({
        "output": str(args.output),
        "records": report["metrics"]["n"],
        "macro_f1_end_to_end": report["metrics"]["macro_f1_end_to_end"],
        "coverage": report["metrics"]["coverage"],
        "claim_allowed": report["evidence"]["claim_allowed"],
    }, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
