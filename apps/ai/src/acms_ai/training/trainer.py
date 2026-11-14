import logging
from importlib.metadata import PackageNotFoundError, version
from typing import Any

from acms_ai.training.artifacts import utc_timestamp, write_json
from acms_ai.training.config import FineTuneConfig, ResolvedPrecision
from acms_ai.training.errors import TrainingConfigError
from acms_ai.training.labels import LABELS
from acms_ai.training.model_loading import (
    load_frozen_base_model,
    load_tokenizer,
    resolve_precision,
)
from acms_ai.training.prompt import PROMPT_VERSION, PromptBuilder
from acms_ai.training.run import RunDirectory
from acms_ai.training.splitting import SplitDirectory

logger = logging.getLogger(__name__)

LORA_PARAMETER_MARKER = "lora_"
RECORDED_PACKAGES = ("torch", "transformers", "peft", "trl", "datasets", "accelerate")


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


def assert_only_adapters_trainable(model: Any) -> None:
    trainable = [name for name, p in model.named_parameters() if p.requires_grad]
    leaked = [name for name in trainable if LORA_PARAMETER_MARKER not in name]
    if not trainable or leaked:
        raise TrainingConfigError(
            "Only LoRA adapter weights may be trainable",
            details={"trainable_count": len(trainable), "non_adapter": leaked[:20]},
        )


def build_adapter_model(config: FineTuneConfig, precision: ResolvedPrecision) -> Any:
    from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training

    model = load_frozen_base_model(config.model, precision)
    model.config.use_cache = False
    if config.model.load_in_4bit:
        model = prepare_model_for_kbit_training(
            model,
            use_gradient_checkpointing=config.training.gradient_checkpointing,
            gradient_checkpointing_kwargs={"use_reentrant": False},
        )
    lora = config.lora
    adapter_model = get_peft_model(
        model,
        LoraConfig(
            r=lora.rank,
            lora_alpha=lora.alpha,
            lora_dropout=lora.dropout,
            target_modules=lora.target_modules,
            bias=lora.bias,
            task_type="CAUSAL_LM",
        ),
    )
    for parameter in adapter_model.parameters():
        if parameter.requires_grad:
            parameter.data = parameter.data.float()
    assert_only_adapters_trainable(adapter_model)
    return adapter_model


def ensure_output_available(run: RunDirectory, *, force: bool, resume: bool) -> None:
    if resume and not run.checkpoints_dir.is_dir():
        raise TrainingConfigError(f"No checkpoints to resume from in {run.checkpoints_dir}")
    if run.adapter_dir.exists() and not (force or resume):
        raise TrainingConfigError(
            f"{run.path} already holds a trained adapter; choose another output_dir, "
            "or pass --force to replace it"
        )


def train(config: FineTuneConfig, *, force: bool = False, resume: bool = False) -> RunDirectory:
    from datasets import Dataset
    from transformers import EarlyStoppingCallback, set_seed
    from trl import SFTConfig, SFTTrainer

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
    builder = PromptBuilder(tokenizer, settings.max_seq_length, settings.completion_reserve_tokens)
    builder.assert_label_alignment()
    train_dataset = Dataset.from_list([builder.example(record) for record in train_records])
    validation_dataset = Dataset.from_list(
        [builder.example(record) for record in validation_records]
    )

    model = build_adapter_model(config, precision)
    counts = parameter_counts(model)
    logger.info("Trainable parameters: %d of %d", counts["trainable"], counts["total"])

    sft_config = SFTConfig(
        output_dir=str(run.checkpoints_dir),
        per_device_train_batch_size=settings.batch_size,
        per_device_eval_batch_size=config.evaluation.batch_size,
        gradient_accumulation_steps=settings.gradient_accumulation_steps,
        learning_rate=settings.learning_rate,
        num_train_epochs=settings.epochs,
        max_length=settings.max_seq_length,
        completion_only_loss=True,
        packing=False,
        warmup_ratio=settings.warmup_ratio,
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
        metric_for_best_model="eval_loss",
        greater_is_better=False,
        bf16=precision == "bf16",
        fp16=precision == "fp16",
        gradient_checkpointing=settings.gradient_checkpointing,
        gradient_checkpointing_kwargs={"use_reentrant": False},
        seed=settings.seed,
        data_seed=settings.seed,
        report_to="none",
    )
    callbacks = (
        [EarlyStoppingCallback(early_stopping_patience=settings.early_stopping_patience)]
        if settings.early_stopping_patience
        else []
    )
    trainer = SFTTrainer(
        model=model,
        args=sft_config,
        train_dataset=train_dataset,
        eval_dataset=validation_dataset,
        processing_class=tokenizer,
        callbacks=callbacks,
    )
    train_result = trainer.train(resume_from_checkpoint=True if resume else None)
    validation_metrics = trainer.evaluate()

    trainer.model.save_pretrained(str(run.adapter_dir))
    write_json(
        run.training_record_path,
        {
            "created_at": utc_timestamp(),
            "config": config.model_dump(mode="json"),
            "precision": precision,
            "prompt_version": PROMPT_VERSION,
            "labels": [label.value for label in LABELS],
            "base_model": {
                "name": config.model.base_model,
                "revision": config.model.revision,
                "commit": getattr(model.get_base_model().config, "_commit_hash", None),
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
            "adapter_dir": run.adapter_dir.name,
            "adapter_sha256": run.adapter_fingerprint(),
            "package_versions": package_versions(),
        },
    )
    logger.info("Saved LoRA adapter to %s", run.adapter_dir)
    return run
