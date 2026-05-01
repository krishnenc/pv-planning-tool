import pytest
from app.config import settings
from app.services.solar_engine import size_system


def test_effective_hours():
    solar = size_system(10.0)
    expected = settings.solar_irradiance_kwh_m2_day * (1 - settings.system_losses)
    assert solar.effective_hours == pytest.approx(expected, rel=1e-4)


def test_pv_kw_known_value():
    # 350 kWh/month → daily = 350/30 ≈ 11.667 kWh/day
    # effective_hours = 5.2 * 0.80 = 4.16
    # pv_kw = 11.667 / 4.16 ≈ 2.80 kW
    daily = 350 / 30
    solar = size_system(daily)
    expected = daily / (settings.solar_irradiance_kwh_m2_day * (1 - settings.system_losses))
    assert solar.pv_kw == pytest.approx(expected, rel=1e-2)


def test_pv_kw_scales_linearly():
    # Rounding to 2dp means results won't be exactly 2×, but should be within 0.02 kW
    s1 = size_system(10.0)
    s2 = size_system(20.0)
    assert s2.pv_kw == pytest.approx(s1.pv_kw * 2, abs=0.02)


# ── Additional PV sizing tests ────────────────────────────────────────────────

def test_pv_kw_always_positive():
    """Any positive daily load must produce a positive PV capacity."""
    for daily in [0.1, 1.0, 5.0, 50.0, 200.0]:
        assert size_system(daily).pv_kw > 0


def test_small_consumption():
    """10 kWh/month → daily ≈ 0.333 kWh/day → pv_kw < 0.1 kW."""
    solar = size_system(10 / 30)
    assert 0 < solar.pv_kw < 0.2


def test_large_consumption():
    """1000 kWh/month → daily ≈ 33.33 kWh/day → pv_kw ~ 8 kW."""
    solar = size_system(1000 / 30)
    expected = (1000 / 30) / (settings.solar_irradiance_kwh_m2_day * (1 - settings.system_losses))
    assert solar.pv_kw == pytest.approx(expected, rel=0.01)


def test_effective_hours_exact():
    """Effective sun hours = 5.2 × (1 − 0.20) = 4.16 exactly."""
    solar = size_system(10.0)
    assert solar.effective_hours == pytest.approx(4.16, abs=1e-6)


def test_pv_kw_formula_exact():
    """Spot-check: daily_kwh=10, effective=4.16 → pv_kw = round(10/4.16, 2) = 2.40."""
    solar = size_system(10.0)
    assert solar.pv_kw == pytest.approx(round(10.0 / 4.16, 2), abs=0.01)


def test_daily_kwh_preserved_in_result():
    """The daily_kwh input is echoed back unchanged for traceability."""
    solar = size_system(11.667)
    assert solar.daily_kwh == pytest.approx(11.667, abs=1e-9)
