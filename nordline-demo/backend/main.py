"""
NordLine Demo Operator Backend
-------------------------------
A minimal FastAPI service that acts as the operator's booking backend.
Its only job is to receive a confirmed booking intent from the frontend
and forward it to the PaceCtrl confirmed-choices API using the operator
webhook secret.

Environment variables (set in Railway or a local .env file):
  PACECTRL_API_URL        - Base URL of the PaceCtrl API
                            e.g. https://pacectrl-production.up.railway.app
  PACECTRL_WEBHOOK_SECRET - The operator's plaintext webhook secret
                            (PaceCtrl hashes it server-side for comparison)
  ALLOWED_ORIGINS         - Comma-separated CORS origins, e.g.
                            https://nordline-frontend.up.railway.app,http://localhost:3000
"""

import os
import uuid
import logging

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
load_dotenv()

PACECTRL_API_URL: str = os.getenv("PACECTRL_API_URL")
# The secret is read from the PACECTRL_WEBHOOK_SECRET environment variable.
# The current value is used as a fallback default for local dev — in Railway
# set the env variable directly so it is never committed to source control.
PACECTRL_WEBHOOK_SECRET: str = os.getenv("PACECTRL_WEBHOOK_SECRET")

# Parse allowed origins from env — defaults to wildcard for local dev
_raw_origins = os.getenv("ALLOWED_ORIGINS", "*")
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("nordline-backend")

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(title="NordLine Demo Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------
class ConfirmBookingRequest(BaseModel):
    """Payload the frontend sends when the user clicks Pay."""
    intent_id: str  # PaceCtrl intent ID captured by the widget's onIntentCreated


class ConfirmBookingResponse(BaseModel):
    booking_id: str
    confirmed: bool
    message: str


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.get("/health")
def health():
    """Simple liveness probe."""
    return {"status": "ok", "service": "nordline-backend"}


@app.post("/api/confirm-booking", response_model=ConfirmBookingResponse)
async def confirm_booking(payload: ConfirmBookingRequest):
    """
    Confirm a passenger booking.

    1. Generate a unique booking reference (NL-XXXXXXXX).
    2. POST the intent + booking ID to the PaceCtrl confirmed-choices endpoint
       using the operator webhook secret for authentication.
    3. Return the booking reference to the frontend.
    """
    if not PACECTRL_WEBHOOK_SECRET:
        logger.error("PACECTRL_WEBHOOK_SECRET is not configured")
        raise HTTPException(
            status_code=500,
            detail="Operator webhook secret is not configured. Set PACECTRL_WEBHOOK_SECRET.",
        )

    # Generate a human-readable booking reference for the demo
    booking_id = f"NL-{uuid.uuid4().hex[:8].upper()}"

    confirm_url = f"{PACECTRL_API_URL.rstrip('/')}/api/v1/operator/confirmed-choices/"
    request_body = {
        "intent_id": payload.intent_id,
        "booking_id": booking_id,
    }

    logger.info("Confirming booking: intent=%s booking=%s", payload.intent_id, booking_id)

    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            response = await client.post(
                confirm_url,
                json=request_body,
                headers={"X-Webhook-Secret": PACECTRL_WEBHOOK_SECRET},
            )
        except httpx.RequestError as exc:
            logger.error("Network error calling PaceCtrl API: %s", exc)
            raise HTTPException(
                status_code=502,
                detail=f"Could not reach PaceCtrl API: {exc}",
            )

    if response.status_code not in (200, 201):
        logger.error(
            "PaceCtrl API returned %s: %s",
            response.status_code,
            response.text,
        )
        raise HTTPException(
            status_code=502,
            detail=f"PaceCtrl API error ({response.status_code}): {response.text}",
        )

    logger.info("Booking confirmed: %s", booking_id)
    return ConfirmBookingResponse(
        booking_id=booking_id,
        confirmed=True,
        message="Booking confirmed and speed preference recorded.",
    )
