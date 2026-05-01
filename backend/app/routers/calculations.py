import math
from fastapi import APIRouter

from app.config import settings
from app.schemas.calculation import CalculationRequest, CalculationResponse, RoofFeasibility

router = APIRouter(tags=["calculations"])

_PANEL_WP = 400       # 400 Wp per panel
_PANEL_M2 = 2.0       # m² footprint per panel (with spacing)
_OFFSET = 0.85        # grid-tied systems offset ~85% of bill via solar


def _monthly_bill(kwh: float) -> float:
    """Progressive CEB 2026 tariff — each band applies only to kWh within it."""
    s = settings
    bill = 0.0

    band1 = min(kwh, s.ceb_band_1_limit_kwh)
    bill += band1 * s.ceb_band_1_rate

    if kwh > s.ceb_band_1_limit_kwh:
        band2 = min(kwh - s.ceb_band_1_limit_kwh,
                    s.ceb_band_2_limit_kwh - s.ceb_band_1_limit_kwh)
        bill += band2 * s.ceb_band_2_rate

    if kwh > s.ceb_band_2_limit_kwh:
        band3 = min(kwh - s.ceb_band_2_limit_kwh,
                    s.ceb_band_3_limit_kwh - s.ceb_band_2_limit_kwh)
        bill += band3 * s.ceb_band_3_rate

    if kwh > s.ceb_band_3_limit_kwh:
        bill += (kwh - s.ceb_band_3_limit_kwh) * s.ceb_band_4_rate

    return round(bill, 2)


@router.post("/calculate", response_model=CalculationResponse)
async def calculate(body: CalculationRequest) -> CalculationResponse:
    s = settings

    # ── 1. Monthly bill ───────────────────────────────────────────────────────
    monthly_bill = _monthly_bill(body.monthly_kwh)

    # ── 2. PV sizing ──────────────────────────────────────────────────────────
    daily_kwh = body.monthly_kwh / 30
    pv_kw = daily_kwh / (s.solar_irradiance_kwh_m2_day * (1 - s.system_losses))
    pv_kw = round(pv_kw, 2)

    # ── 3. Panel count ────────────────────────────────────────────────────────
    panel_count = math.ceil(pv_kw * 1000 / _PANEL_WP)

    # ── 4. Roof feasibility ───────────────────────────────────────────────────
    required_m2 = round(panel_count * _PANEL_M2, 1)

    if body.roof_area_m2 is not None:
        if body.roof_area_m2 >= required_m2:
            roof_status = "ok"
        else:
            roof_status = "limited"
            max_panels = int(body.roof_area_m2 // _PANEL_M2)
            panel_count = max(1, max_panels)
            pv_kw = round(panel_count * _PANEL_WP / 1000, 2)
            required_m2 = round(panel_count * _PANEL_M2, 1)
    else:
        roof_status = "unknown"

    roof = RoofFeasibility(
        required_m2=required_m2,
        available_m2=body.roof_area_m2,
        status=roof_status,
    )

    # ── 5. Costs ──────────────────────────────────────────────────────────────
    system_cost = round(pv_kw * 1000 * s.average_system_cost_rs_wp, 2)

    battery_kwh = None
    battery_cost = 0.0
    if body.include_battery:
        battery_kwh = round(daily_kwh, 1)
        battery_cost = round(battery_kwh * s.battery_cost_rs_kwh, 2)

    total_cost = round(system_cost + battery_cost, 2)

    # ── 6. Savings & returns ──────────────────────────────────────────────────
    monthly_savings = round(monthly_bill * _OFFSET, 2)
    annual_savings = round(monthly_savings * 12, 2)

    payback_years = round(total_cost / annual_savings, 1) if annual_savings > 0 else 0.0

    lifetime_savings = annual_savings * s.project_lifetime_years
    roi_25yr = (
        round((lifetime_savings - total_cost) / total_cost * 100, 1)
        if total_cost > 0
        else 0.0
    )

    return CalculationResponse(
        monthly_kwh=body.monthly_kwh,
        monthly_bill_rs=monthly_bill,
        pv_kw=pv_kw,
        panel_count=panel_count,
        battery_kwh=battery_kwh,
        roof=roof,
        system_cost_rs=system_cost,
        battery_cost_rs=battery_cost,
        total_cost_rs=total_cost,
        monthly_savings_rs=monthly_savings,
        annual_savings_rs=annual_savings,
        payback_years=payback_years,
        roi_25yr_pct=roi_25yr,
    )
