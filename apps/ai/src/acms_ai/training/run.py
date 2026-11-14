from collections.abc import Mapping
from functools import cached_property
from pathlib import Path
from typing import Any

from acms_ai.training.artifacts import directory_sha256, read_json
from acms_ai.training.config import FineTuneConfig, config_from_dict
from acms_ai.training.errors import ArtifactMismatchError, TrainingConfigError
from acms_ai.training.prompt import PROMPT_VERSION
from acms_ai.training.splitting import SplitDirectory

ADAPTER_DIR = "adapter"
CHECKPOINTS_DIR = "checkpoints"
TRAINING_RECORD_FILE = "training_config.json"
THRESHOLDS_FILE = "thresholds.json"
EVALUATION_DIR = "evaluation"


class RunDirectory:
    def __init__(self, path: Path) -> None:
        self.path = path

    @property
    def adapter_dir(self) -> Path:
        return self.path / ADAPTER_DIR

    @property
    def checkpoints_dir(self) -> Path:
        return self.path / CHECKPOINTS_DIR

    @property
    def training_record_path(self) -> Path:
        return self.path / TRAINING_RECORD_FILE

    @property
    def thresholds_path(self) -> Path:
        return self.path / THRESHOLDS_FILE

    @property
    def evaluation_dir(self) -> Path:
        return self.path / EVALUATION_DIR

    @cached_property
    def training_record(self) -> dict[str, Any]:
        if not self.training_record_path.is_file():
            raise TrainingConfigError(f"No trained adapter in {self.path}; run the train command")
        return read_json(self.training_record_path)

    def load_config(self, evaluation_overrides: Mapping[str, Any]) -> FineTuneConfig:
        record = self.training_record
        if record["prompt_version"] != PROMPT_VERSION:
            raise ArtifactMismatchError(
                "The adapter was trained with another prompt version",
                details={"trained": record["prompt_version"], "current": PROMPT_VERSION},
            )
        overrides = {f"evaluation.{key}": value for key, value in evaluation_overrides.items()}
        return config_from_dict(record["config"], overrides)

    def adapter_fingerprint(self) -> str:
        if not self.adapter_dir.is_dir():
            raise TrainingConfigError(f"No adapter in {self.adapter_dir}")
        return directory_sha256(self.adapter_dir)

    def split_directory(self, config: FineTuneConfig) -> SplitDirectory:
        split_dir = SplitDirectory(config.data.split_dir)
        if split_dir.fingerprint != self.training_record["split"]["manifest_sha256"]:
            raise ArtifactMismatchError(
                f"{split_dir.path} is not the split this adapter was trained on"
            )
        return split_dir
