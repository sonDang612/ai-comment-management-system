export const CommentStatus = {
  APPROVED: 'approved',
  PENDING: 'pending',
  DISABLED: 'disabled',
} as const;
export type CommentStatus = (typeof CommentStatus)[keyof typeof CommentStatus];

export const DecidedBy = {
  WHITELIST: 'whitelist',
  RULE_FILTER: 'rule_filter',
  AI_MODEL: 'ai_model',
  ADMIN: 'admin',
} as const;
export type DecidedBy = (typeof DecidedBy)[keyof typeof DecidedBy];

export const COMMENT_CONTENT_MAX_LENGTH = 10_000;

export interface CreateCommentRequest {
  content: string;
}

export interface CommentDto {
  id: string;
  content: string;
  status: CommentStatus;
  reason: string | null;
  confidence: number | null;
  decided_by: DecidedBy | null;
  moderated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommentListResponse {
  items: CommentDto[];
}

export interface AiModerationRequest {
  comment_id: string;
  content: string;
}

export interface AiModerationResult {
  comment_id: string;
  decision: CommentStatus;
  category: string | null;
  violation_type: string | null;
  labels: string[];
  confidence: number;
  reason: string;
  decided_by: DecidedBy;
  model_version: string;
}
