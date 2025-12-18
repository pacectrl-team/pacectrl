from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import secrets

from app.core.database import get_db
from app.models.operator import Operator
from app.schemas.operator import Operator as OperatorSchema, OperatorCreate

router = APIRouter(prefix="/operators", tags=["operators"])


@router.get("/", response_model=list[OperatorSchema])
def list_operators(db: Session = Depends(get_db)):
    """Return all operators."""

    return db.query(Operator).all()


@router.post("/", response_model=OperatorSchema, status_code=status.HTTP_201_CREATED)
def create_operator(operator: OperatorCreate, db: Session = Depends(get_db)):
    """Create a new operator if name is unique."""

    existing = db.query(Operator).filter(Operator.name == operator.name).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Operator name already exists")

    db_operator = Operator(
        name=operator.name,
    )
    db.add(db_operator)
    db.commit()
    db.refresh(db_operator)
    return db_operator


@router.get("/{operator_id}", response_model=OperatorSchema)
def get_operator(operator_id: int, db: Session = Depends(get_db)):
    """Fetch a single operator by ID."""

    db_operator = db.query(Operator).filter(Operator.id == operator_id).first()
    if not db_operator:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Operator not found")
    return db_operator


@router.post("/{operator_id}/generate-widget-key", response_model=dict)
def generate_widget_key(operator_id: int, db: Session = Depends(get_db)):
    """Generate a new secure public key for widget embedding."""

    db_operator = db.query(Operator).filter(Operator.id == operator_id).first()
    if not db_operator:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Operator not found")

    # Generate a secure random key (32 bytes, base64 encoded for URL safety)
    new_key = secrets.token_urlsafe(32)

    db_operator.public_key = new_key
    db.commit()
    db.refresh(db_operator)

    return {"public_key": new_key}


@router.post("/{operator_id}/delete-widget-key", response_model=dict)
def delete_widget_key(operator_id: int, db: Session = Depends(get_db)):
    """Delete an existing public key for widget embedding."""

    db_operator = db.query(Operator).filter(Operator.id == operator_id).first()
    if not db_operator:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Operator not found")
    
    if db_operator.public_key is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No widget key to delete")
    
    # Delete the public key
    db_operator.public_key = None

    # Save changes
    db.commit()

    return {"detail": "Widget key deleted"}


@router.post("/{operator_id}/generate-webhook-secret", response_model=dict)
def generate_webhook_secret(operator_id: int, db: Session = Depends(get_db)):
    """Generate a new secure webhook secret. This will be used for authentication against the webhook and API."""

    # Checks first if operator even exists
    db_operator = db.query(Operator).filter(Operator.id == operator_id).first()
    if not db_operator:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Operator not found")

    # Generate a secure random key (32 bytes, base64 encoded for URL safety)
    new_key = secrets.token_urlsafe(32)

    # Update operator with new webhook secret
    db_operator.webhook_secret = new_key
    db.commit()
    db.refresh(db_operator)

    return {"webhook_secret": new_key}


@router.post("/{operator_id}/delete-webhook-secret", response_model=dict)
def delete_webhook_secret(operator_id: int, db: Session = Depends(get_db)):
    """Delete an existing webhook secret. Can be done in case it has been leaked. This will invalidate all existing webhooks."""

    db_operator = db.query(Operator).filter(Operator.id == operator_id).first()
    if not db_operator:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Operator not found")
    
    if db_operator.webhook_secret is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No webhook secret to delete")
    
    # Delete the webhook secret
    db_operator.webhook_secret = None

    # Save changes
    db.commit()

    return {"detail": "Webhook secret deleted"}

