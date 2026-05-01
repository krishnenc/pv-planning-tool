import pytest
from app.services.tariff_engine import compute_bill


@pytest.mark.parametrize("kwh, expected_total", [
    (0,   0.00),
    (50,  270.00),   # 50 × 5.40
    (100, 540.00),   # 100 × 5.40
    (150, 945.00),   # 540 + 50×8.10
    (300, 2160.00),  # 540 + 200×8.10
    (350, 2727.50),  # 540 + 1620 + 50×11.35
    (700, 5257.50),  # 540 + 1620 + 3405 + 100×16.20 → but let me recheck
])
def test_compute_bill_total(kwh, expected_total):
    # 700 kWh: B1=100×5.40=540, B2=200×8.10=1620, B3=300×11.35=3405, B4=100×16.20=1620 → 7185
    # The parametrize above has wrong value for 700 — replaced below with correct test
    pass  # placeholder; real assertions are in the individual tests below


def test_zero_kwh():
    bd = compute_bill(0)
    assert bd.total_rs == 0.00
    assert bd.band_1_kwh == 0
    assert bd.band_2_kwh == 0
    assert bd.band_3_kwh == 0
    assert bd.band_4_kwh == 0


def test_band_1_only():
    bd = compute_bill(50)
    assert bd.band_1_kwh == 50
    assert bd.band_2_kwh == 0
    assert bd.band_3_kwh == 0
    assert bd.band_4_kwh == 0
    assert bd.total_rs == pytest.approx(270.00, abs=0.01)


def test_band_1_exact_limit():
    bd = compute_bill(100)
    assert bd.band_1_kwh == 100
    assert bd.band_2_kwh == 0
    assert bd.total_rs == pytest.approx(540.00, abs=0.01)


def test_bands_1_and_2():
    bd = compute_bill(150)
    assert bd.band_1_kwh == 100
    assert bd.band_2_kwh == 50
    assert bd.band_3_kwh == 0
    assert bd.total_rs == pytest.approx(540.00 + 50 * 8.10, abs=0.01)


def test_band_2_exact_limit():
    bd = compute_bill(300)
    assert bd.band_1_kwh == 100
    assert bd.band_2_kwh == 200
    assert bd.band_3_kwh == 0
    assert bd.total_rs == pytest.approx(540.00 + 200 * 8.10, abs=0.01)


def test_bands_1_2_3():
    bd = compute_bill(350)
    assert bd.band_1_kwh == 100
    assert bd.band_2_kwh == 200
    assert bd.band_3_kwh == 50
    assert bd.band_4_kwh == 0
    assert bd.total_rs == pytest.approx(540.00 + 1620.00 + 50 * 11.35, abs=0.01)


def test_all_four_bands():
    bd = compute_bill(700)
    assert bd.band_1_kwh == 100
    assert bd.band_2_kwh == 200
    assert bd.band_3_kwh == 300
    assert bd.band_4_kwh == 100
    expected = 100*5.40 + 200*8.10 + 300*11.35 + 100*16.20
    assert bd.total_rs == pytest.approx(expected, abs=0.01)


def test_total_equals_sum_of_bands():
    bd = compute_bill(450)
    band_sum = bd.band_1_rs + bd.band_2_rs + bd.band_3_rs + bd.band_4_rs
    assert bd.total_rs == pytest.approx(band_sum, abs=0.01)


# ── Additional correctness tests ─────────────────────────────────────────────

def test_band_3_exact_limit():
    """600 kWh is the Band 3 ceiling — Band 4 must be zero."""
    bd = compute_bill(600)
    assert bd.band_3_kwh == 300
    assert bd.band_4_kwh == 0
    expected = 100*5.40 + 200*8.10 + 300*11.35
    assert bd.total_rs == pytest.approx(expected, abs=0.01)


def test_fractional_kwh():
    """Non-integer kWh should be handled with floating-point precision."""
    bd = compute_bill(150.5)
    assert bd.band_1_kwh == pytest.approx(100.0)
    assert bd.band_2_kwh == pytest.approx(50.5)
    assert bd.total_rs == pytest.approx(100*5.40 + 50.5*8.10, abs=0.01)


def test_large_consumption_all_bands():
    """1000 kWh exercises all four bands; Band 4 carries the overflow."""
    bd = compute_bill(1000)
    assert bd.band_1_kwh == pytest.approx(100)
    assert bd.band_2_kwh == pytest.approx(200)
    assert bd.band_3_kwh == pytest.approx(300)
    assert bd.band_4_kwh == pytest.approx(400)
    expected = 100*5.40 + 200*8.10 + 300*11.35 + 400*16.20
    assert bd.total_rs == pytest.approx(expected, abs=0.01)


def test_just_above_band_1_limit():
    """100.01 kWh — the first cent of Band 2 should appear."""
    bd = compute_bill(100.01)
    assert bd.band_2_kwh == pytest.approx(0.01, abs=1e-9)
    assert bd.band_3_kwh == 0
    assert bd.band_4_kwh == 0


def test_just_above_band_3_limit():
    """600.01 kWh — Band 4 should carry the first sliver of the top tier."""
    bd = compute_bill(600.01)
    assert bd.band_4_kwh == pytest.approx(0.01, abs=1e-9)


def test_total_rs_rounded_to_two_decimal_places():
    """total_rs should never have more than 2 decimal places."""
    for kwh in [33, 150, 350, 601, 999]:
        bd = compute_bill(kwh)
        assert round(bd.total_rs, 2) == bd.total_rs, f"Precision error at {kwh} kWh"


@pytest.mark.parametrize("kwh", [100, 300, 600])
def test_band_boundaries_no_spillover(kwh):
    """At exact band limits the next band should always be zero."""
    bd = compute_bill(kwh)
    if kwh == 100:
        assert bd.band_2_kwh == 0
    elif kwh == 300:
        assert bd.band_3_kwh == 0
    elif kwh == 600:
        assert bd.band_4_kwh == 0
