import {
  APP_TIME_ZONE,
  APP_UTC_OFFSET,
  COMMENT_OUTCOMES,
  type CommentCategory,
  type CommentOutcome,
  type CommentOutcomeCounts,
} from '@acms/shared';
import { isOutputScoreList, predictFromLogits } from '../moderation/analysis/moderation-labels.js';

const MILLISECONDS_PER_DAY = 86_400_000;
const MILLISECONDS_PER_SECOND = 1000;
const P95 = 0.95;

const dateKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export interface StatsCommentRow {
  reason: string | null;
  aiScores: unknown;
  moderatedAt: Date | null;
  createdAt: Date;
}

export interface ClassifiedComment {
  outcome: CommentOutcome;
  category: CommentCategory | null;
}

export function appDateKey(instant: Date): string {
  return dateKeyFormatter.format(instant);
}

export function startOfAppDay(instant: Date): Date {
  return new Date(`${appDateKey(instant)}T00:00:00${APP_UTC_OFFSET}`);
}

export function appDayKeys(firstDay: Date, days: number): string[] {
  return Array.from({ length: days }, (_, index) =>
    appDateKey(new Date(firstDay.getTime() + index * MILLISECONDS_PER_DAY)),
  );
}

export function daysBefore(day: Date, days: number): Date {
  return new Date(day.getTime() - days * MILLISECONDS_PER_DAY);
}

export function emptyOutcomeCounts(): CommentOutcomeCounts {
  return Object.fromEntries(COMMENT_OUTCOMES.map((outcome) => [outcome, 0])) as CommentOutcomeCounts;
}

export function classifyComment(row: StatsCommentRow): ClassifiedComment {
  if (!row.moderatedAt) return { outcome: 'unchecked', category: null };
  const prediction = isOutputScoreList(row.aiScores) ? predictFromLogits(row.aiScores) : null;
  if (prediction) return { outcome: prediction.label, category: prediction.category };
  return { outcome: row.reason ? 'rule_blocked' : 'no_result', category: null };
}

export function checkSeconds(row: StatsCommentRow): number | null {
  if (!row.moderatedAt) return null;
  return (row.moderatedAt.getTime() - row.createdAt.getTime()) / MILLISECONDS_PER_SECOND;
}

export function average(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function percentile95(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * P95) - 1)]!;
}
