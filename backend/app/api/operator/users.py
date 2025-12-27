from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core import security
from app.core.database import get_db
from app.core.deps import get_current_user, require_admin
from app.models.operator import Operator  # For FK validation
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate, User as UserSchema

router = APIRouter(
    prefix="/users",
    tags=["users"],
    dependencies=[Depends(get_current_user)],
)

@router.post(
    "/",
    response_model=UserSchema,
    dependencies=[Depends(require_admin)],
)
def create_user(
    user: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new user linked to an operator.
    Hashes the password before storing.
    """
    # Enforce same-operator creation
    if current_user.operator_id != user.operator_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot manage users for another operator")

    # Check if operator exists
    db_operator = db.query(Operator).filter(Operator.id == user.operator_id).first()
    if not db_operator:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Operator not found")
    
    # Check for unique username
    if db.query(User).filter(User.username == user.username).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already exists")
    
    # Hash password and create user
    hashed_password = security.hash_password(user.password)
    db_user = User(
        username=user.username,
        password_hash=hashed_password,
        role=user.role,
        operator_id=user.operator_id
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.get("/", response_model=List[UserSchema])
def list_users(
    operator_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List users by operator_id.
    """
    # Default to current user's operator
    target_operator_id = operator_id or current_user.operator_id

    # Non-admins cannot query other operators
    if current_user.role != "admin" and target_operator_id != current_user.operator_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    return db.query(User).filter(User.operator_id == target_operator_id).all()

@router.get("/{user_id}", response_model=UserSchema)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get a user by ID.
    """
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="user_id path parameter is required")
    
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if current_user.role != "admin" and db_user.operator_id != current_user.operator_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    return db_user

@router.patch(
    "/{user_id}",
    response_model=UserSchema,
    dependencies=[Depends(require_admin)],
)
def update_user(
    user_id: int,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update a user (partial update).
    """
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if db_user.operator_id != current_user.operator_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot update users for another operator")
    
    # Update fields if provided
    if user_update.username:
        # Check uniqueness
        if db.query(User).filter(User.username == user_update.username, User.id != user_id).first():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already exists")
        
        db_user.username = user_update.username

    if user_update.role:
        db_user.role = user_update.role

    if user_update.password:
        db_user.password_hash = security.hash_password(user_update.password)
    
    db.commit()
    db.refresh(db_user)
    return db_user

@router.delete(
    "/{user_id}",
    dependencies=[Depends(require_admin)],
)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete a user by ID.
    """
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="user_id path parameter is required")

    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if db_user.operator_id != current_user.operator_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot delete users for another operator")

    db.delete(db_user)
    db.commit()
    return {"detail": "User deleted"}