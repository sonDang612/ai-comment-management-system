"""Project time zone: UTC+8 (mirrors `APP_TIME_ZONE` in `packages/shared/src/time.ts`).

A fixed offset is exact here because Asia/Shanghai has no DST, and it needs no tz database
(`zoneinfo` would require the `tzdata` package on Windows and in slim images).

Rules: exchange instants as timezone-aware UTC/ISO 8601 values; use `APP_TZ` only to decide
local calendar boundaries ("today", "this month") and to render times for people.
"""

from datetime import UTC, datetime, timedelta, timezone

APP_TIME_ZONE = "Asia/Shanghai"
APP_TZ = timezone(timedelta(hours=8), APP_TIME_ZONE)


def now_utc() -> datetime:
    return datetime.now(UTC)


def now_local() -> datetime:
    """Current time in the project time zone (UTC+8)."""
    return datetime.now(APP_TZ)
