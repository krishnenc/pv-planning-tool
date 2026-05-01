"""PV system sizing based on Mauritius solar resource."""
from dataclasses import dataclass

from app.config import settings, Settings


@dataclass
class SolarSizing:
    pv_kw: float            # required PV capacity
    daily_kwh: float        # input daily consumption
    effective_hours: float  # irradiance × (1 − losses)


def size_system(daily_kwh: float, cfg: Settings = settings) -> SolarSizing:
    """Size a PV system to cover the given daily energy demand."""
    s = cfg
    effective_hours = round(s.solar_irradiance_kwh_m2_day * (1 - s.system_losses), 4)
    pv_kw = round(daily_kwh / effective_hours, 2)
    return SolarSizing(pv_kw=pv_kw, daily_kwh=daily_kwh, effective_hours=effective_hours)
