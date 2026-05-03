import dataclasses

from fastapi import APIRouter

from app.config import settings
from app.schemas.calculation import (
    AppConfigResponse,
    CalculationRequest,
    CalculationResponse,
    ConfigOverrides,
    RoofFeasibility,
)
from app.services import (
    battery_engine,
    explainability,
    load_engine,
    roi_engine,
    solar_engine,
    surface_area,
    tariff_engine,
)

router = APIRouter(tags=["calculations"])


def _make_cfg(overrides: ConfigOverrides | None):
    """Merge per-request config overrides onto the server defaults."""
    if overrides is None:
        return settings
    delta = overrides.model_dump(exclude_none=True)
    return settings.model_copy(update=delta) if delta else settings


@router.get("/config", response_model=AppConfigResponse)
async def get_config() -> AppConfigResponse:
    """Return the server's default values for all user-adjustable parameters."""
    return AppConfigResponse(**{k: getattr(settings, k) for k in AppConfigResponse.model_fields})


@router.post("/calculate", response_model=CalculationResponse)
async def calculate(body: CalculationRequest) -> CalculationResponse:
    cfg     = _make_cfg(body.config_overrides)
    load    = load_engine.analyse(body.monthly_kwh)
    tariff  = tariff_engine.compute_bill(body.monthly_kwh, cfg)
    solar   = solar_engine.size_system(load.daily_kwh, cfg)
    roof    = surface_area.evaluate(solar.pv_kw, body.roof_area_m2, cfg)
    battery = battery_engine.size_battery(load.daily_kwh, body.include_battery, cfg)
    roi     = roi_engine.compute(tariff.total_rs, load.monthly_kwh, roof.pv_kw, battery.cost_rs, cfg)

    expl = None
    if body.include_explanations:
        raw = explainability.explain_all(body.monthly_kwh, tariff, load, solar, battery, roof, roi, cfg)
        expl = {k: dataclasses.asdict(v) for k, v in raw.items()}

    return CalculationResponse(
        monthly_kwh=body.monthly_kwh,
        monthly_bill_rs=tariff.total_rs,
        pv_kw=roof.pv_kw,
        panel_count=roof.panel_count,
        battery_kwh=battery.capacity_kwh,
        roof=RoofFeasibility(
            required_m2=roof.required_m2,
            available_m2=roof.available_m2,
            status=roof.status,
        ),
        system_cost_rs=roi.system_cost_rs,
        battery_cost_rs=roi.battery_cost_rs,
        total_cost_rs=roi.total_cost_rs,
        monthly_savings_rs=roi.monthly_savings_rs,
        annual_savings_rs=roi.annual_savings_rs,
        export_credit_rs=roi.export_credit_rs,
        payback_years=roi.payback_years,
        roi_25yr_pct=roi.roi_25yr_pct,
        explanations=expl,
    )
