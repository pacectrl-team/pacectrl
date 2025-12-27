import os
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

    class Config:
        # Load from .env file if present
        env_file = "../.env"


# Global settings instance
settings = Settings()