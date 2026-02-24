from datetime import datetime, timedelta, timezone
from hashlib import sha256
from typing import Any, Dict

import bcrypt
import jwt
from fastapi import HTTPException, status

from app.core.config import settings


def hash_password(password: str) -> str:
    """Hash a plain-text password using bcrypt."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a plain-text password against the stored hash."""
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def hash_webhook_secret(secret: str) -> str:
    """
    Hash a webhook secret for safe storage in the database.

    We use SHA-256 rather than bcrypt because the secret is a high-entropy
    random token (32 bytes from secrets.token_urlsafe), so brute-force is
    infeasible and bcrypt's extra slowness would only add latency to every
    incoming webhook request.
    """
    return sha256(secret.encode("utf-8")).hexdigest()


def verify_webhook_secret(plain: str, stored_hash: str) -> bool:
    """Verify an incoming webhook secret against the stored SHA-256 hash."""
    return sha256(plain.encode("utf-8")).hexdigest() == stored_hash


def create_access_token(
    *,
    subject: int,
    operator_id: int,
    role: str,
    expires_minutes: int | None = None,
) -> str:
    """Create a signed JWT access token with required claims."""

    expire = datetime.now(timezone.utc) + timedelta(
        minutes=expires_minutes or settings.access_token_expire_minutes
    )
    payload = {
        # sub must be a string per JWT spec to satisfy PyJWT validation
        "sub": str(subject), # user ID as string
        "operator_id": operator_id,
        "role": role, # user role
        "exp": expire,
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.algorithm)


def decode_access_token(token: str) -> Dict[str, Any]:
    """Decode and validate a JWT access token."""

    try:
        return jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.algorithm],
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
