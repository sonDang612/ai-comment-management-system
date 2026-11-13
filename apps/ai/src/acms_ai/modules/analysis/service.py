from typing import Protocol

from acms_ai.modules.analysis.schemas import CommentAnalysis, CommentAnalysisRequest

STUB_REASON = "AI 分析尚未启用,默认视为有效评论"


class CommentAnalyzer(Protocol):
    async def analyze(self, request: CommentAnalysisRequest) -> CommentAnalysis: ...


class StubCommentAnalyzer:
    async def analyze(self, request: CommentAnalysisRequest) -> CommentAnalysis:
        return CommentAnalysis(
            is_valid=True,
            is_question=False,
            confidence=1.0,
            reason=STUB_REASON,
        )


_default_analyzer = StubCommentAnalyzer()


def get_comment_analyzer() -> CommentAnalyzer:
    return _default_analyzer
