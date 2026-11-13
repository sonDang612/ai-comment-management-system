import type { Dictionary } from "@/i18n";
import { ApiError } from "./errors";

/**
 * User-facing, translated message for a failed request, chosen by the error `code`.
 * The API's own `message` is English and meant for logs; it is only shown as a last resort.
 */
export function apiErrorMessage(error: unknown, dict: Dictionary): string {
  const messages: Record<string, string> = dict.apiErrors;
  if (error instanceof ApiError) return messages[error.code] ?? error.message;
  return messages.internal_error;
}
