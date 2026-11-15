"use client";

import type { CommentModelOutput, ModelOutputProbability, ModelOutputScore } from "@acms/shared";
import { Tag } from "antd";

export const MODEL_VALUE_FRACTION_DIGITS = 4;

const LABEL_HEAD_PREFIX = "label:";
const CATEGORY_HEAD_PREFIX = "category:";

const LABEL_COLORS: Record<string, string> = {
  valid: "success",
  invalid: "error",
  question: "processing",
};

const CATEGORY_COLORS: Record<string, string> = {
  statement: "default",
  question: "processing",
  off_topic: "default",
  toxic: "error",
  sexual: "error",
  spam: "warning",
  gibberish: "warning",
  advertisement: "warning",
  scam: "error",
  privacy: "warning",
  illegal: "error",
  political: "error",
};

export function formatModelValue(value: number): string {
  return value.toFixed(MODEL_VALUE_FRACTION_DIGITS);
}

export function topScore(output: CommentModelOutput | null): ModelOutputScore | null {
  return output?.scores[0] ?? null;
}

export function headProbability(output: CommentModelOutput, outputLabel: string): number | null {
  const [probabilities, name] = outputLabel.startsWith(CATEGORY_HEAD_PREFIX)
    ? [output.category_probabilities, outputLabel.slice(CATEGORY_HEAD_PREFIX.length)]
    : outputLabel.startsWith(LABEL_HEAD_PREFIX)
      ? [output.label_probabilities, outputLabel.slice(LABEL_HEAD_PREFIX.length)]
      : [output.label_probabilities, outputLabel];
  return probabilities.find((probability) => probability.name === name)?.probability ?? null;
}

export function TopLogit({ output }: { output: CommentModelOutput | null }) {
  const score = topScore(output);
  if (!score) return "-";
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <code className="text-xs">{score.label}</code>
      <span className="font-mono">{formatModelValue(score.score)}</span>
    </span>
  );
}

function HeadPrediction({ best, colors }: { best: ModelOutputProbability | undefined; colors: Record<string, string> }) {
  if (!best) return "-";
  return (
    <span className="inline-flex items-center gap-1">
      <Tag color={colors[best.name] ?? "default"} className="!font-mono">
        {best.name}
      </Tag>
      <span className="font-mono">{formatModelValue(best.probability)}</span>
    </span>
  );
}

export function LabelPrediction({ output }: { output: CommentModelOutput | null }) {
  return <HeadPrediction best={output?.label_probabilities[0]} colors={LABEL_COLORS} />;
}

export function CategoryPrediction({ output }: { output: CommentModelOutput | null }) {
  return <HeadPrediction best={output?.category_probabilities[0]} colors={CATEGORY_COLORS} />;
}
