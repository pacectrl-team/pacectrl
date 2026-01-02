from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.deps import get_current_user, require_admin
from app.models.user import User
from app.models.widget_config import WidgetConfig
from app.schemas.widget_config import (
    WidgetConfigCreate,
    WidgetConfigUpdate,
    WidgetConfig as WidgetConfigSchema,
)

router = APIRouter(
    prefix="/widget_configs",
    tags=["widget_configs"],
    dependencies=[Depends(get_current_user)],
)


@router.post(
    "/",
    response_model=WidgetConfigSchema,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_admin)],
)
def create_widget_config(
    payload: WidgetConfigCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new widget config, linked to current operator."""
    # Ensure the config is created for the current user's operator
    if payload.operator_id != current_user.operator_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot create configs for another operator")

    # Check for unique name per operator
    existing = (
        db.query(WidgetConfig)
        .filter(WidgetConfig.operator_id == payload.operator_id, WidgetConfig.name == payload.name)
        .first()
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Config name already exists for this operator")

    # Create the widget config instance
    db_config = WidgetConfig(
        operator_id=payload.operator_id,
        name=payload.name,
        description=payload.description,
        config=payload.config.model_dump(),
        is_active=payload.is_active,
    )
    db.add(db_config)
    db.commit()
    db.refresh(db_config)
    return db_config


@router.get("/", response_model=List[WidgetConfigSchema])
def list_widget_configs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List widget configs for the current operator."""
    # Query configs scoped to the current user's operator
    return db.query(WidgetConfig).filter(WidgetConfig.operator_id == current_user.operator_id).all()


@router.get("/{config_id}", response_model=WidgetConfigSchema)
def get_widget_config(
    config_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fetch a single widget config linked to the current operator."""
    # Query the config by ID and ensure it belongs to the current operator
    db_config = (
        db.query(WidgetConfig)
        .filter(WidgetConfig.id == config_id, WidgetConfig.operator_id == current_user.operator_id)
        .first()
    )
    if not db_config:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Widget config not found")
    return db_config


@router.patch(
    "/{config_id}",
    response_model=WidgetConfigSchema,
    dependencies=[Depends(require_admin)],
)
def update_widget_config(
    config_id: int,
    payload: WidgetConfigUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a widget config (admin-only) linked to current operator."""
    # Fetch the config scoped to the current operator
    db_config = (
        db.query(WidgetConfig)
        .filter(WidgetConfig.id == config_id, WidgetConfig.operator_id == current_user.operator_id)
        .first()
    )
    if not db_config:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Widget config not found")

    # Check uniqueness if name is being changed
    if payload.name is not None and payload.name != db_config.name:
        existing = (
            db.query(WidgetConfig)
            .filter(WidgetConfig.operator_id == db_config.operator_id, WidgetConfig.name == payload.name)
            .first()
        )
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Config name already exists for this operator")
        db_config.name = payload.name

    # Update other fields if provided
    if payload.description is not None:
        db_config.description = payload.description
    if payload.config is not None:
        db_config.config = payload.config.model_dump()
    if payload.is_active is not None:
        db_config.is_active = payload.is_active

    db.commit()
    db.refresh(db_config)
    return db_config


@router.delete(
    "/{config_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_admin)],
)
def delete_widget_config(
    config_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a widget config linked to the current operator."""
    # Fetch the config scoped to the current operator
    db_config = (
        db.query(WidgetConfig)
        .filter(WidgetConfig.id == config_id, WidgetConfig.operator_id == current_user.operator_id)
        .first()
    )
    if not db_config:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Widget config not found")

    # Delete the config
    db.delete(db_config)
    db.commit()
    return None