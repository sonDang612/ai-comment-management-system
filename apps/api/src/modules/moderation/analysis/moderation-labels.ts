import type { AiCommentAnalysis } from '@acms/shared';

export const MODERATION_LABELS = ['valid', 'question', 'invalid'] as const;
export type ModerationLabel = (typeof MODERATION_LABELS)[number];

export const MAX_INPUT_CHARS = 2_000;
const PROBABILITY_SUM_TOLERANCE = 0.01;

export const DEFAULT_REASONS: Record<ModerationLabel, string> = {
  valid: '评论内容正常,未发现违规',
  question: '用户向网站运营方提问,需要人工回复',
  invalid: '评论内容违规',
};

export interface LabelPrediction {
  label: ModerationLabel;
  confidence: number;
}

export function isModerationLabel(value: unknown): value is ModerationLabel {
  return typeof value === 'string' && (MODERATION_LABELS as readonly string[]).includes(value);
}

export function hasExactlyModerationLabels(labels: readonly string[]): boolean {
  return labels.length === MODERATION_LABELS.length && MODERATION_LABELS.every((label) => labels.includes(label));
}

export function topPrediction(scores: readonly { label: string; score: number }[]): LabelPrediction | null {
  if (!hasExactlyModerationLabels(scores.map((score) => score.label))) return null;
  if (!scores.every((score) => Number.isFinite(score.score) && score.score >= 0 && score.score <= 1)) return null;
  const total = scores.reduce((sum, score) => sum + score.score, 0);
  if (Math.abs(total - 1) > PROBABILITY_SUM_TOLERANCE) return null;
  const best = scores.reduce((top, score) => (score.score > top.score ? score : top));
  return isModerationLabel(best.label) ? { label: best.label, confidence: best.score } : null;
}

export function toCommentAnalysis(prediction: LabelPrediction): AiCommentAnalysis {
  return {
    is_valid: prediction.label !== 'invalid',
    is_question: prediction.label === 'question',
    confidence: prediction.confidence,
    reason: DEFAULT_REASONS[prediction.label],
  };
}
