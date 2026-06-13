import re

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/productivity_db"
    redis_url: str = "redis://localhost:6379"
    secret_key: str = "dev-secret-key-change-in-production"
    groq_api_key: str = ""
    groq_base_url: str = "https://api.groq.com/openai/v1"
    groq_model: str = "llama-3.3-70b-versatile"
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
        """Strip sslmode/channel_binding params and ensure asyncpg driver prefix."""
        url = re.sub(r"[?&](sslmode|channel_binding)=[^&]*", "", self.database_url)
        url = url.rstrip("?&")
        if url.startswith("postgresql://") and "+asyncpg" not in url:
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url

    @property
    def db_ssl(self) -> bool:
        return self.database_ssl or "sslmode=require" in self.database_url

    class Config:
        env_file = ".env"


settings = Settings()
