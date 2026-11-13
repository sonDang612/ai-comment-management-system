from typing import Protocol

from acms_ai.modules.moderation.schemas import (
    DecidedBy,
    ModerationDecision,
    ModerationRequest,
    ModerationResult,
)

APPROVE_ALL_MODEL_VERSION = "approve-all-v0/prompt-none/rules-none"
APPROVE_ALL_REASON = "默认通过,AI 审核尚未启用"


class Moderator(Protocol):
    async def moderate(self, request: ModerationRequest) -> ModerationResult: ...


class ApproveAllModerator:
    async def moderate(self, request: ModerationRequest) -> ModerationResult:
        return ModerationResult(
            comment_id=request.comment_id,
            decision=ModerationDecision.APPROVED,
            confidence=1.0,
            reason=APPROVE_ALL_REASON,
            decided_by=DecidedBy.AI_MODEL,
            model_version=APPROVE_ALL_MODEL_VERSION,
        )


_default_moderator = ApproveAllModerator()


def get_moderator() -> Moderator:
    return _default_moderator
