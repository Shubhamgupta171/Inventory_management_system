"""Application configuration loaded from environment variables.

All configuration is sourced from the environment (or a local ``.env`` file)
so that nothing — credentials in particular — is ever hard-coded.
"""
from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # Core
    app_name: str = "Inventory & Order Management API"
    app_version: str = "1.0.0"
    environment: str = "development"

    # Database — provided via DATABASE_URL, e.g.
    # postgresql+psycopg2://user:password@host:5432/dbname
    database_url: str = (
        "postgresql+psycopg2://postgres:postgres@localhost:5432/inventory"
    )

    # Comma-separated list of allowed CORS origins, or "*" for all.
    cors_origins: str = "*"

    # Business rules
    low_stock_threshold: int = 10

    # Seed sample data on first boot when the tables are empty.
    seed_data: bool = True

    @field_validator("database_url")
    @classmethod
    def _normalize_database_url(cls, v: str) -> str:
        """Ensure a psycopg2 driver is used.

        Managed hosts (Render, Railway, Heroku, …) hand out URLs like
        ``postgres://...`` or ``postgresql://...`` which SQLAlchemy either
        rejects or maps to a driver that may not be installed. We pin psycopg2.
        """
        if v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql+psycopg2://", 1)
        if v.startswith("postgresql://") and "+" not in v.split("://", 1)[0]:
            return v.replace("postgresql://", "postgresql+psycopg2://", 1)
        return v

    @property
    def cors_origins_list(self) -> list[str]:
        if self.cors_origins.strip() == "*":
            return ["*"]
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
