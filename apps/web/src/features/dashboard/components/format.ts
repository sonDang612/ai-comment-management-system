import { APP_UTC_OFFSET } from "@acms/shared";
import type { Locale } from "@/i18n/config";
import { formatDateTime } from "@/lib/datetime";

const SHARE_FRACTION_DIGITS = 1;
const SECONDS_FRACTION_DIGITS = 2;

export function formatCount(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale).format(value);
}

export function formatShare(part: number, whole: number, locale: Locale): string | null {
  if (whole === 0) return null;
  return new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: SHARE_FRACTION_DIGITS,
    maximumFractionDigits: SHARE_FRACTION_DIGITS,
  }).format(part / whole);
}

export function formatSecondsValue(seconds: number): string {
  return seconds.toFixed(SECONDS_FRACTION_DIGITS);
}

export function formatDayKey(date: string, locale: Locale): string {
  return formatDateTime(`${date}T00:00:00${APP_UTC_OFFSET}`, locale, {
    year: undefined,
    hour: undefined,
    minute: undefined,
    second: undefined,
  });
}
