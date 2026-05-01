"""Battery storage sizing and costing."""
from dataclasses import dataclass

from app.config import settings


@dataclass
class BatteryResult:
    included: bool
    capacity_kwh: float | None  # None when not included
    cost_rs: float


def size_battery(daily_kwh: float, include: bool) -> BatteryResult:
    """Size battery to cover one day of consumption when requested."""
    if not include:
        return BatteryResult(included=False, capacity_kwh=None, cost_rs=0.0)
    capacity = round(daily_kwh, 1)
    cost = round(capacity * settings.battery_cost_rs_kwh, 2)
    return BatteryResult(included=True, capacity_kwh=capacity, cost_rs=cost)
