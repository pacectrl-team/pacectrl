from pydantic import BaseModel, Field


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)


class TokenPayload(BaseModel):
    sub: int
    operator_id: int
    role: str
    exp: int


class MeResponse(BaseModel):
    user_id: int
    username: str
    role: str
    operator_id: int
