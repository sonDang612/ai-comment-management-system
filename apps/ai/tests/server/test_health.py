import asyncio

import pytest
from fastapi.testclient import TestClient

from acms_ai.modules.health import service


def test_liveness(client: TestClient) -> None:
    response = client.get("/health/live")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    assert response.headers["X-Request-ID"]


def test_readiness_ok_without_probes(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_check_health_reports_failures_without_raising() -> None:
    async def ok() -> None:
        return None

    async def broken() -> None:
        raise ConnectionError("down")

    result = asyncio.run(service.check_health({"model": ok, "vllm": broken}))
    assert result.status == "degraded"
    assert result.checks["model"].status == "ok"
    assert result.checks["vllm"].error == "ConnectionError"


def test_readiness_returns_503_when_dependency_down(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def broken() -> None:
        raise ConnectionError("down")

    monkeypatch.setattr(service, "DEFAULT_PROBES", {"model": broken})
    response = client.get("/health")
    assert response.status_code == 503
    assert response.json()["status"] == "degraded"
