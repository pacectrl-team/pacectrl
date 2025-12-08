from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.todo import Todo
from app.schemas.todo import Todo as TodoSchema, TodoCreate

# Create router for todo endpoints
router = APIRouter(prefix="/todos", tags=["todos"])


@router.get("/", response_model=list[TodoSchema])
def read_todos(db: Session = Depends(get_db)):
    """
    Get all todos from the database.
    Returns a list of all todo items.
    """
    return db.query(Todo).all()


@router.post("/", response_model=TodoSchema)
def create_todo(todo: TodoCreate, db: Session = Depends(get_db)):
    """
    Create a new todo.
    Accepts title in JSON, saves to DB, returns created todo with ID.
    """
    # Create new Todo instance
    db_todo = Todo(title=todo.title)
    # Add to session
    db.add(db_todo)
    # Commit to database
    db.commit()
    # Refresh to get auto-generated ID
    db.refresh(db_todo)
    return db_todo


@router.get("/{todo_id}", response_model=TodoSchema)
def read_todo(todo_id: int, db: Session = Depends(get_db)):
    """
    Get a single todo by ID.
    Returns the todo or 404 if not found.
    """
    # Query for todo with matching ID
    db_todo = db.query(Todo).filter(Todo.id == todo_id).first()
    # Check if found
    if db_todo is None:
        raise HTTPException(status_code=404, detail="Todo not found")
    return db_todo