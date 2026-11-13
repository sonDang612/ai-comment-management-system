"""Settings shared by both entrypoints. Each entrypoint extends `CommonSettings`.

Values come from environment variables, then `apps/ai/.env` (one file for both processes).
"""

from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

Environment = Literal["local", "test", "development", "staging", "production"]
LogLevel = Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
LogFormat = Literal["text", "json"]


class CommonSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "acms-ai"
    app_version: str = "0.1.0"
    app_env: Environment = "local"

    log_level: LogLevel = "INFO"
    log_format: LogFormat = "text"

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"
