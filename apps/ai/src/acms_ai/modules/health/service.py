"""Readiness probes. Register a probe per dependency (e.g. the loaded model, vLLM endpoint)."""

import asyncio
import logging
import time
from collections.abc import Awaitable, Callable

from acms_ai.modules.health.schemas import ComponentHealth, HealthResponse
from acms_ai.server.config import get_settings

logger = logging.getLogger(__name__)

Probe = Callable[[], Awaitable[object]]

# No external dependencies yet. Add e.g. {"model": check_model_loaded} when inference lands.
DEFAULT_PROBES: dict[str, Probe] = {}
PROBE_TIMEOUT_SECONDS = 2.0


async def _run_probe(name: str, probe: Probe) -> ComponentHealth:
    start = time.perf_counter()
    try:
        async with asyncio.timeout(PROBE_TIMEOUT_SECONDS):
            await probe()
    except Exception as exc:  # any failure means "unhealthy", never a 500
        logger.warning("Health check '%s' failed: %r", name, exc)
        return ComponentHealth(status="error", error=type(exc).__name__)
    return ComponentHealth(status="ok", latency_ms=round((time.perf_counter() - start) * 1000, 2))


async def check_health(probes: dict[str, Probe] | None = None) -> HealthResponse:
    settings = get_settings()
    probes = DEFAULT_PROBES if probes is None else probes
    names = list(probes)
    results = await asyncio.gather(*(_run_probe(name, probes[name]) for name in names))
    checks = dict(zip(names, results, strict=True))
    return HealthResponse(
        status="ok" if all(c.status == "ok" for c in checks.values()) else "degraded",
        service=settings.app_name,
        version=settings.app_version,
        environment=settings.app_env,
        checks=checks,
    )
