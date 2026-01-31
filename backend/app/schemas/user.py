import re
from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime


# Username: alphanumeric and hyphens, but hyphen can't be first or last
USERNAME_PATTERN = re.compile(r"^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$")


def validate_username(value: str) -> str:
    """
    Validate username format:
    - Only alphanumeric characters and hyphens allowed
    - Hyphen cannot be the first or last character
    - No spaces, @, or other special characters
    """
    if not USERNAME_PATTERN.match(value):
        raise ValueError(
            "Username must contain only letters, numbers, and hyphens. "
            "Hyphens cannot be at the start or end."
        )
    return value


def validate_password(value: str) -> str:
    """
    Validate password:
    - Length between 5 and 64 characters
    - For prototype: no strict character requirements
    """
    if len(value) < 5:
        raise ValueError("Password must be at least 5 characters long")
    if len(value) > 64:
        raise ValueError("Password must be at most 64 characters long")
    return value


class UserBase(BaseModel):
    """Base schema for user data."""
    username: str = Field(..., min_length=3, max_length=50)
    role: str = Field(..., pattern="^(admin|captain)$")  # Must be 'admin' or 'captain', could eventually be changed to something else in the future

    @field_validator("username")
    @classmethod
    def check_username_format(cls, v: str) -> str:
        return validate_username(v)


class UserCreate(UserBase):
    """Schema for creating a user (includes password)."""
    password: str = Field(..., min_length=8)  # Plain-text password for input
    operator_id: int  # FK to operator

    @field_validator("password")
    @classmethod
    def check_password_strength(cls, v: str) -> str:
        return validate_password(v)


class UserUpdate(BaseModel):
    """Schema for updating a user (optional fields)."""
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    role: Optional[str] = Field(None, pattern="^(admin|captain)$")
    password: Optional[str] = Field(None)

    @field_validator("username")
    @classmethod
    def check_username_format(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            return validate_username(v)
        return v

    @field_validator("password")
    @classmethod
    def check_password_strength(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            return validate_password(v)
        return v

class User(UserBase):
    """Schema for user responses (excludes sensitive data)."""
    id: int
    operator_id: int
    created_at: datetime

    class Config:
        from_attributes = True  # Pydantic V2 for ORM compatibility