from pydantic import BaseModel


class TodoBase(BaseModel):
    """
    Base schema for Todo with common fields.
    """
    title: str


class TodoCreate(TodoBase):
    """
    Schema for creating a new Todo.
    Same as TodoBase for now.
    """
    pass


class Todo(TodoBase):
    """
    Schema for Todo responses, includes ID.
    """
    id: int

    class Config:
        # Allows conversion from SQLAlchemy models
        orm_mode = True