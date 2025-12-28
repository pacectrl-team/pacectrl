import hashlib
import time
import uuid
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy.orm import Session

from app.core import security
from app.core.database import SessionLocal
from app.models.api_log import ApiLog


class ApiLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware to log all API requests to the api_logs table."""

    async def dispatch(self, request: Request, call_next):
        # Generate unique request ID (UUID stored in DB)
        request_id = uuid.uuid4()

        # Start timing
        start_time = time.time()

        # Attempt to extract user/operator from JWT. If invalid/missing, log with null values.
        operator_id = None
        user_id = None
        auth_header = request.headers.get("authorization")
        if auth_header and auth_header.lower().startswith("bearer "):
            token = auth_header.split(" ", 1)[1] # Get the token part
            try:
                payload = security.decode_access_token(token)
                # sub is stored as string; cast to int if possible
                raw_sub = payload.get("sub")
                if raw_sub is not None:
                    user_id = int(raw_sub)
                else:
                    user_id = None
                
                raw_op = payload.get("operator_id")
                if raw_op is not None:
                    operator_id = int(raw_op)
                else:
                    operator_id = None

            except Exception:
                # Ignore token errors for logging; do not block the request
                pass

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
                user_id=user_id,
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