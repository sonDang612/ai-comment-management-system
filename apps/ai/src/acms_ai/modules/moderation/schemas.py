from enum import StrEnum

from pydantic import BaseModel, Field

MAX_CONTENT_LENGTH = 10_000


class ModerationDecision(StrEnum):
    APPROVED = "approved"
    PENDING = "pending"
    DISABLED = "disabled"


class DecidedBy(StrEnum):
    WHITELIST = "whitelist"
    RULE_FILTER = "rule_filter"
    AI_MODEL = "ai_model"
    ADMIN = "admin"


class ModerationRequest(BaseModel):
    comment_id: str = Field(min_length=1, max_length=128)
    content: str = Field(min_length=1, max_length=MAX_CONTENT_LENGTH)


class ModerationResult(BaseModel):
    comment_id: str
    decision: ModerationDecision
    category: str | None = None
    violation_type: str | None = None
    labels: list[str] = Field(default_factory=list)
    confidence: float = Field(ge=0.0, le=1.0)
    reason: str
    decided_by: DecidedBy
    model_version: str
