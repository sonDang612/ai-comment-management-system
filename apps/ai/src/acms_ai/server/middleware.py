"""HTTP middleware: request id propagation and access logging (pure ASGI, no buffering)."""

import logging
import re
import time
import uuid

from starlette.datastructures import MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from acms_ai.core.context import request_id_ctx
from acms_ai.core.errors import ErrorCode
from acms_ai.server.errors import error_response

REQUEST_ID_HEADER = "X-Request-ID"
_VALID_REQUEST_ID = re.compile(r"^[A-Za-z0-9._-]{1,128}$")

logger = logging.getLogger(__name__)
access_logger = logging.getLogger("acms_ai.access")


class RequestContextMiddleware:
    """Assigns a request id (or trusts a well-formed incoming one), logs each request and
    converts unhandled exceptions into the standard 500 error envelope."""

    def __init__(self, app: ASGIApp, quiet_paths: frozenset[str] = frozenset()) -> None:
        self.app = app
        self.quiet_paths = quiet_paths

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        incoming = dict(scope["headers"]).get(REQUEST_ID_HEADER.lower().encode(), b"").decode()
        request_id = incoming if _VALID_REQUEST_ID.match(incoming) else uuid.uuid4().hex
        token = request_id_ctx.set(request_id)
        start = time.perf_counter()
        status_code = 500

        async def send_wrapper(message: Message) -> None:
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message["status"]
                MutableHeaders(scope=message).append(REQUEST_ID_HEADER, request_id)
            await send(message)

        response_started = False

        async def tracking_send(message: Message) -> None:
            nonlocal response_started
            if message["type"] == "http.response.start":
                response_started = True
            await send_wrapper(message)

        try:
            await self.app(scope, receive, tracking_send)
        except Exception as exc:
            # Handled here (not in Starlette's ServerErrorMiddleware) so the 500 response
            # still carries the request id and passes through CORS.
            logger.exception("Unhandled exception", exc_info=exc)
            if response_started:
                raise
            response = error_response(500, ErrorCode.INTERNAL_ERROR, "Internal server error")
            await response(scope, receive, send_wrapper)
        finally:
            path = scope["path"]
            if not (path in self.quiet_paths and status_code < 400):
                access_logger.info(
                    "%s %s %s",
                    scope["method"],
                    path,
                    status_code,
                    extra={
                        "method": scope["method"],
                        "path": path,
                        "status": status_code,
                        "duration_ms": round((time.perf_counter() - start) * 1000, 2),
                    },
                )
            request_id_ctx.reset(token)
