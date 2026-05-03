import asyncio
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_session
from app.models.contact import ContactMessage
from app.schemas.contact import ContactRequest, ContactResponse

router = APIRouter(tags=["contact"])
logger = logging.getLogger(__name__)


def _send_email(req: ContactRequest) -> None:
    """Send an email notification via SMTP. Runs in a background thread."""
    if not settings.smtp_host or not settings.contact_email:
        return

    body = (
        f"Name:    {req.name}\n"
        f"Email:   {req.email}\n"
        f"Subject: {req.subject}\n"
        f"\n{req.message}"
    )

    msg = MIMEMultipart()
    msg["From"] = settings.smtp_username or settings.contact_email
    msg["To"] = settings.contact_email
    msg["Reply-To"] = req.email
    msg["Subject"] = f"[SolarMoris] {req.subject}"
    msg.attach(MIMEText(body, "plain"))

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
            server.ehlo()
            server.starttls()
            if settings.smtp_username and settings.smtp_password:
                server.login(settings.smtp_username, settings.smtp_password)
            server.sendmail(msg["From"], [settings.contact_email], msg.as_string())
    except Exception:
        logger.exception("Failed to send contact notification email")


@router.post("/contact", response_model=ContactResponse, status_code=201)
async def submit_contact(
    body: ContactRequest,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_session),
) -> ContactResponse:
    if body.honeypot:
        # Silent rejection — return success to not tip off bots
        return ContactResponse(message="Thank you for your message. We'll be in touch soon.")

    record = ContactMessage(
        name=body.name,
        email=body.email,
        subject=body.subject,
        message=body.message,
    )
    session.add(record)
    await session.commit()

    background_tasks.add_task(asyncio.to_thread, _send_email, body)

    return ContactResponse(message="Thank you for your message. We'll be in touch soon.")
