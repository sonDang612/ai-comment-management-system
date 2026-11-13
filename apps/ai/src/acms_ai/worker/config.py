"""Worker settings."""

from functools import lru_cache
from pathlib import Path
from tempfile import gettempdir

from pydantic import RedisDsn

from acms_ai.core.config import CommonSettings


class WorkerSettings(CommonSettings):
    app_name: str = "acms-ai-worker"

    # BullMQ: must match the NestJS producer (same Redis db, queue name and key prefix).
    redis_url: RedisDsn = RedisDsn("redis://localhost:6379/0")
    queue_name: str = "ai-jobs"
    queue_prefix: str = "bull"
    worker_concurrency: int = 2
    # Milliseconds a job may run before its lock must be renewed (BullMQ renews automatically).
    lock_duration_ms: int = 60_000

    # Liveness: the worker touches this file periodically; the Docker healthcheck reads it.
    heartbeat_file: Path = Path(gettempdir()) / "acms-ai-worker.heartbeat"
    heartbeat_interval_seconds: float = 10.0


@lru_cache
def get_settings() -> WorkerSettings:
    return WorkerSettings()
