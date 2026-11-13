"""Service-to-service authentication: only the NestJS API may call `/v1/*`."""

import hmac
from typing import Annotated

from fastapi import Header

from acms_ai.core.errors import UnauthorizedError
from acms_ai.server.config import get_settings

INTERNAL_TOKEN_HEADER = "X-Internal-Token"


async def require_internal_token(
    x_internal_token: Annotated[str | None, Header(alias=INTERNAL_TOKEN_HEADER)] = None,
) -> None:
    expected = get_settings().internal_api_token.get_secret_value()
    if not x_internal_token or not hmac.compare_digest(x_internal_token, expected):
        raise UnauthorizedError("Invalid or missing internal token")
