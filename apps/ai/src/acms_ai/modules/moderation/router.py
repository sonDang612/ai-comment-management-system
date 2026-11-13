from typing import Annotated

from fastapi import APIRouter, Depends

from acms_ai.core.responses import ApiResponse, success
from acms_ai.modules.moderation.schemas import ModerationRequest, ModerationResult
from acms_ai.modules.moderation.service import Moderator, get_moderator

router = APIRouter(prefix="/moderations", tags=["moderation"])


@router.post("", response_model=ApiResponse[ModerationResult], summary="Moderate one comment")
async def moderate_comment(
    request: ModerationRequest,
    moderator: Annotated[Moderator, Depends(get_moderator)],
) -> ApiResponse[ModerationResult]:
    return success(await moderator.moderate(request))
