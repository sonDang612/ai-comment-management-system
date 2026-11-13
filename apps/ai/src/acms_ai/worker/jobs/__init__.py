"""Job handler registry: BullMQ job name -> async handler.

Job names and payload shapes are a contract with the NestJS producer; they are mirrored in
`packages/shared/src/jobs.ts`. Handlers must be idempotent (jobs can be retried) and return
JSON-serializable results (stored by BullMQ as the job's `returnvalue`).
"""

from collections.abc import Awaitable, Callable
from typing import Any

from acms_ai.worker.jobs import system

JobHandler = Callable[[dict[str, Any]], Awaitable[Any]]

HANDLERS: dict[str, JobHandler] = {
    system.PING: system.ping,
}
