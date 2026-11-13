import json
import logging
from datetime import timedelta

from acms_ai.core.logging import AppTimeFormatter, JsonFormatter
from acms_ai.core.timezone import APP_TZ, now_local


def _record(created: float) -> logging.LogRecord:
    record = logging.makeLogRecord({"msg": "hello", "levelname": "INFO", "name": "t"})
    record.created = created
    return record


def test_app_tz_is_utc_plus_8() -> None:
    assert now_local().utcoffset() == timedelta(hours=8)
    assert APP_TZ.utcoffset(None) == timedelta(hours=8)


def test_log_timestamps_use_utc_plus_8() -> None:
    record = _record(0.0)  # 1970-01-01T00:00:00Z
    assert AppTimeFormatter().formatTime(record) == "1970-01-01T08:00:00.000+08:00"
    assert json.loads(JsonFormatter().format(record))["ts"] == "1970-01-01T08:00:00.000+08:00"
