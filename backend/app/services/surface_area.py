"""Roof feasibility and panel layout model."""
import math
from dataclasses import dataclass

from app.config import settings


@dataclass
class RoofAssessment:
    panel_count: int
    required_m2: float
    available_m2: float | None
    status: str   # "ok" | "limited" | "unknown"
    pv_kw: float  # may be adjusted downward when roof is limited


def evaluate(pv_kw: float, roof_area_m2: float | None) -> RoofAssessment:
    """Assess whether the required PV system fits the available roof space."""
    s = settings
    count = math.ceil(pv_kw * 1000 / s.solar_panel_wattage)
    required = round(count * s.solar_panel_footprint_m2, 1)

    if roof_area_m2 is None:
        return RoofAssessment(count, required, None, "unknown", pv_kw)

    if roof_area_m2 >= required:
        return RoofAssessment(count, required, roof_area_m2, "ok", pv_kw)

    # Roof is smaller than needed — fit as many panels as possible
    limited_count = max(1, int(roof_area_m2 // s.solar_panel_footprint_m2))
    adj_pv_kw = round(limited_count * s.solar_panel_wattage / 1000, 2)
    adj_required = round(limited_count * s.solar_panel_footprint_m2, 1)
    return RoofAssessment(limited_count, adj_required, roof_area_m2, "limited", adj_pv_kw)
