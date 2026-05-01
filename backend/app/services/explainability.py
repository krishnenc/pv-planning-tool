"""Structured formula/step explanations for each calculated metric."""
from dataclasses import dataclass, field

from app.config import settings, Settings
from app.services.battery_engine import BatteryResult
from app.services.load_engine import LoadProfile
from app.services.roi_engine import FinancialResult
from app.services.solar_engine import SolarSizing
from app.services.surface_area import RoofAssessment
from app.services.tariff_engine import TariffBreakdown


@dataclass
class ExplainStep:
    label: str   # human-readable step name
    expr: str    # the expression evaluated
    result: str  # formatted result with unit


@dataclass
class MetricExplanation:
    key: str
    label: str
    formula: str
    inputs: list[dict[str, str]] = field(default_factory=list)
    steps: list[ExplainStep] = field(default_factory=list)
    result: str = ""
    unit: str = ""


def explain_all(
    monthly_kwh: float,
    tariff: TariffBreakdown,
    load: LoadProfile,
    solar: SolarSizing,
    battery: BatteryResult,
    roof: RoofAssessment,
    roi: FinancialResult,
    cfg: Settings = settings,
) -> dict[str, MetricExplanation]:
    return {
        "pv_kw":           _pv(load, solar, cfg),
        "panels":          _panels(solar, roof, cfg),
        "battery":         _battery(load, battery, cfg),
        "system_cost":     _system_cost(roof, battery, roi, cfg),
        "roof_required":   _roof(roof, cfg),
        "monthly_bill":    _bill(monthly_kwh, tariff, cfg),
        "monthly_savings": _savings(tariff, roi, cfg),
        "payback":         _payback(roi),
        "roi_25yr":        _roi(roi, cfg),
    }


def _pv(load: LoadProfile, solar: SolarSizing, cfg: Settings = settings) -> MetricExplanation:
    s = cfg
    return MetricExplanation(
        key="pv_kw",
        label="PV Capacity",
        formula="daily_kWh ÷ (irradiance × (1 − losses))",
        inputs=[
            {"label": "Monthly consumption", "value": f"{load.monthly_kwh:.0f} kWh"},
            {"label": "Irradiance (Mauritius)", "value": f"{s.solar_irradiance_kwh_m2_day} kWh/m²/day"},
            {"label": "System losses", "value": f"{s.system_losses * 100:.0f} %"},
        ],
        steps=[
            ExplainStep("Daily load", f"{load.monthly_kwh:.0f} ÷ 30", f"{load.daily_kwh:.3f} kWh/day"),
            ExplainStep(
                "Peak sun hrs",
                f"{s.solar_irradiance_kwh_m2_day} × (1 − {s.system_losses})",
                f"{solar.effective_hours:.4f} hrs/day",
            ),
            ExplainStep(
                "PV size",
                f"{load.daily_kwh:.3f} ÷ {solar.effective_hours:.4f}",
                f"{solar.pv_kw:.2f} kW",
            ),
        ],
        result=f"{solar.pv_kw:.2f}",
        unit="kW",
    )


def _panels(solar: SolarSizing, roof: RoofAssessment, cfg: Settings = settings) -> MetricExplanation:
    s = cfg
    raw = solar.pv_kw * 1000 / s.solar_panel_wattage
    return MetricExplanation(
        key="panels",
        label="Panel Count",
        formula="⌈ PV (kW) × 1000 ÷ panel_Wp ⌉",
        inputs=[
            {"label": "PV size", "value": f"{solar.pv_kw:.2f} kW"},
            {"label": "Panel capacity", "value": f"{s.solar_panel_wattage} Wp"},
        ],
        steps=[
            ExplainStep("Raw count", f"{solar.pv_kw:.2f} × 1000 ÷ {s.solar_panel_wattage}", f"{raw:.2f}"),
            ExplainStep("Panels (ceiling)", f"⌈ {raw:.2f} ⌉", f"{roof.panel_count} panels"),
        ],
        result=str(roof.panel_count),
        unit="panels",
    )


