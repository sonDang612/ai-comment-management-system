from collections.abc import Sequence
from typing import Any, Literal

from pydantic import BaseModel, Field

from acms_ai.training.config import EvaluationSettings
from acms_ai.training.dataset import LabeledComment
from acms_ai.training.labels import ModerationLabel, is_question
from acms_ai.training.metrics import safe_ratio
from acms_ai.training.scoring import CommentScores

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


def policy_outcome(score: CommentScores, thresholds: Thresholds) -> PolicyOutcome:
    if score.is_question:
        return "question_review"
    if score.confidence >= thresholds.for_label(score.predicted):
        return "accepted"
    return "uncertain"


def gold_is_question(record: LabeledComment) -> bool:
    return is_question(record.label, record.category)


def class_acceptance(
    records: Sequence[LabeledComment],
    scores: Sequence[CommentScores],
    label: ModerationLabel,
    threshold: float,
) -> dict[str, float]:
    accepted = [
        record
        for record, score in zip(records, scores, strict=True)
        if not score.is_question and score.predicted == label and score.confidence >= threshold
    ]
    correct = sum(1 for record in accepted if record.label == label)
    relevant = sum(
        1 for record in records if record.label == label and not gold_is_question(record)
    )
    return {
        "threshold": threshold,
        "accepted": len(accepted),
        "correct": correct,
        "precision": safe_ratio(correct, len(accepted)),
        "recall": safe_ratio(correct, relevant),
        "coverage": safe_ratio(len(accepted), len(records)),
    }


def policy_metrics(
    records: Sequence[LabeledComment], scores: Sequence[CommentScores], thresholds: Thresholds
) -> dict[str, Any]:
    outcomes = [policy_outcome(score, thresholds) for score in scores]
    question_reviews = outcomes.count("question_review")
    uncertain = outcomes.count("uncertain")
    return {
        "thresholds": thresholds.model_dump(),
        "per_class": {
            label.value: class_acceptance(records, scores, label, thresholds.for_label(label))
            for label in ModerationLabel
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
    records: Sequence[LabeledComment],
    scores: Sequence[CommentScores],
    settings: EvaluationSettings,
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
        curve = [class_acceptance(records, scores, label, t) for t in threshold_grid(settings)]
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
