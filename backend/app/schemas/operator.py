from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class OperatorBase(BaseModel):
    """Base attributes shared across operator operations."""

    name: str
    public_key: Optional[str] = None
    webhook_secret: Optional[str] = None


class OperatorCreate(BaseModel):
    """Payload for creating a new operator."""

    name: str


class Operator(OperatorBase):
    """Response schema for operator resources."""

    id: int
    created_at: datetime

    class Config:
        orm_mode = True
