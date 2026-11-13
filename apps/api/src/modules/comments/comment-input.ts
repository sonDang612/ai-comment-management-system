import {
  COMMENT_CONTENT_MAX_LENGTH,
  CommentStatus,
  type CreateCommentRequest,
  DEFAULT_COMMENT_PAGE_SIZE,
  MAX_COMMENT_PAGE_SIZE,
} from '@acms/shared';
import { ValidationException } from '../../common/errors/app.exception.js';

export interface CommentListParams {
  page: number;
  pageSize: number;
  status: CommentStatus | undefined;
}

export interface RawCommentListQuery {
  page?: string;
  page_size?: string;
  status?: string;
}

const COMMENT_STATUSES = new Set<string>(Object.values(CommentStatus));

export function parseCreateCommentRequest(body: unknown): CreateCommentRequest {
  const content =
    typeof body === 'object' && body !== null ? (body as Record<string, unknown>)['content'] : undefined;
  if (typeof content !== 'string') {
    throw new ValidationException('content must be a string', [{ field: 'content', rule: 'string' }]);
  }
  const trimmed = content.trim();
  if (trimmed.length === 0) {
    throw new ValidationException('content must not be empty', [{ field: 'content', rule: 'required' }]);
  }
  if (trimmed.length > COMMENT_CONTENT_MAX_LENGTH) {
    throw new ValidationException(`content must be at most ${COMMENT_CONTENT_MAX_LENGTH} characters`, [
      { field: 'content', rule: 'max_length', max: COMMENT_CONTENT_MAX_LENGTH },
    ]);
  }
  return { content: trimmed };
}

function parsePositiveInt(field: string, raw: string | undefined, fallback: number, max?: number): number {
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || (max !== undefined && value > max)) {
    const range = max === undefined ? 'a positive integer' : `an integer between 1 and ${max}`;
    throw new ValidationException(`${field} must be ${range}`, [
      { field, rule: 'range', min: 1, ...(max === undefined ? {} : { max }) },
    ]);
  }
  return value;
}

function parseStatus(raw: string | undefined): CommentStatus | undefined {
  if (raw === undefined || raw === '') return undefined;
  if (!COMMENT_STATUSES.has(raw)) {
    throw new ValidationException(`status must be one of: ${[...COMMENT_STATUSES].join(', ')}`, [
      { field: 'status', rule: 'enum', allowed: [...COMMENT_STATUSES] },
    ]);
  }
  return raw as CommentStatus;
}

export function parseCommentListQuery(query: RawCommentListQuery): CommentListParams {
  return {
    page: parsePositiveInt('page', query.page, 1),
    pageSize: parsePositiveInt('page_size', query.page_size, DEFAULT_COMMENT_PAGE_SIZE, MAX_COMMENT_PAGE_SIZE),
    status: parseStatus(query.status),
  };
}
