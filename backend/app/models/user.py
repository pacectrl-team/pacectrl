from sqlalchemy import Column, Integer, String, ForeignKey, TIMESTAMP, func
from sqlalchemy.orm import relationship
from app.core.database import Base
import bcrypt 

class User(Base):
    """
    User model for portal accounts. Each user belongs to an operator (multi-tenant).
    Roles: 'admin' (full access) or 'captain' (read-only ops).
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    operator_id = Column(Integer, ForeignKey("operators.id", ondelete="CASCADE"), nullable=False)  # FK to operators
    username = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)  # Store hashed password
    role = Column(String, nullable=False, default="captain")  # 'admin' or 'captain'
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)

    # Relationship back to operator (optional, for easy queries)
    operator = relationship("Operator", back_populates="users")

    @staticmethod #Add functions here as needed.
    def hash_password(password: str) -> str:
        """Hash a plain-text password using bcrypt."""
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    def verify_password(self, password: str) -> bool:
        """Verify a plain-text password against the stored hash."""
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))