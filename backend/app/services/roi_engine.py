"""Financial returns: costs, savings, payback, and 25-year ROI.

Savings model (CEB net metering):
  The solar system is sized to produce monthly_kwh of energy.
  grid_offset_factor is the self-consumption rate — the fraction consumed
  directly (or stored in a battery) rather than exported.

  self_consumed  = monthly_kwh × self_consumption_rate
  exported       = monthly_kwh × (1 − self_consumption_rate)
  remaining_grid = same volume as exported (consumed at night from the grid)

  Monthly savings = (original_bill − new_bill_on_remaining_grid)
                  + export_credit_rs
"""
from dataclasses import dataclass

from app.config import settings, Settings
from app.services import tariff_engine


@dataclass
class FinancialResult:
    system_cost_rs: float
    battery_cost_rs: float
    total_cost_rs: float
    monthly_savings_rs: float
    annual_savings_rs: float
    export_credit_rs: float     # monthly CEB net-metering export credit
    payback_years: float
    roi_25yr_pct: float


def compute(
    monthly_bill_rs: float,
    monthly_kwh: float,
    pv_kw: float,
    battery_cost_rs: float,
    cfg: Settings = settings,
) -> FinancialResult:
    """Compute all financial metrics for a given system configuration."""
    s = cfg
    system_cost = round(pv_kw * 1000 * s.average_system_cost_rs_wp, 2)
    total_cost  = round(system_cost + battery_cost_rs, 2)

    # ── Net metering split ────────────────────────────────────────────────────
    # grid_offset_factor = self-consumption rate (fraction used on-site or from battery)
    remaining_grid_kwh = round(monthly_kwh * (1 - s.grid_offset_factor), 4)

    # Bill on the kWh still drawn from the grid (night / cloudy periods)
    new_bill_rs = tariff_engine.compute_bill(remaining_grid_kwh, cfg).total_rs

    # Credit for energy exported to the CEB grid at the net-metering tariff
    exported_kwh       = remaining_grid_kwh   # system sized to match consumption
    export_credit_rs   = round(exported_kwh * s.ceb_export_tariff_rs_kwh, 2)

    monthly_savings = round(monthly_bill_rs - new_bill_rs + export_credit_rs, 2)
    annual_savings  = round(monthly_savings * 12, 2)

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
        export_credit_rs=export_credit_rs,
        payback_years=payback,
        roi_25yr_pct=roi,
    )
