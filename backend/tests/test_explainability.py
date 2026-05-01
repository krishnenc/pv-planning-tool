import pytest
from app.services import (
    battery_engine, load_engine, roi_engine, solar_engine, surface_area, tariff_engine
)
from app.services.explainability import explain_all

EXPECTED_KEYS = {
    "pv_kw", "panels", "battery", "system_cost",
    "roof_required", "monthly_bill", "monthly_savings", "payback", "roi_25yr",
}


def _run(monthly_kwh=350, roof_area=None, include_battery=False):
    load    = load_engine.analyse(monthly_kwh)
    tariff  = tariff_engine.compute_bill(monthly_kwh)
    solar   = solar_engine.size_system(load.daily_kwh)
    roof    = surface_area.evaluate(solar.pv_kw, roof_area)
    battery = battery_engine.size_battery(load.daily_kwh, include_battery)
    roi     = roi_engine.compute(tariff.total_rs, roof.pv_kw, battery.cost_rs)
    return explain_all(monthly_kwh, tariff, load, solar, battery, roof, roi)


def test_all_keys_present():
    result = _run()
    assert set(result.keys()) == EXPECTED_KEYS


def test_each_explanation_has_formula_and_steps():
    result = _run()
    for key, expl in result.items():
        assert expl.formula, f"{key}: formula is empty"
        assert len(expl.steps) >= 1, f"{key}: no steps"


def test_pv_kw_steps_correct():
    result = _run(monthly_kwh=350)
    pv = result["pv_kw"]
    assert pv.unit == "kW"
    # First step should show daily load
    assert "÷ 30" in pv.steps[0].expr or "30" in pv.steps[0].expr
    # Last step result should match pv_kw in the explanation
    assert pv.result == pv.steps[-1].result.split()[0]


def test_battery_not_included_explanation():
    result = _run(include_battery=False)
    assert result["battery"].result == "—"


def test_battery_included_explanation():
    result = _run(include_battery=True)
    bat = result["battery"]
    assert bat.unit == "kWh"
    assert bat.result != "—"
