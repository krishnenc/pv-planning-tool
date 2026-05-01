import pytest
from app.config import settings
from app.services.battery_engine import size_battery


def test_not_included():
    result = size_battery(11.667, include=False)
    assert result.included is False
    assert result.capacity_kwh is None
    assert result.cost_rs == 0.0


def test_included_capacity_is_daily_kwh():
    daily = 350 / 30
    result = size_battery(daily, include=True)
    assert result.included is True
    assert result.capacity_kwh == pytest.approx(round(daily, 1), abs=1e-9)


def test_included_cost():
    daily = 12.5
    result = size_battery(daily, include=True)
    assert result.cost_rs == pytest.approx(round(daily, 1) * settings.battery_cost_rs_kwh, abs=0.01)


def test_large_daily_kwh():
    result = size_battery(50.0, include=True)
    assert result.capacity_kwh == 50.0
    assert result.cost_rs > 0
