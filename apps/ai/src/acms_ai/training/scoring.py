import math
from collections.abc import Sequence
from dataclasses import dataclass

from acms_ai.training.config import FineTuneConfig
from acms_ai.training.labels import LABELS, ModerationLabel
from acms_ai.training.model_loading import (
    load_frozen_base_model,
    load_tokenizer,
    resolve_precision,
)
from acms_ai.training.prompt import PromptBuilder, label_prefix
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


def softmax(log_scores: Sequence[float]) -> list[float]:
    peak = max(log_scores)
    exponents = [math.exp(score - peak) for score in log_scores]
    total = sum(exponents)
    return [value / total for value in exponents]


class AdapterScorer:
    def __init__(self, run: RunDirectory, config: FineTuneConfig) -> None:
        from peft import PeftModel

        tokenizer = load_tokenizer(config.model)
        base_model = load_frozen_base_model(config.model, resolve_precision(config.model))
        self._model = PeftModel.from_pretrained(
            base_model, str(run.adapter_dir), is_trainable=False
        )
        self._model.eval()
        self._device = next(self._model.parameters()).device
        self._pad_id = tokenizer.pad_token_id
        self._builder = PromptBuilder(
            tokenizer, config.training.max_seq_length, config.training.completion_reserve_tokens
        )
        self._builder.assert_label_alignment()
        self._candidates = {label: self._builder.encode(label_prefix(label)) for label in LABELS}

    def score(self, contents: Sequence[str], batch_size: int) -> list[LabelScores]:
        results: list[LabelScores] = []
        for start in range(0, len(contents), batch_size):
            results.extend(self._score_batch(contents[start : start + batch_size]))
        return results

    def _score_batch(self, contents: Sequence[str]) -> list[LabelScores]:
        import torch

        sequences: list[list[int]] = []
        spans: list[int] = []
        for content in contents:
            prompt_ids = self._builder.encode(self._builder.prompt(content))
            for label in LABELS:
                candidate = self._candidates[label]
                sequences.append(prompt_ids + candidate)
                spans.append(len(candidate))

        width = max(len(sequence) for sequence in sequences)
        kept = max(spans) + 1
        input_ids = torch.full((len(sequences), width), self._pad_id, dtype=torch.long)
        attention_mask = torch.zeros_like(input_ids)
        for row, sequence in enumerate(sequences):
            input_ids[row, width - len(sequence) :] = torch.tensor(sequence, dtype=torch.long)
            attention_mask[row, width - len(sequence) :] = 1
        position_ids = (attention_mask.cumsum(-1) - 1).clamp(min=0)

        with torch.inference_mode():
            logits = self._model(
                input_ids=input_ids.to(self._device),
                attention_mask=attention_mask.to(self._device),
                position_ids=position_ids.to(self._device),
                logits_to_keep=kept,
            ).logits
            log_probs = logits.float().log_softmax(dim=-1)
            sequence_scores: list[float] = []
            for row, span in enumerate(spans):
                targets = input_ids[row, width - span :].to(self._device)
                predicting = log_probs[row, kept - span - 1 : kept - 1]
                sequence_scores.append(predicting.gather(-1, targets.unsqueeze(-1)).sum().item())

        results: list[LabelScores] = []
        for start in range(0, len(sequence_scores), len(LABELS)):
            probabilities = softmax(sequence_scores[start : start + len(LABELS)])
            results.append(LabelScores(dict(zip(LABELS, probabilities, strict=True))))
        return results