def _battery(load: LoadProfile, battery: BatteryResult, cfg: Settings = settings) -> MetricExplanation:
    s = cfg
    if not battery.included:
        return MetricExplanation(
            key="battery",
            label="Battery Storage",
            formula="Not included",
            inputs=[{"label": "Status", "value": "Not selected"}],
            steps=[ExplainStep("Battery", "not requested", "—")],
            result="—",
            unit="",
        )
    return MetricExplanation(
        key="battery",
        label="Battery Storage",
        formula="capacity (kWh) = daily_kWh  (one day of storage)",
        inputs=[
            {"label": "Daily consumption", "value": f"{load.daily_kwh:.3f} kWh"},
            {"label": "Cost per kWh", "value": f"Rs {s.battery_cost_rs_kwh:,.0f}"},
        ],
        steps=[
            ExplainStep("Capacity", f"round({load.daily_kwh:.3f}, 1)", f"{battery.capacity_kwh:.1f} kWh"),
            ExplainStep(
                "Cost",
                f"{battery.capacity_kwh:.1f} × Rs {s.battery_cost_rs_kwh:,.0f}",
                f"Rs {battery.cost_rs:,.2f}",
            ),
        ],
        result=f"{battery.capacity_kwh:.1f}",
        unit="kWh",
    )


def _system_cost(roof: RoofAssessment, battery: BatteryResult, roi: FinancialResult, cfg: Settings = settings) -> MetricExplanation:
    s = cfg
    steps = [
        ExplainStep(
            "System cost",
            f"{roof.pv_kw:.2f} × 1000 × Rs {s.average_system_cost_rs_wp:.0f}",
            f"Rs {roi.system_cost_rs:,.2f}",
        ),
    ]
    if battery.included and battery.capacity_kwh is not None:
        steps.append(ExplainStep(
            "Battery cost",
            f"{battery.capacity_kwh:.1f} × Rs {s.battery_cost_rs_kwh:,.0f}",
            f"Rs {roi.battery_cost_rs:,.2f}",
        ))
    steps.append(ExplainStep("Total", f"Rs {roi.system_cost_rs:,.2f} + Rs {roi.battery_cost_rs:,.2f}", f"Rs {roi.total_cost_rs:,.2f}"))

    inputs = [
        {"label": "PV size", "value": f"{roof.pv_kw:.2f} kW"},
        {"label": "Cost per Wp (2026)", "value": f"Rs {s.average_system_cost_rs_wp:.2f}"},
    ]
    if battery.included and battery.capacity_kwh is not None:
        inputs += [
            {"label": "Battery", "value": f"{battery.capacity_kwh:.1f} kWh"},
            {"label": "Cost per kWh", "value": f"Rs {s.battery_cost_rs_kwh:,.0f}"},
        ]

    return MetricExplanation(
        key="system_cost",
        label="System Cost",
        formula="PV (kW) × 1000 × Rs/Wp  +  battery (kWh) × Rs/kWh",
        inputs=inputs,
        steps=steps,
        result=f"{roi.total_cost_rs:,.2f}",
        unit="Rs",
    )


def _roof(roof: RoofAssessment, cfg: Settings = settings) -> MetricExplanation:
    s = cfg
    return MetricExplanation(
        key="roof_required",
        label="Required Roof Area",
        formula="panel_count × footprint_per_panel (m²)",
        inputs=[
            {"label": "Panel count", "value": str(roof.panel_count)},
            {"label": "Area per panel", "value": f"{s.solar_panel_footprint_m2} m²"},
        ],
        steps=[
            ExplainStep(
                "Required area",
                f"{roof.panel_count} × {s.solar_panel_footprint_m2}",
                f"{roof.required_m2:.1f} m²",
            ),
        ],
        result=f"{roof.required_m2:.1f}",
        unit="m²",
    )


