from pydantic import BaseModel


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    username: str
    password: str


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
