from fastapi import APIRouter, Response, status

from acms_ai.modules.health import service
from acms_ai.modules.health.schemas import HealthResponse, LivenessResponse

router = APIRouter(prefix="/health", tags=["health"])


@router.get(
    "",
    response_model=HealthResponse,
    responses={503: {"model": HealthResponse, "description": "A dependency is unavailable"}},
    summary="Readiness: checks registered AI dependencies",
)
async def health(response: Response) -> HealthResponse:
    result = await service.check_health()
    if result.status != "ok":
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return result


@router.get("/live", response_model=LivenessResponse, summary="Liveness: process is up")
async def liveness() -> LivenessResponse:
    return LivenessResponse()
