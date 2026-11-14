from collections.abc import Sequence
from typing import Any, Literal

from pydantic import BaseModel, Field

from acms_ai.training.config import EvaluationSettings
from acms_ai.training.labels import ModerationLabel
from acms_ai.training.metrics import safe_ratio
from acms_ai.training.scoring import LabelScores

PolicyOutcome = Literal["accepted", "question_review", "uncertain"]
THRESHOLD_DECIMALS = 4


class Thresholds(BaseModel):
    valid: float = Field(ge=0.0, le=1.0)
    invalid: float = Field(ge=0.0, le=1.0)

    @classmethod
    def defaults(cls, settings: EvaluationSettings) -> "Thresholds":
        return cls(
            valid=settings.default_valid_threshold, invalid=settings.default_invalid_threshold
        )

    def for_label(self, label: ModerationLabel) -> float:
        return self.valid if label == ModerationLabel.VALID else self.invalid


def policy_outcome(score: LabelScores, thresholds: Thresholds) -> PolicyOutcome:
    if score.predicted == ModerationLabel.QUESTION:
        return "question_review"
    if score.confidence >= thresholds.for_label(score.predicted):
        return "accepted"
    return "uncertain"


def class_acceptance(
    gold: Sequence[ModerationLabel],
    scores: Sequence[LabelScores],
    label: ModerationLabel,
    threshold: float,
) -> dict[str, float]:
    accepted = [
        expected
        for expected, score in zip(gold, scores, strict=True)
        if score.predicted == label and score.confidence >= threshold
    ]
    correct = sum(1 for expected in accepted if expected == label)
    return {
        "threshold": threshold,
        "accepted": len(accepted),
        "correct": correct,
        "precision": safe_ratio(correct, len(accepted)),
        "recall": safe_ratio(correct, sum(1 for expected in gold if expected == label)),
        "coverage": safe_ratio(len(accepted), len(gold)),
    }


def policy_metrics(
    gold: Sequence[ModerationLabel], scores: Sequence[LabelScores], thresholds: Thresholds
) -> dict[str, Any]:
    outcomes = [policy_outcome(score, thresholds) for score in scores]
    question_reviews = outcomes.count("question_review")
    uncertain = outcomes.count("uncertain")
    return {
        "thresholds": thresholds.model_dump(),
        "per_class": {
            label.value: class_acceptance(gold, scores, label, thresholds.for_label(label))
            for label in (ModerationLabel.VALID, ModerationLabel.INVALID)
        },
        "question_reviews": question_reviews,
        "uncertain": uncertain,
        "uncertain_rate": safe_ratio(uncertain, len(scores) - question_reviews),
    }


def threshold_grid(settings: EvaluationSettings) -> list[float]:
    steps = int((1.0 - settings.threshold_grid_min) / settings.threshold_grid_step)
    return [
        round(settings.threshold_grid_min + step * settings.threshold_grid_step, THRESHOLD_DECIMALS)
        for step in range(steps)
    ]


def tune_thresholds(
    gold: Sequence[ModerationLabel], scores: Sequence[LabelScores], settings: EvaluationSettings
) -> tuple[Thresholds, dict[str, Any]]:
    targets = {
        ModerationLabel.VALID: (settings.valid_target_precision, settings.default_valid_threshold),
        ModerationLabel.INVALID: (
            settings.invalid_target_precision,
            settings.default_invalid_threshold,
        ),
    }
    chosen: dict[str, float] = {}
    tuning: dict[str, Any] = {}
    for label, (target_precision, default_threshold) in targets.items():
        curve = [class_acceptance(gold, scores, label, t) for t in threshold_grid(settings)]
        meeting = [
            point
            for point in curve
            if point["accepted"] >= settings.min_accepted and point["precision"] >= target_precision
        ]
        chosen[label.value] = meeting[0]["threshold"] if meeting else default_threshold
        tuning[label.value] = {
            "target_precision": target_precision,
            "min_accepted": settings.min_accepted,
            "met_target": bool(meeting),
            "fallback_to_default": not meeting,
            "curve": curve,
        }
    return Thresholds.model_validate(chosen), tuning
