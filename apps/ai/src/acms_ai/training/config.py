import tomllib
from collections.abc import Mapping
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationError

from acms_ai.training.errors import TrainingConfigError

Precision = Literal["auto", "bf16", "fp16", "fp32"]
ResolvedPrecision = Literal["bf16", "fp16", "fp32"]
MAX_BERT_SEQUENCE_LENGTH = 512


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ModelSettings(StrictModel):
    base_model: str = "hfl/chinese-roberta-wwm-ext"
    revision: str | None = None
    cache_dir: Path | None = None
    local_files_only: bool = False
    precision: Precision = "auto"


class TrainingSettings(StrictModel):
    output_dir: Path = Path("training/outputs/chinese-roberta-v1")
    batch_size: int = Field(default=16, ge=1)
    gradient_accumulation_steps: int = Field(default=1, ge=1)
    learning_rate: float = Field(default=2e-5, gt=0.0)
    epochs: float = Field(default=4.0, gt=0.0)
    max_seq_length: int = Field(default=256, ge=16, le=MAX_BERT_SEQUENCE_LENGTH)
    warmup_ratio: float = Field(default=0.1, ge=0.0, lt=1.0)
    weight_decay: float = Field(default=0.01, ge=0.0)
    lr_scheduler: str = "linear"
    max_grad_norm: float = Field(default=1.0, gt=0.0)
    logging_steps: int = Field(default=10, ge=1)
    eval_steps: int = Field(default=100, ge=1)
    save_total_limit: int = Field(default=2, ge=1)
    early_stopping_patience: int | None = Field(default=3, ge=1)
    seed: int = 42


class DataSettings(StrictModel):
    split_dir: Path = Path("training/data/splits/v1")


class EvaluationSettings(StrictModel):
    batch_size: int = Field(default=32, ge=1)
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
