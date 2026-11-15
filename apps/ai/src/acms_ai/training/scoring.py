from collections.abc import Sequence
from dataclasses import dataclass

from acms_ai.training.config import FineTuneConfig
from acms_ai.training.errors import ArtifactMismatchError
from acms_ai.training.labels import (
    CATEGORIES,
    CATEGORY_SLICE,
    LABEL_SLICE,
    LABELS,
    CommentCategory,
    ModerationLabel,
    is_question,
)
from acms_ai.training.model_loading import label_mappings, load_trained_classifier
from acms_ai.training.run import RunDirectory


@dataclass(frozen=True)
class CommentScores:
    label_probabilities: dict[ModerationLabel, float]
    category_probabilities: dict[CommentCategory, float]

    @property
    def predicted(self) -> ModerationLabel:
        return max(self.label_probabilities, key=self.label_probabilities.__getitem__)

    @property
    def confidence(self) -> float:
        return self.label_probabilities[self.predicted]

    @property
    def category(self) -> CommentCategory:
        return max(self.category_probabilities, key=self.category_probabilities.__getitem__)

    @property
    def category_confidence(self) -> float:
        return self.category_probabilities[self.category]

    @property
    def is_question(self) -> bool:
        return is_question(self.predicted, self.category)


class ClassifierScorer:
    def __init__(self, run: RunDirectory, config: FineTuneConfig) -> None:
        import torch

        self._tokenizer, model = load_trained_classifier(str(run.model_dir))
        trained_outputs = {int(index): name for index, name in model.config.id2label.items()}
        expected_outputs, _ = label_mappings()
        if trained_outputs != expected_outputs:
            raise ArtifactMismatchError(
                "The trained model has other outputs",
                details={"trained": trained_outputs, "expected": expected_outputs},
            )
        self._device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self._model = model.to(self._device).eval()
        self._max_length = config.training.max_seq_length

    def score(self, contents: Sequence[str], batch_size: int) -> list[CommentScores]:
        results: list[CommentScores] = []
        for start in range(0, len(contents), batch_size):
            results.extend(self._score_batch(contents[start : start + batch_size]))
        return results

    def _score_batch(self, contents: Sequence[str]) -> list[CommentScores]:
        import torch

        encoded = self._tokenizer(
            list(contents),
            truncation=True,
            max_length=self._max_length,
            padding=True,
            return_tensors="pt",
        ).to(self._device)
        with torch.inference_mode():
            logits = self._model(**encoded).logits.float()
        label_rows = logits[:, LABEL_SLICE].softmax(dim=-1).cpu().tolist()
        category_rows = logits[:, CATEGORY_SLICE].softmax(dim=-1).cpu().tolist()
        return [
            CommentScores(
                dict(zip(LABELS, label_row, strict=True)),
                dict(zip(CATEGORIES, category_row, strict=True)),
            )
            for label_row, category_row in zip(label_rows, category_rows, strict=True)
        ]
