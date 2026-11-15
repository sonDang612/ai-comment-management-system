import {
  COMMENT_CATEGORIES,
  type AiCommentAnalysis,
  type CommentCategory,
  type CommentModelOutput,
  type ModelOutputScore,
} from '@acms/shared';

export const MODERATION_LABELS = ['valid', 'invalid'] as const;
export type ModerationLabel = (typeof MODERATION_LABELS)[number];

export const LEGACY_MODERATION_LABELS = ['valid', 'question', 'invalid'] as const;
export type LegacyModerationLabel = (typeof LEGACY_MODERATION_LABELS)[number];

const LABEL_HEAD = 'label';
const CATEGORY_HEAD = 'category';
const HEAD_SEPARATOR = ':';

export const MAX_INPUT_CHARS = 2_000;

export const VALID_REASON = '评论内容正常,未发现违规';
export const INVALID_REASON = '评论内容违规';
export const QUESTION_REASON = '用户向网站运营方提问,需要人工回复';

export const CATEGORY_REASONS: Record<CommentCategory, string> = {
  statement: VALID_REASON,
  question: QUESTION_REASON,
  off_topic: '评论内容与主题无关',
  toxic: '评论包含辱骂、骚扰、威胁或仇恨等攻击性内容',
  sexual: '评论包含色情或低俗内容',
  spam: '评论为刷屏或无意义的重复内容',
  gibberish: '评论为乱码或无意义字符',
  advertisement: '评论包含广告、推广或赌博引流内容',
  scam: '评论疑似诈骗或钓鱼信息',
  privacy: '评论包含联系方式或个人隐私信息',
  illegal: '评论涉及违法违禁内容',
  political: '评论包含敏感政治内容',
};

const LEGACY_CATEGORIES: Record<LegacyModerationLabel, CommentCategory | null> = {
  valid: null,
  question: 'question',
  invalid: null,
};

export type OutputScore = ModelOutputScore;

export interface CommentPrediction {
  label: ModerationLabel;
  confidence: number;
  category: CommentCategory | null;
}

function outputName(head: string, value: string): string {
  return `${head}${HEAD_SEPARATOR}${value}`;
}

export const MODEL_OUTPUTS: readonly string[] = [
  ...MODERATION_LABELS.map((label) => outputName(LABEL_HEAD, label)),
  ...COMMENT_CATEGORIES.map((category) => outputName(CATEGORY_HEAD, category)),
];

function hasExactly(names: readonly string[], expected: readonly string[]): boolean {
  return names.length === expected.length && expected.every((name) => names.includes(name));
}

export function isTwoHeadModel(names: readonly string[]): boolean {
  return hasExactly(names, MODEL_OUTPUTS);
}

export function isLegacyModel(names: readonly string[]): boolean {
  return hasExactly(names, LEGACY_MODERATION_LABELS);
}

export function servesModerationOutputs(names: readonly string[]): boolean {
  return isTwoHeadModel(names) || isLegacyModel(names);
}

interface Probability<T extends string> {
  name: T;
  probability: number;
}

function softmax<T extends string>(logits: Map<string, number>, names: readonly T[]): Probability<T>[] {
  const values = names.map((name) => logits.get(name) ?? Number.NaN);
  const max = Math.max(...values);
  const exponents = values.map((value) => Math.exp(value - max));
  const total = exponents.reduce((sum, value) => sum + value, 0);
  return names.map((name, index) => ({ name, probability: exponents[index]! / total }));
}

function headSoftmax<T extends string>(logits: Map<string, number>, head: string, values: readonly T[]): Probability<T>[] {
  const headLogits = new Map(values.map((value) => [value, logits.get(outputName(head, value)) ?? Number.NaN]));
  return softmax(headLogits, values);
}

function mostLikely<T extends string>(probabilities: Probability<T>[]): Probability<T> {
  return probabilities.reduce((best, candidate) => (candidate.probability > best.probability ? candidate : best));
}

function byProbabilityDesc<T extends string>(probabilities: Probability<T>[]): Probability<T>[] {
  return [...probabilities].sort((left, right) => right.probability - left.probability);
}

function hasFiniteScores(scores: readonly OutputScore[]): boolean {
  return scores.every((score) => Number.isFinite(score.score));
}

export function isOutputScoreList(value: unknown): value is OutputScore[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item: unknown) =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as Record<string, unknown>)['label'] === 'string' &&
        typeof (item as Record<string, unknown>)['score'] === 'number',
    )
  );
}

export function describeModelOutput(scores: readonly OutputScore[]): CommentModelOutput {
  const sortedScores = [...scores].sort((left, right) => right.score - left.score);
  const names = scores.map((score) => score.label);
  const logits = new Map(scores.map((score) => [score.label, score.score]));
  const empty: CommentModelOutput = { scores: sortedScores, label_probabilities: [], category_probabilities: [] };
  if (!hasFiniteScores(scores)) return empty;

  if (isTwoHeadModel(names)) {
    return {
      scores: sortedScores,
      label_probabilities: byProbabilityDesc(headSoftmax(logits, LABEL_HEAD, MODERATION_LABELS)),
      category_probabilities: byProbabilityDesc(headSoftmax(logits, CATEGORY_HEAD, COMMENT_CATEGORIES)),
    };
  }
  if (isLegacyModel(names)) {
    return {
      scores: sortedScores,
      label_probabilities: byProbabilityDesc(softmax(logits, LEGACY_MODERATION_LABELS)),
      category_probabilities: [],
    };
  }
  return empty;
}

export function predictFromLogits(scores: readonly OutputScore[]): CommentPrediction | null {
  if (!hasFiniteScores(scores)) return null;
  const names = scores.map((score) => score.label);
  const logits = new Map(scores.map((score) => [score.label, score.score]));

  if (isTwoHeadModel(names)) {
    const label = mostLikely(headSoftmax(logits, LABEL_HEAD, MODERATION_LABELS));
    const category = mostLikely(headSoftmax(logits, CATEGORY_HEAD, COMMENT_CATEGORIES));
    return { label: label.name, confidence: label.probability, category: category.name };
  }
  if (isLegacyModel(names)) {
    const legacy = mostLikely(softmax(logits, LEGACY_MODERATION_LABELS));
    return {
      label: legacy.name === 'invalid' ? 'invalid' : 'valid',
      confidence: legacy.probability,
      category: LEGACY_CATEGORIES[legacy.name],
    };
  }
  return null;
}

const VALID_CATEGORIES: ReadonlySet<CommentCategory> = new Set(['statement', 'question', 'off_topic']);

function reasonFor(prediction: CommentPrediction): string {
  const isValid = prediction.label === 'valid';
  const categoryAgrees = prediction.category !== null && VALID_CATEGORIES.has(prediction.category) === isValid;
  if (categoryAgrees) return CATEGORY_REASONS[prediction.category!];
  return isValid ? VALID_REASON : INVALID_REASON;
}

export function toCommentAnalysis(prediction: CommentPrediction): AiCommentAnalysis {
  const isValid = prediction.label === 'valid';
  return {
    is_valid: isValid,
    is_question: isValid && prediction.category === 'question',
    category: prediction.category,
    confidence: prediction.confidence,
    reason: reasonFor(prediction),
  };
}
