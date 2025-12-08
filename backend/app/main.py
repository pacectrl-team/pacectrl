# Import necessary libraries
# FastAPI: Framework for building APIs
# Pydantic: For data validation and serialization
# SQLAlchemy: ORM for database interactions
# os: For environment variables
from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import Column, Integer, String, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import Session, sessionmaker
import os

# Database configuration
# Get DATABASE_URL from environment (Railway sets this for Postgres), default to SQLite for local dev
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./test.db")

# Set up SQLAlchemy database engine and session
# Engine connects to the database
# SessionLocal creates database sessions
# Base is the base class for database models
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Dependency to get a database session
# This function provides a DB session to endpoints and ensures it's closed after use
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Database model for Todo items
# Defines the structure of the 'todos' table in the database
class Todo(Base):
    __tablename__ = "todos"  # Table name
    id = Column(Integer, primary_key=True, index=True)  # Primary key, auto-increment
    title = Column(String, index=True)  # Todo title, indexed for faster queries

# Pydantic schemas for API data validation
# TodoBase: Base schema with title
class TodoBase(BaseModel):
    title: str

# TodoCreate: For creating new todos (same as base)
class TodoCreate(TodoBase):
    pass

# TodoResponse: For API responses, includes id
class TodoResponse(TodoBase):
    id: int

    class Config:
        orm_mode = True  # Allows conversion from SQLAlchemy models to Pydantic

# Create all database tables based on the models
# This runs when the app starts, creating tables if they don't exist
Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(title="PaceCtrl API")

# Health check endpoint
# Simple endpoint to verify the API is running
@app.get("/health")
def read_health():
    return {"status": "ok"}

# Get all todos endpoint
# Returns a list of all todo items from the database
@app.get("/todos", response_model=list[TodoResponse])
def read_todos(db: Session = Depends(get_db)):
    return db.query(Todo).all()

# Get a single todo by id
# Returns the todo with the specified id, or 404 if not found
@app.get("/todos/{todo_id}", response_model=TodoResponse)
def read_todo(todo_id: int, db: Session = Depends(get_db)):
    db_todo = db.query(Todo).filter(Todo.id == todo_id).first()
    if db_todo is None:
        raise HTTPException(status_code=404, detail="Todo not found")
    return db_todo

# Create a new todo endpoint
# Accepts a todo title in JSON, saves it to DB, and returns the created todo
@app.post("/todos", response_model=TodoResponse)
def create_todo(todo: TodoCreate, db: Session = Depends(get_db)):
    db_todo = Todo(title=todo.title)  # Create Todo instance
    db.add(db_todo)  # Add to session
    db.commit()  # Save to database
    db.refresh(db_todo)  # Refresh to get the id
    return db_todo
