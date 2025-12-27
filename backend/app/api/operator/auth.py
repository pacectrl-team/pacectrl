from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core import security
from app.core.deps import get_current_user
from app.core.database import get_db
from app.core.config import settings
from app.models.user import User
from app.schemas.auth import LoginRequest, MeResponse, Token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=Token)
def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate a user and issue a JWT access token."""

    user = db.query(User).filter(User.username == credentials.username).first()
    if not user or not security.verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    access_token = security.create_access_token(
        subject=user.id,
        operator_id=user.operator_id,
        role=user.role,
        expires_minutes=settings.access_token_expire_minutes,
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=MeResponse)
def read_me(current_user: User = Depends(get_current_user)):
    """Return basic profile info for the authenticated user."""

    return {
        "user_id": current_user.id,
        "username": current_user.username,
        "role": current_user.role,
        "operator_id": current_user.operator_id,
    }


# Usage examples (local dev):
# curl -X POST "http://127.0.0.1:8000/api/v1/operator/auth/login" \
#      -H "Content-Type: application/json" \
#      -d '{"username":"admin","password":"your-password"}'
# curl "http://127.0.0.1:8000/api/v1/operator/auth/me" \
#      -H "Authorization: Bearer <token-from-login>"
