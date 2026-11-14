import tomllib
from collections.abc import Mapping
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationError, model_validator

from acms_ai.training.errors import TrainingConfigError

Precision = Literal["auto", "bf16", "fp16", "fp32"]
ResolvedPrecision = Literal["bf16", "fp16", "fp32"]
QWEN3_LINEAR_MODULES = ("q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj")


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ModelSettings(StrictModel):
    base_model: str = "Qwen/Qwen3-1.7B"
    revision: str | None = None
    cache_dir: Path | None = None
    local_files_only: bool = False
    precision: Precision = "auto"
    load_in_4bit: bool = False
    attn_implementation: Literal["sdpa", "eager", "flash_attention_2"] = "sdpa"


class LoraSettings(StrictModel):
    rank: int = Field(default=16, ge=1)
    alpha: int = Field(default=32, ge=1)
    dropout: float = Field(default=0.05, ge=0.0, lt=1.0)
    target_modules: list[str] = Field(
        default_factory=lambda: list(QWEN3_LINEAR_MODULES), min_length=1
    )
    bias: Literal["none", "all", "lora_only"] = "none"


class TrainingSettings(StrictModel):
    output_dir: Path = Path("training/outputs/qwen3-1.7b-lora")
    batch_size: int = Field(default=4, ge=1)
    gradient_accumulation_steps: int = Field(default=4, ge=1)
    learning_rate: float = Field(default=2e-4, gt=0.0)
    epochs: float = Field(default=3.0, gt=0.0)
    max_seq_length: int = Field(default=512, ge=64)
    completion_reserve_tokens: int = Field(default=96, ge=16)
    warmup_ratio: float = Field(default=0.05, ge=0.0, lt=1.0)
    weight_decay: float = Field(default=0.0, ge=0.0)
    lr_scheduler: str = "cosine"
    max_grad_norm: float = Field(default=1.0, gt=0.0)
    logging_steps: int = Field(default=10, ge=1)
    eval_steps: int = Field(default=100, ge=1)
    save_total_limit: int = Field(default=2, ge=1)
    early_stopping_patience: int | None = Field(default=3, ge=1)
    gradient_checkpointing: bool = True
    seed: int = 42

    @model_validator(mode="after")
    def check_sequence_budget(self) -> "TrainingSettings":
        if self.completion_reserve_tokens >= self.max_seq_length:
            raise ValueError("completion_reserve_tokens must be smaller than max_seq_length")
        return self


class DataSettings(StrictModel):
    split_dir: Path = Path("training/data/splits/v1")


class EvaluationSettings(StrictModel):
    batch_size: int = Field(default=8, ge=1)
    valid_target_precision: float = Field(default=0.95, ge=0.0, le=1.0)
    invalid_target_precision: float = Field(default=0.97, ge=0.0, le=1.0)
    default_valid_threshold: float = Field(default=0.85, ge=0.0, le=1.0)
    default_invalid_threshold: float = Field(default=0.90, ge=0.0, le=1.0)
    min_accepted: int = Field(default=20, ge=1)
    threshold_grid_min: float = Field(default=0.50, ge=0.0, lt=1.0)
    threshold_grid_step: float = Field(default=0.01, gt=0.0, lt=0.5)
    question_target_precision: float = Field(default=0.90, ge=0.0, le=1.0)
    question_target_recall: float = Field(default=0.90, ge=0.0, le=1.0)
    max_uncertain_rate: float = Field(default=0.15, ge=0.0, le=1.0)


class FineTuneConfig(StrictModel):
    model: ModelSettings = Field(default_factory=ModelSettings)
    lora: LoraSettings = Field(default_factory=LoraSettings)
    training: TrainingSettings = Field(default_factory=TrainingSettings)
    data: DataSettings = Field(default_factory=DataSettings)
    evaluation: EvaluationSettings = Field(default_factory=EvaluationSettings)


def apply_overrides(data: Mapping[str, Any], overrides: Mapping[str, Any]) -> dict[str, Any]:
    merged = {section: dict(values) for section, values in data.items()}
    for dotted_key, value in overrides.items():
        if value is None:
            continue
        section, key = dotted_key.split(".", 1)
        merged.setdefault(section, {})[key] = value
    return merged


def config_from_dict(data: Mapping[str, Any], overrides: Mapping[str, Any]) -> FineTuneConfig:
    try:
        return FineTuneConfig.model_validate(apply_overrides(data, overrides))
    except ValidationError as exc:
        details = [
            {"field": ".".join(map(str, error["loc"])), "error": error["msg"]}
            for error in exc.errors()
        ]
        raise TrainingConfigError(details=details) from exc


def load_config(path: Path | None, overrides: Mapping[str, Any]) -> FineTuneConfig:
    if path is None:
        return config_from_dict({}, overrides)
    if not path.is_file():
        raise TrainingConfigError(f"Config file not found: {path}")
    try:
        data = tomllib.loads(path.read_text(encoding="utf-8"))
    except tomllib.TOMLDecodeError as exc:
        raise TrainingConfigError(f"Invalid TOML in {path}: {exc}") from exc
    return config_from_dict(data, overrides)
