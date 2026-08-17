from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    DATABASE_URL: str = Field(default="sqlite+aiosqlite:///./health_monitor.db")
    PROBE_CONCURRENCY: int = Field(default=20)
    DEFAULT_CHECK_INTERVAL: int = Field(default=30)
    PROBE_TIMEOUT_SECONDS: int = Field(default=10)
    HISTORY_RETENTION_DAYS: int = Field(default=30)
    CORS_ORIGINS: str = Field(default="http://localhost:3000")

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @field_validator("PROBE_TIMEOUT_SECONDS")
    @classmethod
    def cap_probe_timeout(cls, value: int) -> int:
        return min(value, 30)


settings = Settings()
