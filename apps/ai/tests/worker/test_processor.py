import asyncio
from types import SimpleNamespace
from typing import Any

import pytest
from bullmq import UnrecoverableError

from acms_ai.worker.jobs import HANDLERS
from acms_ai.worker.processor import process


def make_job(name: str, data: dict[str, Any] | None = None) -> Any:
    return SimpleNamespace(id="1", name=name, data=data or {}, attemptsMade=0)


def test_ping_is_registered() -> None:
    assert "system.ping" in HANDLERS


def test_ping_returns_pong() -> None:
    result = asyncio.run(process(make_job("system.ping", {"echo": "hi"}), "token"))
    assert result["pong"] is True
    assert result["echo"] == "hi"


def test_accepts_bullmq_signal_argument() -> None:
    # bullmq calls processors as (job, token, signal) when they take 3+ positionals.
    result = asyncio.run(process(make_job("system.ping"), "token", object()))
    assert result["pong"] is True


def test_unknown_job_is_unrecoverable() -> None:
    with pytest.raises(UnrecoverableError):
        asyncio.run(process(make_job("does.not.exist"), "token"))


def test_handler_errors_propagate_for_retry() -> None:
    async def broken(_: dict[str, Any]) -> None:
        raise ValueError("boom")

    with pytest.raises(ValueError):
        asyncio.run(process(make_job("x"), "token", handlers={"x": broken}))
