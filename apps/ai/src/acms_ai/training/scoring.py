from collections.abc import Sequence
from dataclasses import dataclass

from acms_ai.training.config import FineTuneConfig
from acms_ai.training.errors import ArtifactMismatchError
from acms_ai.training.labels import LABELS, ModerationLabel
from acms_ai.training.model_loading import label_mappings, load_trained_classifier
from acms_ai.training.run import RunDirectory


@dataclass(frozen=True)
class LabelScores:
    probabilities: dict[ModerationLabel, float]

    @property
    def predicted(self) -> ModerationLabel:
        return max(self.probabilities, key=self.probabilities.__getitem__)

    @property
    def confidence(self) -> float:
        return self.probabilities[self.predicted]


class ClassifierScorer:
    def __init__(self, run: RunDirectory, config: FineTuneConfig) -> None:
        import torch

        self._tokenizer, model = load_trained_classifier(str(run.model_dir))
        trained_labels = {int(index): name for index, name in model.config.id2label.items()}
        expected_labels, _ = label_mappings()
        if trained_labels != expected_labels:
            raise ArtifactMismatchError(
                "The trained model has other labels",
                details={"trained": trained_labels, "expected": expected_labels},
            )
        self._device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self._model = model.to(self._device).eval()
        self._max_length = config.training.max_seq_length

    def score(self, contents: Sequence[str], batch_size: int) -> list[LabelScores]:
        results: list[LabelScores] = []
        for start in range(0, len(contents), batch_size):
            results.extend(self._score_batch(contents[start : start + batch_size]))
        return results

    def _score_batch(self, contents: Sequence[str]) -> list[LabelScores]:
        import torch

        encoded = self._tokenizer(
            list(contents),
            truncation=True,
            max_length=self._max_length,
            padding=True,
            return_tensors="pt",
        ).to(self._device)
        with torch.inference_mode():
            probabilities = self._model(**encoded).logits.float().softmax(dim=-1).cpu().tolist()
        return [LabelScores(dict(zip(LABELS, row, strict=True))) for row in probabilities]
