"""BullMQ processor: dispatches each job to its registered handler."""

import logging
import time
from typing import Any

from bullmq import Job, UnrecoverableError

from acms_ai.worker.jobs import HANDLERS, JobHandler

logger = logging.getLogger(__name__)


async def process(
    job: Job,
    token: str,
    signal: Any = None,
    *,
    handlers: dict[str, JobHandler] | None = None,
) -> Any:
    """Called by BullMQ as `process(job, token, signal)`; `signal` is set when the job is
    cancelled. `handlers` is keyword-only so the library can never bind a positional to it."""
    handler = (handlers or HANDLERS).get(job.name)
    if handler is None:
        # Not retryable: retrying an unknown job name can never succeed.
        raise UnrecoverableError(f"No handler registered for job '{job.name}'")

    start = time.perf_counter()
    extra = {"job_id": job.id, "job_name": job.name, "attempt": job.attemptsMade + 1}
    logger.info("Job started", extra=extra)
    try:
        result = await handler(job.data or {})
    except Exception:
        logger.exception("Job failed", extra=extra)
        raise  # BullMQ records the failure and applies the job's retry/backoff options
    logger.info(
        "Job completed",
        extra={**extra, "duration_ms": round((time.perf_counter() - start) * 1000, 2)},
    )
    return result
