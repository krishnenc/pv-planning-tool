import pytest
from app.services.load_engine import analyse


def test_daily_kwh():
    profile = analyse(300)
    assert profile.daily_kwh == pytest.approx(10.0, abs=1e-9)


def test_annual_kwh():
    profile = analyse(300)
    assert profile.annual_kwh == pytest.approx(3600.0, abs=1e-9)


def test_all_fields_consistent():
    profile = analyse(350)
    assert profile.monthly_kwh == 350
    assert profile.daily_kwh == pytest.approx(350 / 30, rel=1e-9)
    assert profile.annual_kwh == pytest.approx(350 * 12, rel=1e-9)
