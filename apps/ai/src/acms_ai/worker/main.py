"""Worker entrypoint: consume the AI jobs queue until SIGINT/SIGTERM."""

import asyncio
import contextlib
import logging
import os
import signal
import socket
import time

from bullmq import Worker

from acms_ai.core.logging import configure_logging
from acms_ai.worker.config import WorkerSettings, get_settings
from acms_ai.worker.processor import process

logger = logging.getLogger(__name__)


async def _heartbeat(settings: WorkerSettings) -> None:
    while True:
        settings.heartbeat_file.write_text(str(time.time()))
        await asyncio.sleep(settings.heartbeat_interval_seconds)


async def main() -> None:
    settings = get_settings()
    configure_logging(settings.log_level, settings.log_format)

    stop = asyncio.Event()
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        # Not supported on Windows; there Ctrl+C raises KeyboardInterrupt instead.
        with contextlib.suppress(NotImplementedError):
            loop.add_signal_handler(sig, stop.set)

    worker = Worker(
        settings.queue_name,
        process,
        {
            "connection": str(settings.redis_url),
            "prefix": settings.queue_prefix,
            "concurrency": settings.worker_concurrency,
            "lockDuration": settings.lock_duration_ms,
            # Unique per process: the API counts connected workers by distinct name.
            "name": f"{settings.app_name}-{socket.gethostname()}-{os.getpid()}",
        },
    )
    heartbeat = asyncio.create_task(_heartbeat(settings))
    logger.info(
        "Worker started: queue=%s concurrency=%d",
        settings.queue_name,
        settings.worker_concurrency,
    )
    try:
        await stop.wait()
    finally:
        logger.info("Shutting down: waiting for active jobs to finish")
        heartbeat.cancel()
        await worker.close()
        settings.heartbeat_file.unlink(missing_ok=True)
        logger.info("Worker stopped")


def run() -> None:
    with contextlib.suppress(KeyboardInterrupt):
        asyncio.run(main())