def _bill(monthly_kwh: float, tariff: TariffBreakdown, cfg: Settings = settings) -> MetricExplanation:
    s = cfg
    return MetricExplanation(
        key="monthly_bill",
        label="Monthly Bill",
        formula="CEB 2026 progressive tariff — 4 bands",
        inputs=[
            {"label": "Band 1 (0–100 kWh)", "value": f"Rs {s.ceb_band_1_rate:.2f}/kWh"},
            {"label": "Band 2 (101–300 kWh)", "value": f"Rs {s.ceb_band_2_rate:.2f}/kWh"},
            {"label": "Band 3 (301–600 kWh)", "value": f"Rs {s.ceb_band_3_rate:.2f}/kWh"},
            {"label": "Band 4 (> 600 kWh)", "value": f"Rs {s.ceb_band_4_rate:.2f}/kWh"},
            {"label": "Monthly consumption", "value": f"{monthly_kwh:.0f} kWh"},
        ],
        steps=[
            ExplainStep(
                f"Band 1 ({tariff.band_1_kwh:.0f} kWh × Rs {s.ceb_band_1_rate:.2f})",
                f"{tariff.band_1_kwh:.0f} × {s.ceb_band_1_rate}",
                f"Rs {tariff.band_1_rs:.2f}",
            ),
            ExplainStep(
                f"Band 2 ({tariff.band_2_kwh:.0f} kWh × Rs {s.ceb_band_2_rate:.2f})",
                f"{tariff.band_2_kwh:.0f} × {s.ceb_band_2_rate}",
                f"Rs {tariff.band_2_rs:.2f}",
            ),
            ExplainStep(
                f"Band 3 ({tariff.band_3_kwh:.0f} kWh × Rs {s.ceb_band_3_rate:.2f})",
                f"{tariff.band_3_kwh:.0f} × {s.ceb_band_3_rate}",
                f"Rs {tariff.band_3_rs:.2f}",
            ),
            ExplainStep(
                f"Band 4 ({tariff.band_4_kwh:.0f} kWh × Rs {s.ceb_band_4_rate:.2f})",
                f"{tariff.band_4_kwh:.0f} × {s.ceb_band_4_rate}",
                f"Rs {tariff.band_4_rs:.2f}",
            ),
            ExplainStep("Total", "sum of bands", f"Rs {tariff.total_rs:.2f}"),
        ],
        result=f"{tariff.total_rs:.2f}",
        unit="Rs",
    )


def _savings(tariff: TariffBreakdown, roi: FinancialResult, cfg: Settings = settings) -> MetricExplanation:
    s = cfg
    return MetricExplanation(
        key="monthly_savings",
        label="Monthly Savings",
        formula="monthly_bill × grid_offset_factor",
        inputs=[
            {"label": "Monthly bill", "value": f"Rs {tariff.total_rs:.2f}"},
            {"label": "Solar offset", "value": f"{s.grid_offset_factor * 100:.0f} %"},
        ],
        steps=[
            ExplainStep(
                "Monthly savings",
                f"Rs {tariff.total_rs:.2f} × {s.grid_offset_factor}",
                f"Rs {roi.monthly_savings_rs:.2f}",
            ),
            ExplainStep(
                "Annual savings",
                f"Rs {roi.monthly_savings_rs:.2f} × 12",
                f"Rs {roi.annual_savings_rs:.2f}",
            ),
        ],
        result=f"{roi.monthly_savings_rs:.2f}",
        unit="Rs",
    )


def _payback(roi: FinancialResult) -> MetricExplanation:
    return MetricExplanation(
        key="payback",
        label="Payback Period",
        formula="total_cost ÷ annual_savings",
        inputs=[
            {"label": "Total investment", "value": f"Rs {roi.total_cost_rs:,.2f}"},
            {"label": "Annual savings", "value": f"Rs {roi.annual_savings_rs:,.2f}"},
        ],
        steps=[
            ExplainStep(
                "Payback",
                f"Rs {roi.total_cost_rs:,.2f} ÷ Rs {roi.annual_savings_rs:,.2f}",
                f"{roi.payback_years:.1f} years",
            ),
        ],
        result=f"{roi.payback_years:.1f}",
        unit="years",
    )


def _roi(roi: FinancialResult, cfg: Settings = settings) -> MetricExplanation:
    s = cfg
    lifetime = roi.annual_savings_rs * s.project_lifetime_years
    net = lifetime - roi.total_cost_rs
    return MetricExplanation(
        key="roi_25yr",
        label="25-Year ROI",
        formula="(total_savings − cost) ÷ cost × 100",
        inputs=[
            {"label": "Annual savings", "value": f"Rs {roi.annual_savings_rs:,.2f}"},
            {"label": "Horizon", "value": f"{s.project_lifetime_years} years"},
            {"label": "Total investment", "value": f"Rs {roi.total_cost_rs:,.2f}"},
        ],
        steps=[
            ExplainStep(
                "Lifetime savings",
                f"Rs {roi.annual_savings_rs:,.2f} × {s.project_lifetime_years}",
                f"Rs {lifetime:,.2f}",
            ),
            ExplainStep(
                "Net gain",
                f"Rs {lifetime:,.2f} − Rs {roi.total_cost_rs:,.2f}",
                f"Rs {net:,.2f}",
            ),
            ExplainStep(
                "ROI",
                f"Rs {net:,.2f} ÷ Rs {roi.total_cost_rs:,.2f} × 100",
                f"{roi.roi_25yr_pct:.1f} %",
            ),
        ],
        result=f"{roi.roi_25yr_pct:.1f}",
        unit="%",
    )
