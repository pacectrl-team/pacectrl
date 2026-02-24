import secrets as secrets_module

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core import security
from app.core.database import get_db
from app.models.operator import Operator
from app.models.user import User


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/operator/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Decode JWT, load the user from DB, and return the user instance."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = security.decode_access_token(token)
    user_id_raw = payload.get("sub")
    try:
        user_id = int(user_id_raw)
    except (TypeError, ValueError):
        raise credentials_exception
    if user_id is None:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise credentials_exception

    return user


def get_operator_from_jwt_or_secret(
    request: Request,
    db: Session = Depends(get_db),
) -> Operator:
    """
    Dual-auth dependency for server-to-server endpoints.

    Accepts either:
    - A JWT Bearer token in the Authorization header (normal user login flow), or
    - An X-Webhook-Secret header containing the operator's webhook secret.

    Returns the Operator so callers don't need to care which auth method was used.
    """
    webhook_secret = request.headers.get("X-Webhook-Secret")
    if webhook_secret:
        # Hash the incoming value and compare against stored hashes.
        # We still use compare_digest on the hex strings to avoid timing attacks.
        incoming_hash = security.hash_webhook_secret(webhook_secret)
        operators_with_secret = db.query(Operator).filter(Operator.webhook_secret.isnot(None)).all()
        matched = next(
            (op for op in operators_with_secret if secrets_module.compare_digest(op.webhook_secret, incoming_hash)),
            None,
        )
        if not matched:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid webhook secret",
            )
        return matched

    # Fall back to JWT
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated — provide a Bearer token or X-Webhook-Secret header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = auth_header.split(" ", 1)[1]
    try:
        payload = security.decode_access_token(token)
        user_id = int(payload.get("sub"))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")

    operator = db.query(Operator).filter(Operator.id == user.operator_id).first()
    if not operator:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Operator not found")

    return operator


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Allow only admin users."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )
    return current_user


def require_role(*roles: str):
    """Factory to require any of the provided roles."""

    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient role",
            )
        return current_user

    return role_checker
