import type { AiCommentAnalysis } from '@acms/shared';
import type { VllmTokenLogprob, VllmTopLogprob } from '../../../infrastructure/vllm/vllm.client.js';
import { DEFAULT_REASONS, MAX_REASON_CHARS, MODERATION_LABELS, type ModerationLabel } from './moderation-prompt.js';

const LABEL_VALUE_START_PATTERN = /"label"\s*:\s*"/;
const TOKEN_PREFIX_PATTERN = /^[\s"]+/;

export interface ModerationAnswer {
  label: ModerationLabel;
  reason: string;
}

function isModerationLabel(value: unknown): value is ModerationLabel {
  return typeof value === 'string' && (MODERATION_LABELS as readonly string[]).includes(value);
}

export function parseModerationAnswer(content: string): ModerationAnswer | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const answer = parsed as Record<string, unknown>;
  const label = answer['label'];
  const reason = answer['reason'];
  if (!isModerationLabel(label) || typeof reason !== 'string') return null;
  return { label, reason };
}

function labelsMatchingToken(token: string): ModerationLabel[] {
  const piece = token.replace(TOKEN_PREFIX_PATTERN, '').toLowerCase();
  if (piece === '') return [];
  return MODERATION_LABELS.filter((label) => label.startsWith(piece) || piece.startsWith(label));
}

function labelProbabilities(alternatives: VllmTopLogprob[]): Map<ModerationLabel, number> {
  const probabilities = new Map<ModerationLabel, number>();
  const seen = new Set<string>();
  for (const alternative of alternatives) {
    if (seen.has(alternative.token)) continue;
    seen.add(alternative.token);
    const labels = labelsMatchingToken(alternative.token);
    const share = Math.exp(alternative.logprob) / labels.length;
    for (const label of labels) probabilities.set(label, (probabilities.get(label) ?? 0) + share);
  }
  return probabilities;
}

export function labelConfidence(
  content: string,
  logprobs: VllmTokenLogprob[],
  label: ModerationLabel,
): number | null {
  const match = LABEL_VALUE_START_PATTERN.exec(content);
  if (!match) return null;
  const valueStart = match.index + match[0].length;

  let offset = 0;
  for (const entry of logprobs) {
    offset += entry.token.length;
    if (offset <= valueStart) continue;
    const probabilities = labelProbabilities([entry, ...entry.top_logprobs]);
    const total = [...probabilities.values()].reduce((sum, value) => sum + value, 0);
    const chosen = probabilities.get(label) ?? 0;
    if (total <= 0 || chosen <= 0) return null;
    return Math.min(1, chosen / total);
  }
  return null;
}

export function toCommentAnalysis(answer: ModerationAnswer, confidence: number): AiCommentAnalysis {
  const reason = [...answer.reason.trim()].slice(0, MAX_REASON_CHARS).join('');
  return {
    is_valid: answer.label !== 'invalid',
    is_question: answer.label === 'question',
    confidence,
    reason: reason || DEFAULT_REASONS[answer.label],
  };
}
