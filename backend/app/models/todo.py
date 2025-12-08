from sqlalchemy import Column, Integer, String

from app.core.database import Base


class Todo(Base):
    """
    Database model for Todo items.
    Represents the 'todos' table in the database.
    """
    __tablename__ = "todos"  # Table name in database

    # Primary key, auto-increments
    id = Column(Integer, primary_key=True, index=True)
    # Todo title, indexed for faster queries
    title = Column(String, index=True)