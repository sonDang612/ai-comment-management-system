import {
  COMMENT_SEARCH_MAX_LENGTH,
  CommentStatus,
  DEFAULT_COMMENT_PAGE_SIZE,
  MAX_COMMENT_PAGE_SIZE,
} from '@acms/shared';
import { ValidationException } from '../../common/errors/app.exception.js';

export interface CommentListParams {
  page: number;
  pageSize: number;
  status: CommentStatus | undefined;
  search: string | undefined;
}

export interface RawCommentListQuery {
  page?: string;
  page_size?: string;
  status?: string;
  q?: string;
}

const COMMENT_STATUSES = new Set<string>(Object.values(CommentStatus));


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

function parseSearch(raw: string | undefined): string | undefined {
  const search = typeof raw === 'string' ? raw.trim() : '';
  if (search === '') return undefined;
  if (search.length > COMMENT_SEARCH_MAX_LENGTH) {
    throw new ValidationException(`q must be at most ${COMMENT_SEARCH_MAX_LENGTH} characters`, [
      { field: 'q', rule: 'max_length', max: COMMENT_SEARCH_MAX_LENGTH },
    ]);
  }
  return search;
}

export function parseCommentListQuery(query: RawCommentListQuery): CommentListParams {
  return {
    page: parsePositiveInt('page', query.page, 1),
    pageSize: parsePositiveInt('page_size', query.page_size, DEFAULT_COMMENT_PAGE_SIZE, MAX_COMMENT_PAGE_SIZE),
    status: parseStatus(query.status),
    search: parseSearch(query.q),
  };
}
