import argparse
import json
import logging
from collections.abc import Sequence
from pathlib import Path
from typing import Any

from pydantic import ValidationError

from acms_ai.core.errors import AppError
from acms_ai.core.logging import configure_logging
from acms_ai.training.errors import TrainingConfigError
from acms_ai.training.splitting import SPLIT_NAMES, SplitRatios

logger = logging.getLogger("acms_ai.training")

TRAINING_OVERRIDE_FLAGS: dict[str, str] = {
    "base_model": "model.base_model",
    "precision": "model.precision",
    "batch_size": "training.batch_size",
    "gradient_accumulation_steps": "training.gradient_accumulation_steps",
    "learning_rate": "training.learning_rate",
    "epochs": "training.epochs",
    "max_seq_length": "training.max_seq_length",
    "output_dir": "training.output_dir",
    "seed": "training.seed",
    "split_dir": "data.split_dir",
}
EVALUATION_OVERRIDE_FLAGS: tuple[str, ...] = (
    "batch_size",
    "valid_target_precision",
    "invalid_target_precision",
    "min_accepted",
)


def run_split(args: argparse.Namespace) -> None:
    from acms_ai.training.splitting import create_splits

    try:
        ratios = SplitRatios(
            train=args.train_ratio, validation=args.validation_ratio, test=args.test_ratio
        )
    except ValidationError as exc:
        raise TrainingConfigError(details=[e["msg"] for e in exc.errors()]) from exc
    manifest = create_splits(
        args.input,
        args.output_dir,
        ratios,
        seed=args.seed,
        skip_invalid=args.skip_invalid,
        force=args.force,
    )
    print(
        json.dumps(
            {"deduplication": manifest["deduplication"], "label_counts": manifest["label_counts"]},
            ensure_ascii=False,
            indent=2,
        )
    )


def run_train(args: argparse.Namespace) -> None:
    from acms_ai.training.config import load_config
    from acms_ai.training.trainer import train

    overrides = {path: getattr(args, flag) for flag, path in TRAINING_OVERRIDE_FLAGS.items()}
    run = train(load_config(args.config, overrides), force=args.force, resume=args.resume)
    print(f"Model saved to {run.model_dir}")


def evaluation_overrides(args: argparse.Namespace) -> dict[str, Any]:
    return {flag: getattr(args, flag) for flag in EVALUATION_OVERRIDE_FLAGS}


def run_tune(args: argparse.Namespace) -> None:
    from acms_ai.training.evaluation import tune
    from acms_ai.training.reporting import format_report
    from acms_ai.training.run import RunDirectory

    payload = tune(RunDirectory(args.run_dir), evaluation_overrides(args))
    print(format_report(payload["validation_report"]))


def run_evaluate(args: argparse.Namespace) -> None:
    from acms_ai.training.evaluation import evaluate
    from acms_ai.training.reporting import format_report
    from acms_ai.training.run import RunDirectory

    report = evaluate(
        RunDirectory(args.run_dir),
        args.split,
        thresholds_path=args.thresholds,
        force=args.force,
        evaluation_overrides=evaluation_overrides(args),
    )
    print(format_report(report))


def add_evaluation_flags(parser: argparse.ArgumentParser) -> None:
    parser.add_argument(
        "--run-dir", type=Path, required=True, help="training.output_dir of the run"
    )
    parser.add_argument("--batch-size", type=int, help="comments scored per forward batch")
    parser.add_argument("--valid-target-precision", type=float)
    parser.add_argument("--invalid-target-precision", type=float)
    parser.add_argument("--min-accepted", type=int)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="python -m acms_ai.training",
        description="Fine-tuning of the comment moderation classifier",
    )
    parser.add_argument("--log-level", default="INFO")
    commands = parser.add_subparsers(dest="command", required=True)

    split = commands.add_parser("split", help="deduplicate and split labeled JSONL files")
    split.add_argument("--input", type=Path, action="append", required=True)
    split.add_argument("--output-dir", type=Path, required=True)
    split.add_argument("--seed", type=int, default=42)
    split.add_argument("--train-ratio", type=float, default=0.70)
    split.add_argument("--validation-ratio", type=float, default=0.15)
    split.add_argument("--test-ratio", type=float, default=0.15)
    split.add_argument("--skip-invalid", action="store_true", help="drop invalid lines")
    split.add_argument("--force", action="store_true", help="replace an existing split")
    split.set_defaults(handler=run_split)

    train = commands.add_parser("train", help="fine-tune the classifier on the train split")
    train.add_argument("--config", type=Path)
    train.add_argument("--base-model")
    train.add_argument("--precision", choices=["auto", "bf16", "fp16", "fp32"])
    train.add_argument("--batch-size", type=int)
    train.add_argument("--gradient-accumulation-steps", type=int)
    train.add_argument("--learning-rate", type=float)
    train.add_argument("--epochs", type=float)
    train.add_argument("--max-seq-length", type=int)
    train.add_argument("--output-dir", type=Path)
    train.add_argument("--seed", type=int)
    train.add_argument("--split-dir", type=Path)
    train.add_argument("--resume", action="store_true", help="resume from the last checkpoint")
    train.add_argument("--force", action="store_true", help="replace an existing model")
    train.set_defaults(handler=run_train)

    tune = commands.add_parser("tune-thresholds", help="tune thresholds on the validation split")
    add_evaluation_flags(tune)
    tune.set_defaults(handler=run_tune)

    evaluate = commands.add_parser("evaluate", help="evaluate the model on a held-out split")
    add_evaluation_flags(evaluate)
    evaluate.add_argument(
        "--split", choices=[n for n in SPLIT_NAMES if n != "train"], default="test"
    )
    evaluate.add_argument("--thresholds", type=Path, help="defaults to <run-dir>/thresholds.json")
    evaluate.add_argument("--force", action="store_true", help="re-run a finished test evaluation")
    evaluate.set_defaults(handler=run_evaluate)
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    configure_logging(args.log_level.upper())
    try:
        args.handler(args)
    except AppError as exc:
        logger.error("%s: %s", exc.code, exc.message)
        if exc.details:
            logger.error("Details: %s", json.dumps(exc.details, ensure_ascii=False, default=str))
        return 1
    return 0
