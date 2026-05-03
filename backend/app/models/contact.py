from typing import Optional
from sqlmodel import Field
from app.models.base import TimestampMixin


class ContactMessage(TimestampMixin, table=True):
    __tablename__ = "contact_messages"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=200)
    email: str = Field(max_length=200)
    subject: str = Field(max_length=300)
    message: str = Field(max_length=5000)
