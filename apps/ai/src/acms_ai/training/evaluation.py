import logging
from collections.abc import Mapping, Sequence
from pathlib import Path
from typing import Any

from acms_ai.training.artifacts import read_json, utc_timestamp, write_json
from acms_ai.training.config import EvaluationSettings, FineTuneConfig
from acms_ai.training.dataset import LabeledComment
from acms_ai.training.errors import ArtifactMismatchError, TrainingConfigError
from acms_ai.training.labels import CATEGORIES, LABELS, ModerationLabel
from acms_ai.training.metrics import binary_metrics, classification_metrics
from acms_ai.training.run import RunDirectory
from acms_ai.training.scoring import ClassifierScorer, CommentScores
from acms_ai.training.splitting import SplitName
from acms_ai.training.thresholds import (
    Thresholds,
    gold_is_question,
    policy_metrics,
    policy_outcome,
    tune_thresholds,
)

logger = logging.getLogger(__name__)

TUNING_SPLIT: SplitName = "validation"


def score_split(
    run: RunDirectory, config: FineTuneConfig, split: SplitName
) -> tuple[list[LabeledComment], list[CommentScores]]:
    records = run.split_directory(config).load(split)
    logger.info("Scoring %d %s records", len(records), split)
    scorer = ClassifierScorer(run, config)
    scores = scorer.score([record.content for record in records], config.evaluation.batch_size)
    return records, scores


def target_check(value: float, target: float, *, at_most: bool = False) -> dict[str, Any]:
    passed = value <= target if at_most else value >= target
    return {"value": value, "target": target, "passed": passed}


def build_report(
    records: Sequence[LabeledComment],
    scores: Sequence[CommentScores],
    thresholds: Thresholds,
    settings: EvaluationSettings,
) -> dict[str, Any]:
    policy = policy_metrics(records, scores, thresholds)
    question = binary_metrics(
        [gold_is_question(record) for record in records],
        [score.is_question for score in scores],
    )
    return {
        "records": len(records),
        "classification": {
            "label": classification_metrics(
                [record.label for record in records], [score.predicted for score in scores], LABELS
            ),
            "category": classification_metrics(
                [record.category for record in records],
                [score.category for score in scores],
                CATEGORIES,
            ),
        },
        "is_invalid": binary_metrics(
            [record.label == ModerationLabel.INVALID for record in records],
            [score.predicted == ModerationLabel.INVALID for score in scores],
        ),
        "is_question": question,
        "threshold_policy": policy,
        "acceptance": {
            "invalid_precision_at_threshold": target_check(
                policy["per_class"][ModerationLabel.INVALID.value]["precision"],
                settings.invalid_target_precision,
            ),
            "question_precision": target_check(
                question["precision"], settings.question_target_precision
            ),
            "question_recall": target_check(question["recall"], settings.question_target_recall),
            "uncertain_rate": target_check(
                policy["uncertain_rate"], settings.max_uncertain_rate, at_most=True
            ),
        },
    }


def write_predictions(
    path: Path,
    records: Sequence[LabeledComment],
    scores: Sequence[CommentScores],
    thresholds: Thresholds,
) -> None:
    rows = []
    for record, score in zip(records, scores, strict=True):
        rows.append(
            {
                "comment_id": record.comment_id,
                "site_code": record.site_code,
                "gold": {"label": record.label.value, "category": record.category.value},
                "predicted": {"label": score.predicted.value, "category": score.category.value},
                "is_valid": score.predicted == ModerationLabel.VALID,
                "is_question": score.is_question,
                "confidence": score.confidence,
                "category_confidence": score.category_confidence,
                "outcome": policy_outcome(score, thresholds),
                "probabilities": {
                    "label": {label.value: p for label, p in score.label_probabilities.items()},
                    "category": {
                        category.value: p for category, p in score.category_probabilities.items()
                    },
                },
            }
        )
    write_json(path, rows)


def tune(run: RunDirectory, evaluation_overrides: Mapping[str, Any]) -> dict[str, Any]:
    config = run.load_config(evaluation_overrides)
    records, scores = score_split(run, config, TUNING_SPLIT)
    thresholds, tuning = tune_thresholds(records, scores, config.evaluation)
    payload = {
        "tuned_at": utc_timestamp(),
        "split": TUNING_SPLIT,
        "split_manifest_sha256": run.training_record["split"]["manifest_sha256"],
        "model_sha256": run.model_fingerprint(),
        "thresholds": thresholds.model_dump(),
        "evaluation_settings": config.evaluation.model_dump(),
        "tuning": tuning,
        "validation_report": build_report(records, scores, thresholds, config.evaluation),
    }
    write_json(run.thresholds_path, payload)
    write_predictions(
        run.evaluation_dir / f"{TUNING_SPLIT}_predictions.json", records, scores, thresholds
    )
    logger.info("Saved thresholds to %s: %s", run.thresholds_path, payload["thresholds"])
    return payload


def load_tuned_thresholds(run: RunDirectory, path: Path) -> Thresholds:
    if not path.is_file():
        raise TrainingConfigError(
            f"No thresholds file at {path}; run tune-thresholds on the validation split first"
        )
    payload = read_json(path)
    if payload.get("split") != TUNING_SPLIT:
        raise ArtifactMismatchError("Thresholds must be tuned on the validation split")
    if payload.get("split_manifest_sha256") != run.training_record["split"]["manifest_sha256"]:
        raise ArtifactMismatchError("The thresholds were tuned on another dataset split")
    if payload.get("model_sha256") != run.model_fingerprint():
        raise ArtifactMismatchError("The thresholds were tuned for another model")
    return Thresholds.model_validate(payload["thresholds"])


def evaluate(
    run: RunDirectory,
    split: SplitName,
    *,
    thresholds_path: Path | None,
    force: bool,
    evaluation_overrides: Mapping[str, Any],
) -> dict[str, Any]:
    if split == "train":
        raise TrainingConfigError("Evaluate on the validation or test split, not on train")
    config = run.load_config(evaluation_overrides)
    report_path = run.evaluation_dir / f"{split}_report.json"
    if split == "test" and report_path.exists() and not force:
        raise TrainingConfigError(
            f"The test split was already evaluated ({report_path}). Re-running it invites "
            "tuning against the test set; pass --force only if that is intended"
        )

    resolved_path = thresholds_path or run.thresholds_path
    if split == "test" or resolved_path.is_file():
        thresholds = load_tuned_thresholds(run, resolved_path)
    else:
        thresholds = Thresholds.defaults(config.evaluation)

    records, scores = score_split(run, config, split)
    report = {
        "evaluated_at": utc_timestamp(),
        "split": split,
        "model_sha256": run.model_fingerprint(),
        "split_manifest_sha256": run.training_record["split"]["manifest_sha256"],
        **build_report(records, scores, thresholds, config.evaluation),
    }
    write_json(report_path, report)
    write_predictions(run.evaluation_dir / f"{split}_predictions.json", records, scores, thresholds)
    logger.info("Saved %s report to %s", split, report_path)
    return report
