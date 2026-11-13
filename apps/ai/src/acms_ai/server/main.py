"""FastAPI application factory and ASGI entrypoint (`uvicorn acms_ai.server.main:app`)."""

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from acms_ai.core.logging import configure_logging
from acms_ai.server.config import Settings, get_settings
from acms_ai.server.errors import register_exception_handlers
from acms_ai.server.middleware import RequestContextMiddleware
from acms_ai.server.router import public_router, v1_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings: Settings = app.state.settings
    logger.info("Starting %s v%s (%s)", settings.app_name, settings.app_version, settings.app_env)
    # Load AI models here (once per process) and release them after `yield`.
    yield
    logger.info("Shutdown complete")


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    configure_logging(settings.log_level, settings.log_format)

    app = FastAPI(
        title="AI Comment Moderation - AI server (internal)",
        version=settings.app_version,
        lifespan=lifespan,
        docs_url=None if settings.is_production else "/docs",
        redoc_url=None,
        openapi_url=None if settings.is_production else "/openapi.json",
    )
    app.state.settings = settings

    # Internal service: no CORS. Browsers never call it directly.
    app.add_middleware(RequestContextMiddleware, quiet_paths=frozenset({"/health/live"}))
    register_exception_handlers(app)
    app.include_router(public_router)
    app.include_router(v1_router, prefix=settings.api_v1_prefix)
    return app


app = create_app()
