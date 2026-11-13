"""HTTP error handling.

Every non-2xx response uses the same envelope (mirrored in `packages/shared/src/api.ts`):

    {"code": 404, "message": "...", "data": null,
     "error": {"code": "not_found", "details": ..., "request_id": "..."}, "timestamp": "..."}

Raise an `acms_ai.core.errors.AppError` subclass; never build error responses by hand.
"""

import logging
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from acms_ai.core.context import get_request_id
from acms_ai.core.errors import AppError, ErrorCode
from acms_ai.core.responses import ApiErrorInfo, ApiErrorResponse

logger = logging.getLogger(__name__)

_STATUS_TO_CODE: dict[int, ErrorCode] = {
    400: ErrorCode.BAD_REQUEST,
    401: ErrorCode.UNAUTHORIZED,
    403: ErrorCode.FORBIDDEN,
    404: ErrorCode.NOT_FOUND,
    409: ErrorCode.CONFLICT,
    422: ErrorCode.VALIDATION_ERROR,
    429: ErrorCode.RATE_LIMITED,
    503: ErrorCode.SERVICE_UNAVAILABLE,
}


def error_response(
    status_code: int,
    code: str,
    message: str,
    details: Any = None,
    headers: dict[str, str] | None = None,
) -> JSONResponse:
    body = ApiErrorResponse(
        code=status_code,
        message=message,
        data=None,
        error=ApiErrorInfo(code=code, details=details, request_id=get_request_id()),
    )
    return JSONResponse(jsonable_encoder(body), status_code=status_code, headers=headers)


async def _app_error_handler(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, AppError)
    log = logger.error if exc.status_code >= 500 else logger.info
    log("%s: %s", exc.code, exc.message)
    return error_response(exc.status_code, exc.code, exc.message, exc.details, exc.headers)


async def _http_error_handler(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, StarletteHTTPException)
    code = _STATUS_TO_CODE.get(
        exc.status_code,
        ErrorCode.INTERNAL_ERROR if exc.status_code >= 500 else ErrorCode.BAD_REQUEST,
    )
    return error_response(exc.status_code, code, str(exc.detail), headers=exc.headers)


async def _validation_error_handler(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, RequestValidationError)
    details = [
        {"loc": list(err.get("loc", ())), "msg": err.get("msg"), "type": err.get("type")}
        for err in exc.errors()
    ]
    return error_response(
        status.HTTP_422_UNPROCESSABLE_CONTENT,
        ErrorCode.VALIDATION_ERROR,
        "Request validation failed",
        details,
    )


def register_exception_handlers(app: FastAPI) -> None:
    """Expected errors. Unexpected exceptions are converted to a 500 envelope by
    `RequestContextMiddleware` (full traceback logged, generic message to the client)."""
    app.add_exception_handler(AppError, _app_error_handler)
    app.add_exception_handler(StarletteHTTPException, _http_error_handler)
    app.add_exception_handler(RequestValidationError, _validation_error_handler)
