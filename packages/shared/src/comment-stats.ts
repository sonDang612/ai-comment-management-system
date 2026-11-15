import type { CommentCategory } from './comments.js';

export const COMMENT_STATS_DAY_OPTIONS = [7, 14, 30] as const;
export const DEFAULT_COMMENT_STATS_DAYS = 14;
export const MAX_COMMENT_STATS_DAYS = 90;

export const COMMENT_OUTCOMES = ['valid', 'invalid', 'rule_blocked', 'no_result', 'unchecked'] as const;
export type CommentOutcome = (typeof COMMENT_OUTCOMES)[number];

export type CommentOutcomeCounts = Record<CommentOutcome, number>;

export interface CommentStatsQuery {
  days?: number;
}

export interface CommentDailyStats extends CommentOutcomeCounts {
  date: string;
  total: number;
}

export interface CommentCategoryCount {
  category: CommentCategory;
  count: number;
}

export interface CommentLatencyStats {
  average_seconds: number | null;
  p95_seconds: number | null;
}

export interface CommentStatsResponse {
  days: number;
  from: string;
  to: string;
  total_all_time: number;
  total: number;
  today: number;
  outcomes: CommentOutcomeCounts;
  daily: CommentDailyStats[];
  categories: CommentCategoryCount[];
  latency: CommentLatencyStats;
}
