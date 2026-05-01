from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app import models  # noqa: F401 — ensures all SQLModel tables are registered before init_db
from app.routers.health import router as health_router
from app.routers.auth import router as auth_router
from app.routers.calculations import router as calculations_router
from app.routers.bill import router as bill_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description=(
        "Hybrid Solar Feasibility & ROI Planning Tool for Mauritius "
        "(CEB 2026 tariffs). Calculates system sizing, financial returns, "
        "and environmental impact for grid-tied + battery hybrid installations."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Liveness at root: GET /health
app.include_router(health_router)

# Readiness at versioned prefix: GET /api/v1/health/ready
app.include_router(health_router, prefix=settings.api_v1_prefix)

# Auth endpoints: POST /api/v1/auth/register|login|forgot-password|reset-password
app.include_router(auth_router, prefix=f"{settings.api_v1_prefix}/auth")

# Calculation endpoint: POST /api/v1/calculate
app.include_router(calculations_router, prefix=settings.api_v1_prefix)

# Bill upload endpoint: POST /api/v1/bill/upload
app.include_router(bill_router, prefix=settings.api_v1_prefix)


@app.get("/")
async def root():
    return {
        "message": "Solar Feasibility API",
        "docs": "/docs",
        "health": "/health",
    }
