from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UpdateProfileRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6, max_length=128)


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
