from pydantic import BaseModel, EmailStr, field_validator


class ContactRequest(BaseModel):
    name: str
    email: EmailStr
    subject: str
    message: str
    honeypot: str = ""  # must be empty; bots fill this in

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name is required")
        if len(v) > 200:
            raise ValueError("Name must be 200 characters or fewer")
        return v

    @field_validator("subject")
    @classmethod
    def subject_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Subject is required")
        if len(v) > 300:
            raise ValueError("Subject must be 300 characters or fewer")
        return v

    @field_validator("message")
    @classmethod
    def message_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Message is required")
        if len(v) > 5000:
            raise ValueError("Message must be 5,000 characters or fewer")
        return v


class ContactResponse(BaseModel):
    message: str
