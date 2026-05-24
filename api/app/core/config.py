import re

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/productivity_db"
    redis_url: str = "redis://localhost:6379"
    secret_key: str = "dev-secret-key-change-in-production"
    groq_api_key: str = ""
    cors_origins: str = "http://localhost:3000"
    database_ssl: bool = False

    # JWT
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days
    algorithm: str = "HS256"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    @property
    def db_url_clean(self) -> str:
        """asyncpg doesn't accept sslmode/channel_binding params; strip them."""
        url = re.sub(r"[?&](sslmode|channel_binding)=[^&]*", "", self.database_url)
        return url.rstrip("?&")

    @property
    def db_ssl(self) -> bool:
        return self.database_ssl or "sslmode=require" in self.database_url

    class Config:
        env_file = ".env"


settings = Settings()
