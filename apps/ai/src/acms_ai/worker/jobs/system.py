"""Infrastructure jobs (no business logic)."""

from datetime import UTC, datetime
from typing import Any

PING = "system.ping"


async def ping(data: dict[str, Any]) -> dict[str, Any]:
    """Round-trip check: NestJS enqueues `system.ping`, the result comes back via BullMQ."""
    return {"pong": True, "echo": data.get("echo"), "processed_at": datetime.now(UTC).isoformat()}
