import hashlib
import time
import uuid
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.api_log import ApiLog


class ApiLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware to log all API requests to the api_logs table."""

    async def dispatch(self, request: Request, call_next):
        # Generate unique request ID
        request_id = uuid.uuid4()

        # Start timing
        start_time = time.time()

        # Call the next middleware/route handler
        response: Response = await call_next(request)

        # Calculate response time in milliseconds
        end_time = time.time()
        response_ms = int((end_time - start_time) * 1000)

        # Extract details
        method = request.method
        path = request.url.path
        status_code = response.status_code
        user_agent = request.headers.get("user-agent")
        client_ip = request.client.host if request.client else None
        ip_hash = hashlib.sha256(client_ip.encode()).hexdigest() if client_ip else None

        # For now, operator_id is None; will be set later with auth
        operator_id = None

        # Log to database
        db: Session = SessionLocal()
        try:
            log_entry = ApiLog(
                request_id=request_id,
                method=method,
                path=path,
                status_code=status_code,
                response_ms=response_ms,
                operator_id=operator_id,
                ip_hash=ip_hash,
                user_agent=user_agent,
            )
            db.add(log_entry)
            db.commit()
        except Exception as e:
            # Log error but don't fail the request
            print(f"Failed to log API request: {e}")
            db.rollback()
        finally:
            db.close()

        return response