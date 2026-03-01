from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class OperatorBase(BaseModel):
    """Base attributes shared across operator operations."""

    name: str
    public_key: Optional[str] = None
    webhook_secret: Optional[str] = None


class OperatorCreate(BaseModel):
    """Payload for creating a new operator."""

    name: str = Field(..., min_length=1, max_length=255)


class Operator(OperatorBase):
    """Full operator schema (internal use only — includes webhook_secret)."""

    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class OperatorResponse(BaseModel):
    """Public response schema for operator resources — excludes sensitive fields."""

    id: int
    name: str
    public_key: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
