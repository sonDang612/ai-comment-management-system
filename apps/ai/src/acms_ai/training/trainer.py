import logging
from collections.abc import Sequence
from importlib.metadata import PackageNotFoundError, version
from typing import Any

from acms_ai.training.artifacts import utc_timestamp, write_json
from acms_ai.training.config import FineTuneConfig
from acms_ai.training.dataset import LabeledComment
from acms_ai.training.errors import TrainingConfigError
from acms_ai.training.labels import CATEGORIES, CATEGORY_SLICE, LABEL_SLICE, LABELS, OUTPUT_NAMES
from acms_ai.training.metrics import classification_metrics
from acms_ai.training.model_loading import load_base_classifier, load_tokenizer, resolve_precision
from acms_ai.training.run import RunDirectory
from acms_ai.training.splitting import SplitDirectory

logger = logging.getLogger(__name__)

RECORDED_PACKAGES = ("torch", "transformers", "accelerate")
BEST_MODEL_METRIC = "macro_f1"
HEAD_COUNT = 2


def package_versions() -> dict[str, str | None]:
    versions: dict[str, str | None] = {}
    for package in RECORDED_PACKAGES:
        try:
            versions[package] = version(package)
        except PackageNotFoundError:
            versions[package] = None
    return versions


def parameter_counts(model: Any) -> dict[str, int]:
    trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
    total = sum(p.numel() for p in model.parameters())
    return {"trainable": trainable, "total": total}


def ensure_output_available(run: RunDirectory, *, force: bool, resume: bool) -> None:
    if resume and not run.checkpoints_dir.is_dir():
        raise TrainingConfigError(f"No checkpoints to resume from in {run.checkpoints_dir}")
    if run.model_dir.exists() and not (force or resume):
        raise TrainingConfigError(
            f"{run.path} already holds a trained model; choose another output_dir, "
            "or pass --force to replace it"
        )


def encode_records(
    tokenizer: Any, records: Sequence[LabeledComment], max_length: int
) -> list[dict[str, Any]]:
    label_ids = {label: index for index, label in enumerate(LABELS)}
    category_ids = {category: index for index, category in enumerate(CATEGORIES)}
    encoded = tokenizer(
        [record.content for record in records], truncation=True, max_length=max_length
    )
    return [
        {key: values[row] for key, values in encoded.items()}
        | {"labels": [label_ids[record.label], category_ids[record.category]]}
        for row, record in enumerate(records)
    ]


def two_head_loss(outputs: Any, labels: Any, num_items_in_batch: Any = None) -> Any:
    from torch.nn.functional import cross_entropy

    logits = outputs["logits"].float()
    label_loss = cross_entropy(logits[:, LABEL_SLICE], labels[:, 0], reduction="sum")
    category_loss = cross_entropy(logits[:, CATEGORY_SLICE], labels[:, 1], reduction="sum")
    divisor = num_items_in_batch if num_items_in_batch is not None else labels.shape[0] * HEAD_COUNT
    return (label_loss + category_loss) / divisor


def head_metrics(prediction: Any) -> dict[str, float]:
    logits = prediction.predictions
    gold = prediction.label_ids
    gold_labels = [LABELS[index] for index in gold[:, 0].tolist()]
    gold_categories = [CATEGORIES[index] for index in gold[:, 1].tolist()]
    predicted_labels = [LABELS[i] for i in logits[:, LABEL_SLICE].argmax(axis=-1).tolist()]
    predicted_categories = [
        CATEGORIES[i] for i in logits[:, CATEGORY_SLICE].argmax(axis=-1).tolist()
    ]
    label = classification_metrics(gold_labels, predicted_labels, LABELS)
    category = classification_metrics(gold_categories, predicted_categories, CATEGORIES)
    return {
        "label_accuracy": label["accuracy"],
        "label_macro_f1": label["macro_f1"],
        "category_accuracy": category["accuracy"],
        "category_macro_f1": category["macro_f1"],
        BEST_MODEL_METRIC: (label["macro_f1"] + category["macro_f1"]) / HEAD_COUNT,
    }


