import pytest
from app.config import settings
from app.services.surface_area import evaluate


def test_no_roof_unknown():
    result = evaluate(3.0, None)
    assert result.status == "unknown"
    assert result.available_m2 is None
    assert result.pv_kw == pytest.approx(3.0)


def test_adequate_roof_ok():
    result = evaluate(3.0, 100.0)
    assert result.status == "ok"
    assert result.pv_kw == pytest.approx(3.0)
    assert result.panel_count == 8   # ceil(3.0*1000/400) = 8
    assert result.required_m2 == pytest.approx(8 * settings.solar_panel_footprint_m2, abs=0.1)


def test_exact_roof_ok():
    panel_count = 8
    exact_area = panel_count * settings.solar_panel_footprint_m2
    result = evaluate(3.0, exact_area)
    assert result.status == "ok"


def test_limited_roof():
    # 8 panels needed (3 kW), roof only fits 4
    limited_area = 4 * settings.solar_panel_footprint_m2 - 0.1
    result = evaluate(3.0, limited_area)
    assert result.status == "limited"
    assert result.panel_count < 8
    assert result.pv_kw < 3.0


def test_limited_pv_kw_correct():
    limited_area = 5 * settings.solar_panel_footprint_m2 - 0.5  # fits 4 panels
    result = evaluate(3.0, limited_area)
    expected_panels = int(limited_area // settings.solar_panel_footprint_m2)
    expected_kw = round(expected_panels * settings.solar_panel_wattage / 1000, 2)
    assert result.pv_kw == pytest.approx(expected_kw, abs=0.01)
