from fastapi import APIRouter, Response, status

from acms_ai.core.responses import ApiResponse, success
from acms_ai.modules.health import service
from acms_ai.modules.health.schemas import HealthResponse, LivenessResponse

router = APIRouter(prefix="/health", tags=["health"])


@router.get(
    "",
    response_model=ApiResponse[HealthResponse],
    responses={
        503: {"model": ApiResponse[HealthResponse], "description": "A dependency is unavailable"}
    },
    summary="Readiness: checks registered AI dependencies",
)
async def health(response: Response) -> ApiResponse[HealthResponse]:
    result = await service.check_health()
    if result.status != "ok":
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return success(result, response.status_code or status.HTTP_200_OK)


@router.get(
    "/live", response_model=ApiResponse[LivenessResponse], summary="Liveness: process is up"
)
async def liveness() -> ApiResponse[LivenessResponse]:
    return success(LivenessResponse())
