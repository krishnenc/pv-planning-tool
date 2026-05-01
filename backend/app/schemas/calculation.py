from pydantic import BaseModel, field_validator
from typing import Optional


class CalculationRequest(BaseModel):
    monthly_kwh: float
    roof_area_m2: Optional[float] = None
    include_battery: bool = False
    include_explanations: bool = False

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
    payback_years: float
    roi_25yr_pct: float
    explanations: Optional[dict[str, MetricExplanation]] = None
