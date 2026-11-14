"""Domain errors, raisable from any layer (worker, training).

In the worker they fail the job like any other exception; the training CLI reports them and exits 1.
"""

from enum import StrEnum
from http import HTTPStatus
from typing import Any


class ErrorCode(StrEnum):
    BAD_REQUEST = "bad_request"
    UNAUTHORIZED = "unauthorized"
    FORBIDDEN = "forbidden"
    NOT_FOUND = "not_found"
    CONFLICT = "conflict"
    VALIDATION_ERROR = "validation_error"
    RATE_LIMITED = "rate_limited"
    SERVICE_UNAVAILABLE = "service_unavailable"
    INTERNAL_ERROR = "internal_error"


class AppError(Exception):
    """Base class for expected, client-facing errors."""

    status_code: int = HTTPStatus.BAD_REQUEST
    code: ErrorCode = ErrorCode.BAD_REQUEST
    message: str = "Bad request"

    def __init__(
        self,
        message: str | None = None,
        *,
        details: Any = None,
        headers: dict[str, str] | None = None,
    ) -> None:
        self.message = message or self.message
        self.details = details
        self.headers = headers
        super().__init__(self.message)


class UnauthorizedError(AppError):
    status_code = HTTPStatus.UNAUTHORIZED
    code = ErrorCode.UNAUTHORIZED
    message = "Authentication required"


class ForbiddenError(AppError):
    status_code = HTTPStatus.FORBIDDEN
    code = ErrorCode.FORBIDDEN
    message = "Permission denied"


class NotFoundError(AppError):
    status_code = HTTPStatus.NOT_FOUND
    code = ErrorCode.NOT_FOUND
    message = "Resource not found"


class ConflictError(AppError):
    status_code = HTTPStatus.CONFLICT
    code = ErrorCode.CONFLICT
    message = "Resource conflict"


class RateLimitedError(AppError):
    status_code = HTTPStatus.TOO_MANY_REQUESTS
    code = ErrorCode.RATE_LIMITED
    message = "Too many requests"


class ServiceUnavailableError(AppError):
    status_code = HTTPStatus.SERVICE_UNAVAILABLE
    code = ErrorCode.SERVICE_UNAVAILABLE
    message = "Service temporarily unavailable"
