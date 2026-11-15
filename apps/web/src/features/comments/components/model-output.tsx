"use client";

import type {
  CommentDto,
  CommentModelOutput,
  DecisionSource,
  ModelOutputProbability,
  ModelOutputScore,
} from "@acms/shared";
import { Tag, Tooltip } from "antd";
import { UserCheck } from "lucide-react";
import { useI18n } from "@/i18n";

export const MODEL_VALUE_FRACTION_DIGITS = 4;

const PERCENT_FRACTION_DIGITS = 2;
const PERCENT_CEILING = 0.9999;
const PERCENT_FLOOR = 0.0001;
const HEAD_SEPARATOR = ":";
const INVALID_LABEL = "invalid";
const RULE_CONFIDENCE = 1;
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

export interface ModelClassNames {
  heads: Record<string, string>;
  label: Record<string, string>;
  category: Record<string, string>;
}

export function modelClassName(names: ModelClassNames, head: ModelHeadName, name: string): string {
  return names[head][name] ?? name;
}

export function modelHeadName(names: ModelClassNames, head: ModelHeadName): string {
  return names.heads[head] ?? head;
}

function splitOutputName(qualified: string): { head: ModelHeadName | null; name: string } {
  const [head, ...rest] = qualified.split(HEAD_SEPARATOR);
  if (rest.length > 0 && (head === "label" || head === "category")) return { head, name: rest.join(HEAD_SEPARATOR) };
  return { head: null, name: qualified };
}

export type CheckSource = "model" | "rule" | "unchecked" | "none";

export function checkSource(comment: CommentDto): CheckSource {
  if (comment.model_output) return "model";
  if (!comment.moderated_at) return "unchecked";
  if (comment.reason) return "rule";
  return "none";
}

function NoModelOutput({ source }: { source: CheckSource }) {
  const { dict } = useI18n();
  if (source === "unchecked") return <span className="text-muted-foreground">{dict.comments.unchecked}</span>;
  return "-";
}

function RuleBlockedTag() {
  const { dict } = useI18n();
  return <Tag color="purple">{dict.comments.ruleBlocked}</Tag>;
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

export function TopLogit({ comment }: { comment: CommentDto }) {
  const { dict } = useI18n();
  const source = checkSource(comment);
  if (source === "rule") return <RuleBlockedTag />;
  const score = topScore(comment.model_output);
  if (!score) return <NoModelOutput source={source} />;
  const { head, name } = splitOutputName(score.label);
  const colors = head === "label" ? LABEL_COLORS : CATEGORY_COLORS;
  return (
    <span className="inline-flex items-center gap-1">
      <Tag color={colors[name] ?? "default"} title={score.label}>
        {head ? modelClassName(dict.comments.modelClasses, head, name) : name}
      </Tag>
      <span className="font-mono">{formatModelValue(score.score)}</span>
    </span>
  );
}

function HeadPrediction({
  head,
  best,
  colors,
}: {
  head: ModelHeadName;
  best: ModelOutputProbability | undefined;
  colors: Record<string, string>;
}) {
  const { dict } = useI18n();
  if (!best) return "-";
  return (
    <span className="inline-flex items-center gap-1">
      <Tag color={colors[best.name] ?? "default"} title={best.name}>
        {modelClassName(dict.comments.modelClasses, head, best.name)}
      </Tag>
      <span className="font-mono">{formatModelValue(best.probability)}</span>
    </span>
  );
}

const DECISION_SOURCE_COLORS: Record<DecisionSource, string> = {
  rule_filter: "purple",
  ai_model: "blue",
  admin: "green",
};

export function DecisionSourceTag({ comment }: { comment: CommentDto }) {
  const { dict } = useI18n();
  if (!comment.decided_by) return <NoModelOutput source={checkSource(comment)} />;
  return (
    <Tag color={DECISION_SOURCE_COLORS[comment.decided_by]}>
      {dict.comments.decisionSources[comment.decided_by] ?? comment.decided_by}
    </Tag>
  );
}

function ReviewedPrediction({ head, name, colors }: { head: ModelHeadName; name: string; colors: Record<string, string> }) {
  const { dict } = useI18n();
  const t = dict.comments.review;
  return (
    <Tooltip title={t.badgeHint}>
      <span className="inline-flex items-center gap-1">
        <Tag color={colors[name] ?? "default"} title={name}>
          {modelClassName(dict.comments.modelClasses, head, name)}
        </Tag>
        <span className="inline-flex items-center gap-0.5 text-xs text-emerald-600 dark:text-emerald-400">
          <UserCheck className="size-3.5" aria-hidden />
          {t.badge}
        </span>
      </span>
    </Tooltip>
  );
}

interface PredictionProps {
  comment: CommentDto;
  showReview?: boolean;
}

export function LabelPrediction({ comment, showReview = true }: PredictionProps) {
  if (showReview && comment.review) {
    return <ReviewedPrediction head="label" name={comment.review.label} colors={LABEL_COLORS} />;
  }
  const source = checkSource(comment);
  if (source === "rule") {
    return (
      <HeadPrediction
        head="label"
        best={{ name: INVALID_LABEL, probability: RULE_CONFIDENCE }}
        colors={LABEL_COLORS}
      />
    );
  }
  const best = comment.model_output?.label_probabilities[0];
  if (!best) return <NoModelOutput source={source} />;
  return <HeadPrediction head="label" best={best} colors={LABEL_COLORS} />;
}

export function CategoryPrediction({ comment, showReview = true }: PredictionProps) {
  if (showReview && comment.review) {
    return <ReviewedPrediction head="category" name={comment.review.category} colors={CATEGORY_COLORS} />;
  }
  const source = checkSource(comment);
  if (source === "rule") return <RuleBlockedTag />;
  const best = comment.model_output?.category_probabilities[0];
  if (!best) return <NoModelOutput source={source} />;
  return <HeadPrediction head="category" best={best} colors={CATEGORY_COLORS} />;
}
