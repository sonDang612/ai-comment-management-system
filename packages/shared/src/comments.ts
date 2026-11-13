export const COMMENT_CONTENT_MAX_LENGTH = 10_000;

export interface CreateCommentRequest {
  content: string;
}

export interface CommentDto {
  id: string;
  content: string;
  is_valid: boolean | null;
  is_question: boolean | null;
  confidence: number | null;
  reason: string | null;
  moderated_at: string | null;
  created_at: string;
  updated_at: string;
}

export const COMMENT_PAGE_SIZES = [20, 50, 100] as const;
export const DEFAULT_COMMENT_PAGE_SIZE = 20;
export const MAX_COMMENT_PAGE_SIZE = 100;
export const COMMENT_SEARCH_MAX_LENGTH = 200;

export interface CommentListQuery {
  page?: number;
  page_size?: number;
  is_valid?: boolean;
  q?: string;
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
  confidence: number;
  reason: string;
}
