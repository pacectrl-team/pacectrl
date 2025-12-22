from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.user import User
from app.models.operator import Operator  # For FK validation
from app.schemas.user import UserCreate, UserUpdate, User as UserSchema

router = APIRouter(prefix="/users", tags=["users"])

@router.post("/", response_model=UserSchema)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    """
    Create a new user linked to an operator.
    Hashes the password before storing.
    """
    # Check if operator exists
    db_operator = db.query(Operator).filter(Operator.id == user.operator_id).first()
    if not db_operator:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Operator not found")
    
    # Check for unique username
    if db.query(User).filter(User.username == user.username).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already exists")
    
    # Hash password and create user
    hashed_password = User.hash_password(user.password)
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
def list_users(operator_id: int, db: Session = Depends(get_db)):
    """
    List users by operator_id.
    """
    if operator_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="operator_id query parameter is required")
    
    # fetch users for the given operator_id
    query = db.query(User)
    if operator_id:
        query = query.filter(User.operator_id == operator_id)

    return query.all()

@router.get("/{user_id}", response_model=UserSchema)
def get_user(user_id: int, db: Session = Depends(get_db)):
    """
    Get a user by ID.
    """
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="user_id path parameter is required")
    
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    return db_user

@router.patch("/{user_id}", response_model=UserSchema)
def update_user(user_id: int, user_update: UserUpdate, db: Session = Depends(get_db)):
    """
    Update a user (partial update).
    """
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    # Update fields if provided
    if user_update.username:
        # Check uniqueness
        if db.query(User).filter(User.username == user_update.username, User.id != user_id).first():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already exists")
        
        db_user.username = user_update.username

    if user_update.role:
        db_user.role = user_update.role

    if user_update.password:
        db_user.password_hash = User.hash_password(user_update.password)
    
    db.commit()
    db.refresh(db_user)
    return db_user

@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    """
    Delete a user by ID.
    """
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="user_id path parameter is required")

    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    db.delete(db_user)
    db.commit()
    return {"detail": "User deleted"}