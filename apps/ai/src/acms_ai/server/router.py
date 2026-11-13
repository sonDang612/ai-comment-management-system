"""Route registry.

- `/health*`: unauthenticated (container orchestration, NestJS health aggregation).
- `/v1/*`:    internal inference API, requires `X-Internal-Token` (called only by NestJS).
"""

from fastapi import APIRouter, Depends

from acms_ai.modules.health.router import router as health_router
from acms_ai.server.security import require_internal_token

public_router = APIRouter()
public_router.include_router(health_router)

# Mount inference module routers here, e.g. v1_router.include_router(moderation_router).
v1_router = APIRouter(dependencies=[Depends(require_internal_token)])
