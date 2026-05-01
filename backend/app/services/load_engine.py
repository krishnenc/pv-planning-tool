"""Electricity consumption analysis."""
from dataclasses import dataclass


@dataclass
class LoadProfile:
    monthly_kwh: float
    daily_kwh: float    # monthly / 30
    annual_kwh: float   # monthly × 12


def analyse(monthly_kwh: float) -> LoadProfile:
    return LoadProfile(
        monthly_kwh=monthly_kwh,
        daily_kwh=monthly_kwh / 30,
        annual_kwh=monthly_kwh * 12,
    )
