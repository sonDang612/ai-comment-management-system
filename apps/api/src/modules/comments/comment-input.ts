import {
  APP_DATE_KEY_PATTERN,
  appDateKey,
  startOfAppDateKey,
  COMMENT_SEARCH_MAX_LENGTH,
  COMMENT_SORT_ORDERS,
  DECISION_SOURCES,
  type DecisionSource,
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
  decidedBy: DecisionSource | undefined;
  createdFrom: Date | undefined;
  createdBefore: Date | undefined;
}

export interface RawCommentListQuery {
  page?: string;
  page_size?: string;
  q?: string;
  order?: string;
  decided_by?: string;
  from?: string;
  to?: string;
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

function parseDecisionSource(raw: string | undefined): DecisionSource | undefined {
  if (raw === undefined || raw === '') return undefined;
  const source = DECISION_SOURCES.find((item) => item === raw);
  if (source === undefined) {
    throw new ValidationException(`decided_by must be one of ${DECISION_SOURCES.join(', ')}`, [
      { field: 'decided_by', rule: 'one_of', allowed: [...DECISION_SOURCES] },
    ]);
  }
  return source;
}

const MILLISECONDS_PER_DAY = 86_400_000;

function parseDateKey(field: string, raw: string | undefined): Date | undefined {
  if (raw === undefined || raw === '') return undefined;
  const start = APP_DATE_KEY_PATTERN.test(raw) ? startOfAppDateKey(raw) : null;
  if (!start || Number.isNaN(start.getTime()) || appDateKey(start) !== raw) {
    throw new ValidationException(`${field} must be a date in YYYY-MM-DD format`, [
      { field, rule: 'date_format', format: 'YYYY-MM-DD' },
    ]);
  }
  return start;
}

function parseCreatedRange(query: RawCommentListQuery): Pick<CommentListParams, 'createdFrom' | 'createdBefore'> {
  const createdFrom = parseDateKey('from', query.from);
  const lastDay = parseDateKey('to', query.to);
  if (createdFrom && lastDay && createdFrom > lastDay) {
    throw new ValidationException('from must not be after to', [{ field: 'from', rule: 'not_after', other: 'to' }]);
  }
  const createdBefore = lastDay ? new Date(lastDay.getTime() + MILLISECONDS_PER_DAY) : undefined;
  return { createdFrom, createdBefore };
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
    decidedBy: parseDecisionSource(query.decided_by),
    ...parseCreatedRange(query),
  };
}
