from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from datetime import datetime, timezone

from app.database import get_session
from app.config import settings

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check():
    """Liveness probe — always 200 if the process is running."""
    return {
        "status": "ok",
        "service": settings.app_name,
        "env": settings.app_env,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/health/ready")
async def readiness_check(session: AsyncSession = Depends(get_session)):
    """Readiness probe — verifies database connectivity."""
    try:
        await session.execute(text("SELECT 1"))
        db_status = "ok"
    except Exception as exc:
        db_status = f"error: {exc}"

    return {
        "status": "ready" if db_status == "ok" else "degraded",
        "database": db_status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
