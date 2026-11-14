import itertools
import logging
import random
from collections import Counter, defaultdict
from collections.abc import Mapping, Sequence
from functools import cached_property
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator

from acms_ai.training.artifacts import file_sha256, read_json, utc_timestamp, write_json
from acms_ai.training.dataset import LabeledComment, load_jsonl, write_jsonl
from acms_ai.training.errors import ArtifactMismatchError, DataLeakageError, TrainingConfigError
from acms_ai.training.labels import LABELS

logger = logging.getLogger(__name__)

SplitName = Literal["train", "validation", "test"]
SPLIT_NAMES: tuple[SplitName, ...] = ("train", "validation", "test")
MANIFEST_FILE = "manifest.json"
NORMALIZATION_VERSION = "nfkc-cjk-stop-lower-no-space-v1"
RATIO_TOLERANCE = 1e-6


class SplitRatios(BaseModel):
    train: float = Field(default=0.70, gt=0.0, lt=1.0)
    validation: float = Field(default=0.15, gt=0.0, lt=1.0)
    test: float = Field(default=0.15, gt=0.0, lt=1.0)

    @model_validator(mode="after")
    def check_total(self) -> "SplitRatios":
        if abs(self.train + self.validation + self.test - 1.0) > RATIO_TOLERANCE:
            raise ValueError("train + validation + test ratios must sum to 1.0")
        return self


def deduplicate(records: Sequence[LabeledComment]) -> tuple[list[LabeledComment], dict[str, int]]:
    by_identity: dict[str, list[LabeledComment]] = defaultdict(list)
    for record in records:
        if record.identity_key is not None:
            by_identity[record.identity_key].append(record)
    conflicting_identities = {
        identity
        for identity, group in by_identity.items()
        if len({(item.content_key, item.label) for item in group}) > 1
    }

    by_content: dict[str, list[LabeledComment]] = defaultdict(list)
    for record in records:
        if record.identity_key not in conflicting_identities:
            by_content[record.content_key].append(record)

    unique: list[LabeledComment] = []
    conflicting_content_records = 0
    for group in by_content.values():
        if len({item.label for item in group}) > 1:
            conflicting_content_records += len(group)
            continue
        unique.append(group[0])

    identity_conflict_records = sum(len(by_identity[key]) for key in conflicting_identities)
    stats = {
        "input_records": len(records),
        "unique_records": len(unique),
        "duplicates_removed": len(records)
        - len(unique)
        - conflicting_content_records
        - identity_conflict_records,
        "conflicting_comment_id_records_removed": identity_conflict_records,
        "conflicting_label_records_removed": conflicting_content_records,
    }
    return unique, stats


def assign_splits(
    records: Sequence[LabeledComment], ratios: SplitRatios, seed: int
) -> dict[SplitName, list[LabeledComment]]:
    rng = random.Random(seed)
    splits: dict[SplitName, list[LabeledComment]] = {name: [] for name in SPLIT_NAMES}
    for label in LABELS:
        stratum = sorted(
            (record for record in records if record.label == label),
            key=lambda record: record.content_key,
        )
        rng.shuffle(stratum)
        test_count = round(len(stratum) * ratios.test)
        validation_count = min(round(len(stratum) * ratios.validation), len(stratum) - test_count)
        splits["test"].extend(stratum[:test_count])
        splits["validation"].extend(stratum[test_count : test_count + validation_count])
        splits["train"].extend(stratum[test_count + validation_count :])
    for split in splits.values():
        rng.shuffle(split)
    return splits


def find_leaks(splits: Mapping[str, Sequence[LabeledComment]]) -> list[dict[str, Any]]:
    leaks: list[dict[str, Any]] = []
    for first, second in itertools.combinations(splits, 2):
        shared_content = {r.content_key for r in splits[first]} & {
            r.content_key for r in splits[second]
        }
        shared_ids = {r.identity_key for r in splits[first] if r.identity_key} & {
            r.identity_key for r in splits[second] if r.identity_key
        }
        if shared_content or shared_ids:
            leaks.append(
                {
                    "splits": [first, second],
                    "shared_contents": len(shared_content),
                    "shared_comment_ids": len(shared_ids),
                }
            )
    return leaks


def assert_no_leakage(splits: Mapping[str, Sequence[LabeledComment]]) -> None:
    leaks = find_leaks(splits)
    if leaks:
        raise DataLeakageError(details=leaks)


def label_counts(records: Sequence[LabeledComment]) -> dict[str, int]:
    counts = Counter(record.label.value for record in records)
    return {label.value: counts.get(label.value, 0) for label in LABELS}


def create_splits(
    inputs: Sequence[Path],
    output_dir: Path,
    ratios: SplitRatios,
    *,
    seed: int,
    skip_invalid: bool,
    force: bool,
) -> dict[str, Any]:
    manifest_path = output_dir / MANIFEST_FILE
    if manifest_path.exists() and not force:
        raise TrainingConfigError(
            f"{output_dir} already holds a split; reshuffling it would expose the test set. "
            "Choose a new output directory, or pass --force to replace it on purpose"
        )

    records = [record for path in inputs for record in load_jsonl(path, skip_invalid=skip_invalid)]
    if not records:
        raise TrainingConfigError("The input files contain no records")
    unique, stats = deduplicate(records)
    splits = assign_splits(unique, ratios, seed)
    assert_no_leakage(splits)
    empty = [name for name, items in splits.items() if not items]
    if empty:
        raise TrainingConfigError("Not enough records to fill every split", details=empty)

    files: dict[str, dict[str, Any]] = {}
    for name, items in splits.items():
        path = output_dir / f"{name}.jsonl"
        write_jsonl(path, items)
        files[name] = {"file": path.name, "sha256": file_sha256(path), "records": len(items)}

    manifest = {
        "created_at": utc_timestamp(),
        "seed": seed,
        "ratios": ratios.model_dump(),
        "normalization": NORMALIZATION_VERSION,
        "sources": [{"file": str(path), "sha256": file_sha256(path)} for path in inputs],
        "deduplication": stats,
        "files": files,
        "label_counts": {name: label_counts(items) for name, items in splits.items()},
    }
    write_json(manifest_path, manifest)
    logger.info("Wrote split to %s: %s", output_dir, {k: v["records"] for k, v in files.items()})
    return manifest


class SplitDirectory:
    def __init__(self, path: Path) -> None:
        self.path = path

    @property
    def manifest_path(self) -> Path:
        return self.path / MANIFEST_FILE

    @cached_property
    def manifest(self) -> dict[str, Any]:
        if not self.manifest_path.is_file():
            raise TrainingConfigError(f"No split manifest in {self.path}; run the split command")
        return read_json(self.manifest_path)

    @cached_property
    def fingerprint(self) -> str:
        return file_sha256(self.manifest_path)

    def load(self, split: SplitName) -> list[LabeledComment]:
        entry = self.manifest["files"][split]
        path = self.path / entry["file"]
        if file_sha256(path) != entry["sha256"]:
            raise ArtifactMismatchError(f"{path} changed after the split was created")
        return load_jsonl(path)

    def verify(self) -> None:
        assert_no_leakage({name: self.load(name) for name in SPLIT_NAMES})
