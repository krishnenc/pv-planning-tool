import pytest
from app.config import settings
from app.services.roi_engine import compute


def test_system_cost():
    roi = compute(monthly_bill_rs=2000, pv_kw=3.0, battery_cost_rs=0)
    assert roi.system_cost_rs == pytest.approx(3.0 * 1000 * settings.average_system_cost_rs_wp, abs=0.01)


def test_total_cost_includes_battery():
    battery_rs = 50_000.0
    roi = compute(monthly_bill_rs=2000, pv_kw=3.0, battery_cost_rs=battery_rs)
    expected = 3.0 * 1000 * settings.average_system_cost_rs_wp + battery_rs
    assert roi.total_cost_rs == pytest.approx(expected, abs=0.01)


def test_monthly_savings():
    roi = compute(monthly_bill_rs=2000, pv_kw=3.0, battery_cost_rs=0)
    assert roi.monthly_savings_rs == pytest.approx(2000 * settings.grid_offset_factor, abs=0.01)


def test_payback():
    roi = compute(monthly_bill_rs=2000, pv_kw=3.0, battery_cost_rs=0)
    expected = roi.total_cost_rs / roi.annual_savings_rs
    assert roi.payback_years == pytest.approx(expected, rel=0.01)


def test_roi_25yr():
    roi = compute(monthly_bill_rs=2000, pv_kw=3.0, battery_cost_rs=0)
    lifetime = roi.annual_savings_rs * settings.project_lifetime_years
    expected = (lifetime - roi.total_cost_rs) / roi.total_cost_rs * 100
    assert roi.roi_25yr_pct == pytest.approx(expected, abs=0.2)


# ── Additional ROI correctness tests ─────────────────────────────────────────

def test_annual_savings_is_twelve_times_monthly():
    roi = compute(monthly_bill_rs=3000, pv_kw=4.0, battery_cost_rs=0)
    assert roi.annual_savings_rs == pytest.approx(roi.monthly_savings_rs * 12, abs=0.01)


def test_zero_pv_kw_gives_zero_system_cost():
    roi = compute(monthly_bill_rs=2000, pv_kw=0.0, battery_cost_rs=0)
    assert roi.system_cost_rs == 0.0
    assert roi.total_cost_rs == 0.0


def test_zero_annual_savings_gives_zero_payback():
    """When the bill is zero there are no savings and payback is returned as 0."""
    roi = compute(monthly_bill_rs=0, pv_kw=3.0, battery_cost_rs=0)
    assert roi.monthly_savings_rs == 0.0
    assert roi.annual_savings_rs == 0.0
    assert roi.payback_years == 0.0


def test_negative_roi_when_system_costs_more_than_lifetime_savings():
    """A very large system on a tiny bill should produce negative 25-yr ROI."""
    roi = compute(monthly_bill_rs=100, pv_kw=20.0, battery_cost_rs=0)
    assert roi.roi_25yr_pct < 0


def test_battery_cost_increases_total_and_worsens_payback():
    """Adding battery cost increases total investment and extends payback."""
    roi_no_bat = compute(monthly_bill_rs=2000, pv_kw=3.0, battery_cost_rs=0)
    roi_bat    = compute(monthly_bill_rs=2000, pv_kw=3.0, battery_cost_rs=50_000)
    assert roi_bat.total_cost_rs > roi_no_bat.total_cost_rs
    assert roi_bat.payback_years > roi_no_bat.payback_years
    # Monthly savings should be identical (battery doesn't change savings)
    assert roi_bat.monthly_savings_rs == pytest.approx(roi_no_bat.monthly_savings_rs)


def test_exact_known_values_350kwh():
    """
    End-to-end spot-check for 350 kWh/month with no battery or roof constraint.
    monthly_bill = 540 + 1620 + 50×11.35 = Rs 2727.50
    monthly_savings = 2727.50 × 0.85 = Rs 2318.375 → 2318.38
    pv_kw ≈ 2.80, system_cost = 2800 × 55 = Rs 154,000
    """
    from app.services import tariff_engine, load_engine, solar_engine
    load   = load_engine.analyse(350)
    tariff = tariff_engine.compute_bill(350)
    solar  = solar_engine.size_system(load.daily_kwh)
    roi    = compute(tariff.total_rs, solar.pv_kw, battery_cost_rs=0)

    assert tariff.total_rs == pytest.approx(2727.50, abs=0.01)
    assert roi.monthly_savings_rs == pytest.approx(2727.50 * 0.85, abs=0.01)
    assert roi.system_cost_rs == pytest.approx(solar.pv_kw * 1000 * 55, abs=1.0)
