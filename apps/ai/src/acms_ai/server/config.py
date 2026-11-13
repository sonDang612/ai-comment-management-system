"""HTTP server settings."""

from functools import lru_cache

from pydantic import SecretStr

from acms_ai.core.config import CommonSettings


class Settings(CommonSettings):
    app_name: str = "acms-ai-server"
    api_v1_prefix: str = "/v1"

    # Shared secret the NestJS API sends in `X-Internal-Token`. Required: no default.
    internal_api_token: SecretStr


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]  # values come from the environment
