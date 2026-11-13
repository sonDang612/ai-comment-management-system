import { COMMENT_CONTENT_MAX_LENGTH, type CreateCommentRequest } from '@acms/shared';
import { ValidationException } from '../../common/errors/app.exception.js';

const DEFAULT_LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 100;

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

export function parseListLimit(raw: string | undefined): number {
  if (raw === undefined || raw === '') return DEFAULT_LIST_LIMIT;
  const limit = Number(raw);
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIST_LIMIT) {
    throw new ValidationException(`limit must be an integer between 1 and ${MAX_LIST_LIMIT}`, [
      { field: 'limit', rule: 'range', min: 1, max: MAX_LIST_LIMIT },
    ]);
  }
  return limit;
}