def train(config: FineTuneConfig, *, force: bool = False, resume: bool = False) -> RunDirectory:
    from transformers import (
        DataCollatorWithPadding,
        EarlyStoppingCallback,
        Trainer,
        TrainingArguments,
        set_seed,
    )

    settings = config.training
    run = RunDirectory(settings.output_dir)
    ensure_output_available(run, force=force, resume=resume)

    split_dir = SplitDirectory(config.data.split_dir)
    split_dir.verify()
    train_records = split_dir.load("train")
    validation_records = split_dir.load("validation")

    set_seed(settings.seed)
    precision = resolve_precision(config.model)
    tokenizer = load_tokenizer(config.model)
    tokenizer.model_max_length = settings.max_seq_length
    train_dataset = encode_records(tokenizer, train_records, settings.max_seq_length)
    validation_dataset = encode_records(tokenizer, validation_records, settings.max_seq_length)

    model = load_base_classifier(config.model)
    counts = parameter_counts(model)
    logger.info("Trainable parameters: %d of %d", counts["trainable"], counts["total"])

    arguments = TrainingArguments(
        output_dir=str(run.checkpoints_dir),
        per_device_train_batch_size=settings.batch_size,
        per_device_eval_batch_size=config.evaluation.batch_size,
        gradient_accumulation_steps=settings.gradient_accumulation_steps,
        learning_rate=settings.learning_rate,
        num_train_epochs=settings.epochs,
        warmup_steps=settings.warmup_ratio,
        weight_decay=settings.weight_decay,
        lr_scheduler_type=settings.lr_scheduler,
        max_grad_norm=settings.max_grad_norm,
        logging_steps=settings.logging_steps,
        eval_strategy="steps",
        eval_steps=settings.eval_steps,
        save_strategy="steps",
        save_steps=settings.eval_steps,
        save_total_limit=settings.save_total_limit,
        load_best_model_at_end=True,
        metric_for_best_model=BEST_MODEL_METRIC,
        greater_is_better=True,
        bf16=precision == "bf16",
        fp16=precision == "fp16",
        seed=settings.seed,
        data_seed=settings.seed,
        report_to="none",
    )
    callbacks = (
        [EarlyStoppingCallback(early_stopping_patience=settings.early_stopping_patience)]
        if settings.early_stopping_patience
        else []
    )
    trainer = Trainer(
        model=model,
        args=arguments,
        train_dataset=train_dataset,
        eval_dataset=validation_dataset,
        processing_class=tokenizer,
        data_collator=DataCollatorWithPadding(tokenizer),
        compute_metrics=head_metrics,
        compute_loss_func=two_head_loss,
        callbacks=callbacks,
    )
    train_result = trainer.train(resume_from_checkpoint=True if resume else None)
    validation_metrics = trainer.evaluate()

    trainer.save_model(str(run.model_dir))
    tokenizer.save_pretrained(str(run.model_dir))
    write_json(
        run.training_record_path,
        {
            "created_at": utc_timestamp(),
            "config": config.model_dump(mode="json"),
            "precision": precision,
            "outputs": list(OUTPUT_NAMES),
            "base_model": {
                "name": config.model.base_model,
                "revision": config.model.revision,
                "commit": getattr(model.config, "_commit_hash", None),
            },
            "split": {
                "dir": str(split_dir.path),
                "manifest_sha256": split_dir.fingerprint,
                "label_counts": split_dir.manifest["label_counts"],
            },
            "parameters": counts,
            "best_checkpoint": trainer.state.best_model_checkpoint,
            "train_metrics": train_result.metrics,
            "validation_metrics": validation_metrics,
            "model_dir": run.model_dir.name,
            "model_sha256": run.model_fingerprint(),
            "package_versions": package_versions(),
        },
    )
    logger.info("Saved the classifier to %s", run.model_dir)
    return run
