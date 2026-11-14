from collections.abc import Hashable, Sequence
from typing import Any


def safe_ratio(numerator: float, denominator: float) -> float:
    return numerator / denominator if denominator else 0.0


def f1_score(precision: float, recall: float) -> float:
    return safe_ratio(2 * precision * recall, precision + recall)


def confusion_matrix(
    gold: Sequence[Hashable], predicted: Sequence[Hashable], labels: Sequence[Hashable]
) -> list[list[int]]:
    index = {label: position for position, label in enumerate(labels)}
    matrix = [[0] * len(labels) for _ in labels]
    for expected, actual in zip(gold, predicted, strict=True):
        matrix[index[expected]][index[actual]] += 1
    return matrix


def classification_metrics(
    gold: Sequence[Hashable], predicted: Sequence[Hashable], labels: Sequence[Hashable]
) -> dict[str, Any]:
    matrix = confusion_matrix(gold, predicted, labels)
    total = len(gold)
    per_class: dict[str, dict[str, float]] = {}
    for position, label in enumerate(labels):
        true_positive = matrix[position][position]
        support = sum(matrix[position])
        predicted_count = sum(row[position] for row in matrix)
        precision = safe_ratio(true_positive, predicted_count)
        recall = safe_ratio(true_positive, support)
        per_class[str(label)] = {
            "precision": precision,
            "recall": recall,
            "f1": f1_score(precision, recall),
            "support": support,
            "predicted": predicted_count,
        }
    classes = list(per_class.values())
    return {
        "total": total,
        "accuracy": safe_ratio(sum(matrix[i][i] for i in range(len(labels))), total),
        "macro_precision": safe_ratio(sum(c["precision"] for c in classes), len(classes)),
        "macro_recall": safe_ratio(sum(c["recall"] for c in classes), len(classes)),
        "macro_f1": safe_ratio(sum(c["f1"] for c in classes), len(classes)),
        "weighted_f1": safe_ratio(sum(c["f1"] * c["support"] for c in classes), total),
        "per_class": per_class,
        "confusion_matrix": {
            "labels": [str(label) for label in labels],
            "rows": "gold",
            "columns": "predicted",
            "matrix": matrix,
        },
    }


def binary_metrics(gold: Sequence[bool], predicted: Sequence[bool]) -> dict[str, float]:
    pairs = list(zip(gold, predicted, strict=True))
    true_positive = sum(1 for expected, actual in pairs if expected and actual)
    false_positive = sum(1 for expected, actual in pairs if not expected and actual)
    false_negative = sum(1 for expected, actual in pairs if expected and not actual)
    true_negative = len(pairs) - true_positive - false_positive - false_negative
    precision = safe_ratio(true_positive, true_positive + false_positive)
    recall = safe_ratio(true_positive, true_positive + false_negative)
    return {
        "true_positive": true_positive,
        "false_positive": false_positive,
        "false_negative": false_negative,
        "true_negative": true_negative,
        "precision": precision,
        "recall": recall,
        "f1": f1_score(precision, recall),
        "accuracy": safe_ratio(true_positive + true_negative, len(pairs)),
    }
