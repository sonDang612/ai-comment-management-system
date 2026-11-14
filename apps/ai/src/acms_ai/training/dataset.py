import json
import logging
import unicodedata
from collections.abc import Iterable
from pathlib import Path
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, ValidationError, model_validator

from acms_ai.modules.analysis.schemas import MAX_CONTENT_LENGTH
from acms_ai.training.errors import TrainingDataError
from acms_ai.training.labels import ModerationLabel, label_from_flags

logger = logging.getLogger(__name__)

CJK_FULL_STOPS = str.maketrans({"。": ".", "｡": "."})
FORMAT_CHAR_CATEGORY = "Cf"
MAX_REPORTED_ERRORS = 20


def content_key(content: str) -> str:
    normalized = unicodedata.normalize("NFKC", content).translate(CJK_FULL_STOPS).lower()
    return "".join(
        char
        for char in normalized
        if not char.isspace() and unicodedata.category(char) != FORMAT_CHAR_CATEGORY
    )


class LabeledComment(BaseModel):
    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True, coerce_numbers_to_str=True)

    comment_id: str | None = Field(default=None, max_length=128)
    site_code: str | None = Field(default=None, max_length=64)
    content: str = Field(min_length=1, max_length=MAX_CONTENT_LENGTH)
    label: ModerationLabel
    reason: str | None = None

    @model_validator(mode="before")
    @classmethod
    def derive_label_from_flags(cls, data: Any) -> Any:
        if not isinstance(data, dict) or "is_valid" not in data:
            return data
        is_valid = data["is_valid"]
        is_question = data.get("is_question", False)
        if not isinstance(is_valid, bool) or not isinstance(is_question, bool):
            raise ValueError("is_valid and is_question must be booleans")
        derived = label_from_flags(is_valid, is_question)
        if data.get("label") not in (None, derived.value):
            raise ValueError(f"label {data['label']!r} contradicts is_valid/is_question")
        return {**data, "label": derived}

    @property
    def content_key(self) -> str:
        return content_key(self.content)

    @property
    def identity_key(self) -> str | None:
        if self.comment_id is None:
            return None
        return f"{self.site_code or ''}:{self.comment_id}"


def load_jsonl(path: Path, *, skip_invalid: bool = False) -> list[LabeledComment]:
    if not path.is_file():
        raise TrainingDataError(f"Dataset file not found: {path}")
    records: list[LabeledComment] = []
    errors: list[dict[str, Any]] = []
    with path.open(encoding="utf-8-sig") as handle:
        for line_number, line in enumerate(handle, start=1):
            if not line.strip():
                continue
            try:
                records.append(LabeledComment.model_validate(json.loads(line)))
            except json.JSONDecodeError as exc:
                errors.append({"line": line_number, "error": f"invalid JSON: {exc.msg}"})
            except ValidationError as exc:
                messages = [f"{'.'.join(map(str, e['loc']))}: {e['msg']}" for e in exc.errors()]
                errors.append({"line": line_number, "error": "; ".join(messages)})
    if errors and not skip_invalid:
        raise TrainingDataError(
            f"{len(errors)} invalid line(s) in {path}",
            details=errors[:MAX_REPORTED_ERRORS],
        )
    if errors:
        logger.warning("Skipped %d invalid line(s) in %s", len(errors), path)
    return records


def write_jsonl(path: Path, records: Iterable[LabeledComment]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        for record in records:
            handle.write(record.model_dump_json(exclude_none=True) + "\n")
