import {
  COMMENT_SEARCH_MAX_LENGTH,
  COMMENT_SORT_ORDERS,
  type CommentSortOrder,
  DEFAULT_COMMENT_SORT_ORDER,
  DEFAULT_COMMENT_PAGE_SIZE,
  DEFAULT_COMMENT_STATS_DAYS,
  MAX_COMMENT_PAGE_SIZE,
  MAX_COMMENT_STATS_DAYS,
} from '@acms/shared';
import { ValidationException } from '../../common/errors/app.exception.js';

export interface CommentListParams {
  page: number;
  pageSize: number;
  search: string | undefined;
  order: CommentSortOrder;
}

export interface RawCommentListQuery {
  page?: string;
  page_size?: string;
  q?: string;
  order?: string;
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

function parseSortOrder(raw: string | undefined): CommentSortOrder {
  if (raw === undefined || raw === '') return DEFAULT_COMMENT_SORT_ORDER;
  const order = COMMENT_SORT_ORDERS.find((item) => item === raw);
  if (order === undefined) {
    throw new ValidationException(`order must be one of ${COMMENT_SORT_ORDERS.join(', ')}`, [
      { field: 'order', rule: 'one_of', allowed: [...COMMENT_SORT_ORDERS] },
    ]);
  }
  return order;
}

export interface RawCommentStatsQuery {
  days?: string;
}

export function parseCommentStatsDays(query: RawCommentStatsQuery): number {
  return parsePositiveInt('days', query.days, DEFAULT_COMMENT_STATS_DAYS, MAX_COMMENT_STATS_DAYS);
}

export function parseCommentListQuery(query: RawCommentListQuery): CommentListParams {
  return {
    page: parsePositiveInt('page', query.page, 1),
    pageSize: parsePositiveInt('page_size', query.page_size, DEFAULT_COMMENT_PAGE_SIZE, MAX_COMMENT_PAGE_SIZE),
    search: parseSearch(query.q),
    order: parseSortOrder(query.order),
  };
}
