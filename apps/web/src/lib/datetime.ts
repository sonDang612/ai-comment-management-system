import { APP_TIME_ZONE } from "@acms/shared";
import type { Locale } from "@/i18n/config";

type DateInput = Date | string | number;

/**
 * Formats an instant for display in the project time zone (UTC+8), never the browser's zone,
 * so every user sees the same wall-clock time. The API sends instants as UTC ISO 8601 strings.
 *
 *   formatDateTime("2026-11-13T01:30:00Z", "zh-CN") -> "2026/11/13 09:30:00"
 *   formatDateTime("2026-11-13T01:30:00Z", "en")    -> "11/13/2026, 09:30:00"
 */
export function formatDateTime(
  value: DateInput,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = {},
): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    ...options,
    timeZone: APP_TIME_ZONE,
  }).format(new Date(value));
}

export function formatDate(value: DateInput, locale: Locale): string {
  return formatDateTime(value, locale, { hour: undefined, minute: undefined, second: undefined });
}

export function formatTime(value: DateInput, locale: Locale): string {
  return formatDateTime(value, locale, { year: undefined, month: undefined, day: undefined });
}
