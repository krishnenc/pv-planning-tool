"""CEB 2026 progressive domestic tariff calculator."""
from dataclasses import dataclass

from app.config import settings


@dataclass
class TariffBreakdown:
    band_1_kwh: float
    band_1_rs: float
    band_2_kwh: float
    band_2_rs: float
    band_3_kwh: float
    band_3_rs: float
    band_4_kwh: float
    band_4_rs: float
    total_rs: float


def compute_bill(monthly_kwh: float) -> TariffBreakdown:
    """Apply the four-band CEB progressive tariff to a monthly consumption figure."""
    s = settings
    b1 = min(monthly_kwh, s.ceb_band_1_limit_kwh)
    b2 = min(
        max(monthly_kwh - s.ceb_band_1_limit_kwh, 0.0),
        s.ceb_band_2_limit_kwh - s.ceb_band_1_limit_kwh,
    )
    b3 = min(
        max(monthly_kwh - s.ceb_band_2_limit_kwh, 0.0),
        s.ceb_band_3_limit_kwh - s.ceb_band_2_limit_kwh,
    )
    b4 = max(monthly_kwh - s.ceb_band_3_limit_kwh, 0.0)

    r1 = round(b1 * s.ceb_band_1_rate, 2)
    r2 = round(b2 * s.ceb_band_2_rate, 2)
    r3 = round(b3 * s.ceb_band_3_rate, 2)
    r4 = round(b4 * s.ceb_band_4_rate, 2)

    return TariffBreakdown(
        band_1_kwh=b1, band_1_rs=r1,
        band_2_kwh=b2, band_2_rs=r2,
        band_3_kwh=b3, band_3_rs=r3,
        band_4_kwh=b4, band_4_rs=r4,
        total_rs=round(r1 + r2 + r3 + r4, 2),
    )
