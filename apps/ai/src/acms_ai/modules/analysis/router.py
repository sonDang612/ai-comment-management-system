from typing import Annotated

from fastapi import APIRouter, Depends

from acms_ai.core.responses import ApiResponse, success
from acms_ai.modules.analysis.schemas import CommentAnalysis, CommentAnalysisRequest
from acms_ai.modules.analysis.service import CommentAnalyzer, get_comment_analyzer

router = APIRouter(prefix="/analysis", tags=["analysis"])


@router.post(
    "/comments", response_model=ApiResponse[CommentAnalysis], summary="Analyze one comment"
)
async def analyze_comment(
    request: CommentAnalysisRequest,
    analyzer: Annotated[CommentAnalyzer, Depends(get_comment_analyzer)],
) -> ApiResponse[CommentAnalysis]:
    return success(await analyzer.analyze(request))
