from collections.abc import Mapping
from functools import cached_property
from pathlib import Path
from typing import Any

from acms_ai.training.artifacts import directory_sha256, read_json
from acms_ai.training.config import FineTuneConfig, config_from_dict
from acms_ai.training.errors import ArtifactMismatchError, TrainingConfigError
from acms_ai.training.labels import LABELS
from acms_ai.training.splitting import SplitDirectory

MODEL_DIR = "model"
CHECKPOINTS_DIR = "checkpoints"
TRAINING_RECORD_FILE = "training_config.json"
THRESHOLDS_FILE = "thresholds.json"
EVALUATION_DIR = "evaluation"


class RunDirectory:
    def __init__(self, path: Path) -> None:
        self.path = path

    @property
    def model_dir(self) -> Path:
        return self.path / MODEL_DIR

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
            raise TrainingConfigError(f"No trained model in {self.path}; run the train command")
        return read_json(self.training_record_path)

    def load_config(self, evaluation_overrides: Mapping[str, Any]) -> FineTuneConfig:
        record = self.training_record
        current_labels = [label.value for label in LABELS]
        if record["labels"] != current_labels:
            raise ArtifactMismatchError(
                "The model was trained with other labels",
                details={"trained": record["labels"], "current": current_labels},
            )
        overrides = {f"evaluation.{key}": value for key, value in evaluation_overrides.items()}
        return config_from_dict(record["config"], overrides)

    def model_fingerprint(self) -> str:
        if not self.model_dir.is_dir():
            raise TrainingConfigError(f"No model in {self.model_dir}")
        return directory_sha256(self.model_dir)

    def split_directory(self, config: FineTuneConfig) -> SplitDirectory:
        split_dir = SplitDirectory(config.data.split_dir)
        if split_dir.fingerprint != self.training_record["split"]["manifest_sha256"]:
            raise ArtifactMismatchError(
                f"{split_dir.path} is not the split this model was trained on"
            )
        return split_dir
