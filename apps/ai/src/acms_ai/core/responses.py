from http import HTTPStatus
from typing import Any

from pydantic import BaseModel, Field

from acms_ai.core.timezone import now_utc

SUCCESS_MESSAGE = "Success"


def utc_timestamp() -> str:
    return now_utc().isoformat(timespec="milliseconds").replace("+00:00", "Z")


def status_message(status_code: int) -> str:
    if status_code < HTTPStatus.BAD_REQUEST:
        return SUCCESS_MESSAGE
    try:
        return HTTPStatus(status_code).phrase
    except ValueError:
        return "Error"


class ApiResponse[T](BaseModel):
    code: int
    message: str
    data: T
    timestamp: str = Field(default_factory=utc_timestamp)


class ApiErrorInfo(BaseModel):
    code: str
    details: Any = None
    request_id: str | None = None


class ApiErrorResponse(ApiResponse[None]):
    error: ApiErrorInfo


def success[T](data: T, status_code: int = HTTPStatus.OK) -> ApiResponse[T]:
    return ApiResponse[T](code=status_code, message=status_message(status_code), data=data)
