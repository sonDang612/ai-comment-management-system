/**
 * HTTP contracts of the NestJS API (apps/api), shared with its TypeScript consumers.
 * The Python AI server uses the same envelope (apps/ai/src/acms_ai/server/errors.py).
 */

export const API_V1_PREFIX = '/api/v1';

/** Machine-readable error codes emitted by the API error handlers. */
export const ErrorCode = {
  BAD_REQUEST: "bad_request",
  UNAUTHORIZED: "unauthorized",
  FORBIDDEN: "forbidden",
  NOT_FOUND: "not_found",
  CONFLICT: "conflict",
  VALIDATION_ERROR: "validation_error",
  RATE_LIMITED: "rate_limited",
  SERVICE_UNAVAILABLE: "service_unavailable",
  INTERNAL_ERROR: "internal_error",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/** Error envelope returned by every non-2xx API response. */
export interface ApiErrorBody {
  error: {
    code: ErrorCode | (string & {});
    message: string;
    details?: unknown;
    request_id?: string | null;
  };
}

export function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== "object" || value === null || !("error" in value)) return false;
  const error = (value as { error: unknown }).error;
  return (
    typeof error === "object" &&
    error !== null &&
    typeof (error as { code?: unknown }).code === "string" &&
    typeof (error as { message?: unknown }).message === "string"
  );
}
