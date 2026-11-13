from pydantic import BaseModel, Field

MAX_CONTENT_LENGTH = 10_000


class CommentAnalysisRequest(BaseModel):
    comment_id: str = Field(min_length=1, max_length=128)
    content: str = Field(max_length=MAX_CONTENT_LENGTH)


class CommentAnalysis(BaseModel):
    is_valid: bool
    is_question: bool
    confidence: float = Field(ge=0.0, le=1.0)
    reason: str
