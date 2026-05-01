from datetime import datetime, timezone
from typing import Optional
from sqlmodel import SQLModel, Field


class TimestampMixin(SQLModel):
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Optional[datetime] = Field(default=None, nullable=True)


class SolarProject(TimestampMixin, table=True):
    """Placeholder model — represents a user's solar feasibility assessment."""
    __tablename__ = "solar_projects"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=200, index=True)
    location: str = Field(max_length=200, default="Mauritius")
    monthly_consumption_kwh: float = Field(gt=0)
    roof_area_m2: float = Field(gt=0)
    budget_rs: Optional[float] = Field(default=None)
    include_battery: bool = Field(default=False)
