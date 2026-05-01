"""Financial returns: costs, savings, payback, and 25-year ROI."""
from dataclasses import dataclass

from app.config import settings, Settings


@dataclass
class FinancialResult:
    system_cost_rs: float
    battery_cost_rs: float
    total_cost_rs: float
    monthly_savings_rs: float
    annual_savings_rs: float
    payback_years: float
    roi_25yr_pct: float


def compute(monthly_bill_rs: float, pv_kw: float, battery_cost_rs: float, cfg: Settings = settings) -> FinancialResult:
    """Compute all financial metrics for a given system configuration."""
    s = cfg
    system_cost = round(pv_kw * 1000 * s.average_system_cost_rs_wp, 2)
    total_cost = round(system_cost + battery_cost_rs, 2)

    monthly_savings = round(monthly_bill_rs * s.grid_offset_factor, 2)
    annual_savings = round(monthly_savings * 12, 2)

    payback = round(total_cost / annual_savings, 1) if annual_savings > 0 else 0.0
    lifetime_savings = annual_savings * s.project_lifetime_years
    roi = (
        round((lifetime_savings - total_cost) / total_cost * 100, 1)
        if total_cost > 0 else 0.0
    )

    return FinancialResult(
        system_cost_rs=system_cost,
        battery_cost_rs=battery_cost_rs,
        total_cost_rs=total_cost,
        monthly_savings_rs=monthly_savings,
        annual_savings_rs=annual_savings,
        payback_years=payback,
        roi_25yr_pct=roi,
    )
