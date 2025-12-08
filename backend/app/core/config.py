import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database URL from environment (Railway sets for Postgres), defaults to SQLite
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./test.db")
    # Secret key for JWT signing
    secret_key: str = os.getenv("SECRET_KEY", "your-secret-key")
    # JWT algorithm
    algorithm: str = "HS256"
    # Token expiration time in minutes
    access_token_expire_minutes: int = 30

    class Config:
        # Load from .env file if present
        env_file = ".env"


# Global settings instance
settings = Settings()