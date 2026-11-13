import os
from collections.abc import Iterator

# Must be set before `acms_ai.server.main` is imported (it builds the app at import time).
TEST_TOKEN = "test-internal-token"
os.environ["INTERNAL_API_TOKEN"] = TEST_TOKEN

import pytest  # noqa: E402
from fastapi import APIRouter, Depends  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from acms_ai.core.errors import NotFoundError  # noqa: E402
from acms_ai.server.config import Settings, get_settings  # noqa: E402
from acms_ai.server.main import create_app  # noqa: E402
from acms_ai.server.security import require_internal_token  # noqa: E402


@pytest.fixture
def internal_token() -> str:
    return TEST_TOKEN


@pytest.fixture
def settings() -> Settings:
    return get_settings()


@pytest.fixture
def client(settings: Settings) -> Iterator[TestClient]:
    app = create_app(settings.model_copy(update={"app_env": "test", "log_level": "WARNING"}))

    # Test-only routes to exercise error handlers and internal auth.
    probe = APIRouter(prefix="/_test")

    @probe.get("/not-found")
    async def _not_found() -> None:
        raise NotFoundError("Thing not found", details={"id": 1})

    @probe.get("/boom")
    async def _boom() -> None:
        raise RuntimeError("secret internals")

    @probe.get("/items/{item_id}")
    async def _item(item_id: int) -> dict[str, int]:
        return {"id": item_id}

    @probe.get("/internal", dependencies=[Depends(require_internal_token)])
    async def _internal() -> dict[str, str]:
        return {"ok": "yes"}

    app.include_router(probe)
    with TestClient(app, raise_server_exceptions=False) as test_client:
        yield test_client
