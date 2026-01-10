import os
from typing import List, Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database URL from environment (Railway sets for Postgres), defaults to local PostgreSQL
    database_url: str = os.getenv("DATABASE_URL")

    # Secret key for legacy uses (kept for compatibility)
    secret_key: str = os.getenv("SECRET_KEY")

    # Dedicated JWT secret (prefers JWT_SECRET_KEY, falls back to SECRET_KEY)
    jwt_secret_key: str = os.getenv("JWT_SECRET_KEY")

    # JWT algorithm
    algorithm: str = "HS256"

    # Token expiration time in minutes (override with ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60))

    # Public base URL used when producing absolute links (e.g., widget script src)
    public_base_url: Optional[str] = os.getenv("PUBLIC_BASE_URL")

    # Cache duration for widget bundle responses (seconds)
    widget_cache_seconds: int = int(os.getenv("WIDGET_CACHE_SECONDS", 300))

    # Comma-separated list of origins allowed for CORS ("*" for allow-all)
    cors_allow_origins: str = os.getenv("CORS_ALLOW_ORIGINS", "*")

    def get_cors_origins(self) -> List[str]:
        """Return parsed list of allowed CORS origins."""
        raw = (self.cors_allow_origins or "").strip()
        if not raw:
            return ["*"]
        if raw == "*":
            return ["*"]
        return [origin.strip() for origin in raw.split(",") if origin.strip()]

    class Config:
        # Load from .env file if present
        env_file = "../.env"


# Global settings instance
settings = Settings()