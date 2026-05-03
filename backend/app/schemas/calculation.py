from pydantic import BaseModel, field_validator
from typing import Optional


class ConfigOverrides(BaseModel):
    """Per-request overrides for any setting in app.config.Settings.
    All fields are optional; omitted fields fall back to the server default."""
    # CEB tariff bands
    ceb_band_1_limit_kwh: Optional[int] = None
    ceb_band_1_rate: Optional[float] = None
    ceb_band_2_limit_kwh: Optional[int] = None
    ceb_band_2_rate: Optional[float] = None
    ceb_band_3_limit_kwh: Optional[int] = None
    ceb_band_3_rate: Optional[float] = None
    ceb_band_4_rate: Optional[float] = None
    # Solar resource
    solar_irradiance_kwh_m2_day: Optional[float] = None
    system_losses: Optional[float] = None
    # Costs
    average_system_cost_rs_wp: Optional[float] = None
    battery_cost_rs_kwh: Optional[float] = None
    # Panel specs
    solar_panel_wattage: Optional[int] = None
    solar_panel_footprint_m2: Optional[float] = None
    # Financial
    grid_offset_factor: Optional[float] = None
    project_lifetime_years: Optional[int] = None
    discount_rate: Optional[float] = None
    inflation_rate: Optional[float] = None
    solar_panel_degradation_per_year: Optional[float] = None
    maintenance_cost_rs_kw_year: Optional[float] = None
    # CEB net-metering export tariff
    ceb_export_tariff_rs_kwh: Optional[float] = None


class AppConfigResponse(BaseModel):
    """All user-adjustable settings with their current (server default) values."""
    ceb_band_1_limit_kwh: int
    ceb_band_1_rate: float
    ceb_band_2_limit_kwh: int
    ceb_band_2_rate: float
    ceb_band_3_limit_kwh: int
    ceb_band_3_rate: float
    ceb_band_4_rate: float
    solar_irradiance_kwh_m2_day: float
    system_losses: float
    average_system_cost_rs_wp: float
    battery_cost_rs_kwh: float
    solar_panel_wattage: int
    solar_panel_footprint_m2: float
    grid_offset_factor: float
    project_lifetime_years: int
    discount_rate: float
    inflation_rate: float
    solar_panel_degradation_per_year: float
    maintenance_cost_rs_kw_year: float
    ceb_export_tariff_rs_kwh: float


class CalculationRequest(BaseModel):
    monthly_kwh: float
    roof_area_m2: Optional[float] = None
    include_battery: bool = False
    include_explanations: bool = False
    config_overrides: Optional[ConfigOverrides] = None

    @field_validator("monthly_kwh")
    @classmethod
    def kwh_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("monthly_kwh must be greater than 0")
        return v


class RoofFeasibility(BaseModel):
    required_m2: float
    available_m2: Optional[float]
    status: str  # "ok" | "limited" | "unknown"


class ExplainStep(BaseModel):
    label: str
    expr: str
    result: str


class MetricExplanation(BaseModel):
    key: str
    label: str
    formula: str
    inputs: list[dict[str, str]]
    steps: list[ExplainStep]
    result: str
    unit: str


class CalculationResponse(BaseModel):
    monthly_kwh: float
    monthly_bill_rs: float
    pv_kw: float
    panel_count: int
    battery_kwh: Optional[float]
    roof: RoofFeasibility
    system_cost_rs: float
    battery_cost_rs: float
    total_cost_rs: float
    monthly_savings_rs: float
    annual_savings_rs: float
    export_credit_rs: float
    payback_years: float
    roi_25yr_pct: float
    explanations: Optional[dict[str, MetricExplanation]] = None
