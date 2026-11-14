import logging
from typing import Any

from acms_ai.training.config import ModelSettings, ResolvedPrecision
from acms_ai.training.errors import TrainingConfigError

logger = logging.getLogger(__name__)


def resolve_precision(settings: ModelSettings) -> ResolvedPrecision:
    import torch

    if settings.precision != "auto":
        return settings.precision
    if not torch.cuda.is_available():
        return "fp32"
    return "bf16" if torch.cuda.is_bf16_supported() else "fp16"


def torch_dtype(precision: ResolvedPrecision) -> Any:
    import torch

    return {"bf16": torch.bfloat16, "fp16": torch.float16, "fp32": torch.float32}[precision]


def hub_kwargs(settings: ModelSettings) -> dict[str, Any]:
    return {
        "revision": settings.revision,
        "cache_dir": str(settings.cache_dir) if settings.cache_dir else None,
        "local_files_only": settings.local_files_only,
    }


def load_tokenizer(settings: ModelSettings) -> Any:
    from transformers import AutoTokenizer

    tokenizer = AutoTokenizer.from_pretrained(settings.base_model, **hub_kwargs(settings))
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    return tokenizer


def load_frozen_base_model(settings: ModelSettings, precision: ResolvedPrecision) -> Any:
    import torch
    from transformers import AutoModelForCausalLM

    dtype = torch_dtype(precision)
    kwargs: dict[str, Any] = {
        **hub_kwargs(settings),
        "dtype": dtype,
        "attn_implementation": settings.attn_implementation,
    }
    if settings.load_in_4bit:
        if not torch.cuda.is_available():
            raise TrainingConfigError("load_in_4bit requires a CUDA GPU")
        from transformers import BitsAndBytesConfig

        kwargs["quantization_config"] = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=dtype,
            bnb_4bit_use_double_quant=True,
        )
    if torch.cuda.is_available():
        kwargs["device_map"] = {"": torch.cuda.current_device()}

    model = AutoModelForCausalLM.from_pretrained(settings.base_model, **kwargs)
    model.requires_grad_(False)
    logger.info(
        "Loaded base model %s (precision=%s, 4bit=%s)",
        settings.base_model,
        precision,
        settings.load_in_4bit,
    )
    return model
