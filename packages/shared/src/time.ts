/**
 * Time zone of the project: UTC+8 (China Standard Time, no daylight saving time).
 *
 * Rules (all apps):
 * - Store and transfer instants in UTC: DB columns are `timestamptz`, JSON uses ISO 8601 with
 *   an offset (`2026-11-13T09:30:00.000Z`). Never send a local time without an offset.
 * - Interpret "a day", "this month", schedules and reports in `APP_TIME_ZONE`, not in the
 *   server's or the browser's local zone.
 * - Display every date/time in `APP_TIME_ZONE` (web: `formatDateTime` in `apps/web/src/lib/datetime.ts`).
 *
 * Python mirrors this in `apps/ai/src/acms_ai/core/timezone.py`.
 */
export const APP_TIME_ZONE = 'Asia/Shanghai';

/** Fixed offset of `APP_TIME_ZONE` (it has no DST, so this never changes). */
export const APP_UTC_OFFSET = '+08:00';
