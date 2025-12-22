from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    """Base schema for user data."""
    username: str = Field(..., min_length=3, max_length=50)
    role: str = Field(..., pattern="^(admin|captain)$")  # Must be 'admin' or 'captain', could eventually be changed to something else in the future

class UserCreate(UserBase):
    """Schema for creating a user (includes password)."""
    password: str = Field(..., min_length=8)  # Plain-text password for input
    operator_id: int  # FK to operator

class UserUpdate(BaseModel):
    """Schema for updating a user (optional fields)."""
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    role: Optional[str] = Field(None, pattern="^(admin|captain)$")
    password: Optional[str] = Field(None, min_length=8)  # Plain-text for update

class User(UserBase):
    """Schema for user responses (excludes sensitive data)."""
    id: int
    operator_id: int
    created_at: datetime

    class Config:
        from_attributes = True  # Pydantic V2 for ORM compatibility