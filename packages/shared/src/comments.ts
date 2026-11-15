export const COMMENT_CONTENT_MAX_LENGTH = 10_000;

export const COMMENT_CATEGORIES = [
  'statement',
  'question',
  'off_topic',
  'toxic',
  'sexual',
  'spam',
  'gibberish',
  'advertisement',
  'scam',
  'privacy',
  'illegal',
  'political',
] as const;
export type CommentCategory = (typeof COMMENT_CATEGORIES)[number];

export const MODERATION_LABELS = ['valid', 'invalid'] as const;
export type ModerationLabel = (typeof MODERATION_LABELS)[number];

export const VALID_COMMENT_CATEGORIES: readonly CommentCategory[] = ['statement', 'question', 'off_topic'];

export function categoryMatchesLabel(category: CommentCategory, label: ModerationLabel): boolean {
  return VALID_COMMENT_CATEGORIES.includes(category) === (label === 'valid');
}

export const DECISION_SOURCES = ['rule_filter', 'ai_model', 'admin'] as const;
export type DecisionSource = (typeof DECISION_SOURCES)[number];

export interface CommentReview {
  label: ModerationLabel;
  category: CommentCategory;
  reviewed_at: string;
}

export interface ReviewCommentRequest {
  label: ModerationLabel;
  category: CommentCategory;
}

export interface CreateCommentRequest {
  content: string;
}

export interface ModelOutputScore {
  label: string;
  score: number;
}

export interface ModelOutputProbability {
  name: string;
  probability: number;
}

export interface CommentModelOutput {
  scores: ModelOutputScore[];
  label_probabilities: ModelOutputProbability[];
  category_probabilities: ModelOutputProbability[];
}

export interface CommentDto {
  id: string;
  content: string;
  category: CommentCategory | null;
  reason: string | null;
  model_output: CommentModelOutput | null;
  decided_by: DecisionSource | null;
  review: CommentReview | null;
  moderated_at: string | null;
  created_at: string;
  updated_at: string;
}

export const COMMENT_PAGE_SIZES = [20, 50, 100] as const;
export const DEFAULT_COMMENT_PAGE_SIZE = 20;
export const MAX_COMMENT_PAGE_SIZE = 100;
export const COMMENT_SEARCH_MAX_LENGTH = 200;
export const COMMENT_SORT_ORDERS = ['desc', 'asc'] as const;
export type CommentSortOrder = (typeof COMMENT_SORT_ORDERS)[number];
export const DEFAULT_COMMENT_SORT_ORDER: CommentSortOrder = 'desc';

export interface CommentListQuery {
  page?: number;
  page_size?: number;
  q?: string;
  order?: CommentSortOrder;
}

export interface CommentListResponse {
  items: CommentDto[];
  total: number;
  page: number;
  page_size: number;
}

export interface AiCommentAnalysisRequest {
  comment_id: string;
  content: string;
}

export interface AiCommentAnalysis {
  is_valid: boolean;
  is_question: boolean;
  category: CommentCategory | null;
  confidence: number;
  reason: string;
}
