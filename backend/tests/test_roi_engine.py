import pytest
from app.config import settings
from app.services.roi_engine import compute
from app.services import tariff_engine


def test_system_cost():
    roi = compute(monthly_bill_rs=2000, monthly_kwh=250, pv_kw=3.0, battery_cost_rs=0)
    assert roi.system_cost_rs == pytest.approx(3.0 * 1000 * settings.average_system_cost_rs_wp, abs=0.01)


def test_total_cost_includes_battery():
    battery_rs = 50_000.0
    roi = compute(monthly_bill_rs=2000, monthly_kwh=250, pv_kw=3.0, battery_cost_rs=battery_rs)
    expected = 3.0 * 1000 * settings.average_system_cost_rs_wp + battery_rs
    assert roi.total_cost_rs == pytest.approx(expected, abs=0.01)


def test_monthly_savings_includes_export_credit():
    """Savings = (original_bill - bill_on_remaining_grid) + export_credit."""
    monthly_kwh = 250
    roi = compute(monthly_bill_rs=2000, monthly_kwh=monthly_kwh, pv_kw=3.0, battery_cost_rs=0)
    remaining = monthly_kwh * (1 - settings.grid_offset_factor)
    new_bill = tariff_engine.compute_bill(remaining).total_rs
    export_credit = remaining * settings.ceb_export_tariff_rs_kwh
    expected = round(2000 - new_bill + export_credit, 2)
    assert roi.monthly_savings_rs == pytest.approx(expected, abs=0.01)


def test_export_credit_is_positive():
    roi = compute(monthly_bill_rs=2000, monthly_kwh=250, pv_kw=3.0, battery_cost_rs=0)
    assert roi.export_credit_rs > 0


def test_payback():
    roi = compute(monthly_bill_rs=2000, monthly_kwh=250, pv_kw=3.0, battery_cost_rs=0)
    expected = roi.total_cost_rs / roi.annual_savings_rs
    assert roi.payback_years == pytest.approx(expected, rel=0.01)


def test_roi_25yr():
    roi = compute(monthly_bill_rs=2000, monthly_kwh=250, pv_kw=3.0, battery_cost_rs=0)
    lifetime = roi.annual_savings_rs * settings.project_lifetime_years
    expected = (lifetime - roi.total_cost_rs) / roi.total_cost_rs * 100
    assert roi.roi_25yr_pct == pytest.approx(expected, abs=0.2)


# ── Additional ROI correctness tests ─────────────────────────────────────────

def test_annual_savings_is_twelve_times_monthly():
    roi = compute(monthly_bill_rs=3000, monthly_kwh=370, pv_kw=4.0, battery_cost_rs=0)
    assert roi.annual_savings_rs == pytest.approx(roi.monthly_savings_rs * 12, abs=0.01)


def test_zero_pv_kw_gives_zero_system_cost():
    roi = compute(monthly_bill_rs=2000, monthly_kwh=250, pv_kw=0.0, battery_cost_rs=0)
    assert roi.system_cost_rs == 0.0
    assert roi.total_cost_rs == 0.0


def test_zero_annual_savings_gives_zero_payback():
    """When the bill is zero there are no savings and payback is returned as 0."""
    roi = compute(monthly_bill_rs=0, monthly_kwh=0, pv_kw=3.0, battery_cost_rs=0)
    assert roi.payback_years == 0.0


def test_negative_roi_when_system_costs_more_than_lifetime_savings():
    """A very large system on a tiny bill should produce negative 25-yr ROI."""
    roi = compute(monthly_bill_rs=100, monthly_kwh=20, pv_kw=20.0, battery_cost_rs=0)
    assert roi.roi_25yr_pct < 0


def test_battery_cost_increases_total_and_worsens_payback():
    """Adding battery cost increases total investment and extends payback."""
    roi_no_bat = compute(monthly_bill_rs=2000, monthly_kwh=250, pv_kw=3.0, battery_cost_rs=0)
    roi_bat    = compute(monthly_bill_rs=2000, monthly_kwh=250, pv_kw=3.0, battery_cost_rs=50_000)
    assert roi_bat.total_cost_rs > roi_no_bat.total_cost_rs
    assert roi_bat.payback_years > roi_no_bat.payback_years
    assert roi_bat.monthly_savings_rs == pytest.approx(roi_no_bat.monthly_savings_rs)


def test_exact_known_values_350kwh():
    """
    End-to-end spot-check for 350 kWh/month with no battery or roof constraint.

    monthly_bill = 540 + 1620 + 50×11.35 = Rs 2727.50
    remaining_grid = 350 × 0.15 = 52.5 kWh  → bill = 52.5 × 5.40 = Rs 283.50
    export_credit  = 52.5 × 5.10              = Rs 267.75
    monthly_savings = 2727.50 − 283.50 + 267.75 = Rs 2711.75
    """
    from app.services import load_engine, solar_engine
    load   = load_engine.analyse(350)
    tariff = tariff_engine.compute_bill(350)
    solar  = solar_engine.size_system(load.daily_kwh)
    roi    = compute(tariff.total_rs, 350, solar.pv_kw, battery_cost_rs=0)

    assert tariff.total_rs      == pytest.approx(2727.50, abs=0.01)
    assert roi.export_credit_rs == pytest.approx(267.75,  abs=0.01)
    assert roi.monthly_savings_rs == pytest.approx(2711.75, abs=0.01)
    assert roi.system_cost_rs   == pytest.approx(solar.pv_kw * 1000 * 55, abs=1.0)
