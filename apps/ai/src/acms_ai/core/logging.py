"""Logging setup shared by the server and the worker (stdlib only)."""

import json
import logging
import logging.config
from datetime import datetime
from typing import Any

from acms_ai.core.context import get_request_id
from acms_ai.core.timezone import APP_TZ

# Attributes present on every LogRecord; anything else was passed via `extra=` and is logged.
_RESERVED = set(vars(logging.makeLogRecord({}))) | {"message", "asctime", "request_id"}


class RequestIdFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = get_request_id() or "-"
        return True


class AppTimeFormatter(logging.Formatter):
    """Timestamps in the project time zone (UTC+8), ISO 8601 with offset, whatever the host zone."""

    def formatTime(self, record: logging.LogRecord, datefmt: str | None = None) -> str:
        ts = datetime.fromtimestamp(record.created, tz=APP_TZ)
        return ts.strftime(datefmt) if datefmt else ts.isoformat(timespec="milliseconds")


class JsonFormatter(AppTimeFormatter):
    """One JSON object per line: easy to ship to Loki/ELK/CloudWatch."""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "ts": self.formatTime(record),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": getattr(record, "request_id", None),
        }
        payload.update({k: v for k, v in vars(record).items() if k not in _RESERVED})
        if record.exc_info:
            payload["exc_info"] = self.formatException(record.exc_info)
        return json.dumps(payload, default=str, ensure_ascii=False)


def configure_logging(level: str = "INFO", fmt: str = "text") -> None:
    formatter = (
        {"()": JsonFormatter}
        if fmt == "json"
        else {
            "()": AppTimeFormatter,
            "fmt": "%(asctime)s %(levelname)-8s [%(request_id)s] %(name)s: %(message)s",
        }
    )
    logging.config.dictConfig(
        {
            "version": 1,
            "disable_existing_loggers": False,
            "filters": {"request_id": {"()": RequestIdFilter}},
            "formatters": {"default": formatter},
            "handlers": {
                "console": {
                    "class": "logging.StreamHandler",
                    "formatter": "default",
                    "filters": ["request_id"],
                }
            },
            "root": {"level": level, "handlers": ["console"]},
            "loggers": {
                # Route uvicorn through our handler; access logs come from our middleware.
                "uvicorn": {"handlers": [], "propagate": True},
                "uvicorn.error": {"handlers": [], "propagate": True},
                "uvicorn.access": {"handlers": [], "propagate": False},
            },
        }
    )
