from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field

from app.models.base import TimestampMixin


class User(TimestampMixin, table=True):
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(max_length=255, unique=True, index=True)
    full_name: str = Field(max_length=200)
    hashed_password: str = Field()
    is_active: bool = Field(default=True)
    is_verified: bool = Field(default=False)


class PasswordResetToken(TimestampMixin, table=True):
    __tablename__ = "password_reset_tokens"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    token: str = Field(max_length=255, unique=True, index=True)
    expires_at: datetime = Field()
    used: bool = Field(default=False)
