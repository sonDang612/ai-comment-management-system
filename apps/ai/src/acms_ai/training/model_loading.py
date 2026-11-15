import logging
from typing import Any

from acms_ai.training.config import ModelSettings, ResolvedPrecision
from acms_ai.training.labels import OUTPUT_NAMES

logger = logging.getLogger(__name__)


def resolve_precision(settings: ModelSettings) -> ResolvedPrecision:
    import torch

    if settings.precision != "auto":
        return settings.precision
    if not torch.cuda.is_available():
        return "fp32"
    return "bf16" if torch.cuda.is_bf16_supported() else "fp16"


def hub_kwargs(settings: ModelSettings) -> dict[str, Any]:
    return {
        "revision": settings.revision,
        "cache_dir": str(settings.cache_dir) if settings.cache_dir else None,
        "local_files_only": settings.local_files_only,
    }


def label_mappings() -> tuple[dict[int, str], dict[str, int]]:
    id2label = dict(enumerate(OUTPUT_NAMES))
    return id2label, {name: index for index, name in id2label.items()}


def load_tokenizer(settings: ModelSettings) -> Any:
    from transformers import AutoTokenizer

    return AutoTokenizer.from_pretrained(settings.base_model, use_fast=True, **hub_kwargs(settings))


def load_base_classifier(settings: ModelSettings) -> Any:
    from transformers import AutoModelForSequenceClassification

    id2label, label2id = label_mappings()
    model = AutoModelForSequenceClassification.from_pretrained(
        settings.base_model,
        num_labels=len(OUTPUT_NAMES),
        id2label=id2label,
        label2id=label2id,
        problem_type="single_label_classification",
        **hub_kwargs(settings),
    )
    logger.info(
        "Loaded base model %s with new label and category heads (%d outputs)",
        settings.base_model,
        len(OUTPUT_NAMES),
    )
    return model


def load_trained_classifier(model_dir: str) -> tuple[Any, Any]:
    from transformers import AutoModelForSequenceClassification, AutoTokenizer

    tokenizer = AutoTokenizer.from_pretrained(model_dir, use_fast=True, local_files_only=True)
    model = AutoModelForSequenceClassification.from_pretrained(model_dir, local_files_only=True)
    return tokenizer, model
