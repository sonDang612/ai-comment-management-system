"use client";

import type { CommentModelOutput, ModelOutputProbability, ModelOutputScore } from "@acms/shared";
import { Tag } from "antd";

export const MODEL_VALUE_FRACTION_DIGITS = 4;

const PERCENT_FRACTION_DIGITS = 2;
const PERCENT_CEILING = 0.9999;
const PERCENT_FLOOR = 0.0001;
const HEAD_SEPARATOR = ":";
const INVALID_LABEL = "invalid";
const VALID_CATEGORIES: ReadonlySet<string> = new Set(["statement", "question", "off_topic"]);

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

export type ModelHeadName = "label" | "category";

export interface ModelHeadClass {
  name: string;
  probability: number;
  logit: number;
}

export interface ModelHead {
  head: ModelHeadName;
  classes: ModelHeadClass[];
  margin: number | null;
}

export function formatModelValue(value: number): string {
  return value.toFixed(MODEL_VALUE_FRACTION_DIGITS);
}

export function formatPercent(probability: number): string {
  if (probability >= PERCENT_CEILING) return ">99.99%";
  if (probability < PERCENT_FLOOR) return "<0.01%";
  return `${(probability * 100).toFixed(PERCENT_FRACTION_DIGITS)}%`;
}

export function topScore(output: CommentModelOutput | null): ModelOutputScore | null {
  return output?.scores[0] ?? null;
}

function logitOf(output: CommentModelOutput, head: ModelHeadName, name: string): number {
  const qualified = `${head}${HEAD_SEPARATOR}${name}`;
  const score = output.scores.find((item) => item.label === qualified) ?? output.scores.find((item) => item.label === name);
  return score?.score ?? Number.NaN;
}

function toHead(output: CommentModelOutput, head: ModelHeadName, probabilities: ModelOutputProbability[]): ModelHead {
  const classes = probabilities.map((item) => ({ ...item, logit: logitOf(output, head, item.name) }));
  const [first, second] = classes;
  return { head, classes, margin: first && second ? first.logit - second.logit : null };
}

export function modelHeads(output: CommentModelOutput): ModelHead[] {
  const heads: [ModelHeadName, ModelOutputProbability[]][] = [
    ["label", output.label_probabilities],
    ["category", output.category_probabilities],
  ];
  return heads
    .filter(([, probabilities]) => probabilities.length > 0)
    .map(([head, probabilities]) => toHead(output, head, probabilities));
}

export function isInvalidLabel(name: string): boolean {
  return name === INVALID_LABEL;
}

export function labelCategoryDisagree(output: CommentModelOutput): boolean {
  const label = output.label_probabilities[0]?.name;
  const category = output.category_probabilities[0]?.name;
  if (label === undefined || category === undefined) return false;
  return VALID_CATEGORIES.has(category) === isInvalidLabel(label);
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
