from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ShipBase(BaseModel):
    """Shared attributes for ship operations."""

    name: str = Field(..., min_length=1, max_length=255)
    imo_number: Optional[str] = Field(None, max_length=50)


class ShipCreate(ShipBase):
    """Payload for creating a ship."""

    pass


class ShipUpdate(BaseModel):
    """Partial update schema for ships."""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    imo_number: Optional[str] = Field(None, max_length=50)


class Ship(ShipBase):
    """Response schema for ships."""

    id: int
    operator_id: int
    created_at: datetime

    class Config:
        from_attributes = True
