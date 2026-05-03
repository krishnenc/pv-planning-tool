from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App
    app_name: str = "SolarMoris — Hybrid Solar Feasibility Tool"
    app_env: str = "development"
    app_debug: bool = False
    secret_key: str = "insecure-dev-key"
    allowed_origins: List[str] = ["http://localhost:3000"]

    # Database
    database_url: str = "sqlite+aiosqlite:///./solar_dev.db"

    # API
    api_v1_prefix: str = "/api/v1"

    # CEB 2026 – Central Electricity Board Mauritius
    # Domestic progressive tariff bands (Rs/kWh)
    ceb_band_1_limit_kwh: int = 100           # 0–100 kWh
    ceb_band_1_rate: float = 5.40
    ceb_band_2_limit_kwh: int = 300           # 101–300 kWh
    ceb_band_2_rate: float = 8.10
    ceb_band_3_limit_kwh: int = 600           # 301–600 kWh
    ceb_band_3_rate: float = 11.35
    ceb_band_4_rate: float = 16.20            # > 600 kWh

    # Net metering / export tariff
    ceb_export_tariff_rs_kwh: float = 5.10

    # Mauritius solar resource
    solar_irradiance_kwh_m2_day: float = 5.2   # annual average kWh/m²/day
    solar_panel_efficiency: float = 0.20        # 20% monocrystalline
    system_losses: float = 0.20                 # inverter + temperature + wiring
    solar_panel_degradation_per_year: float = 0.005  # 0.5%/year

    # Costs (2026 benchmarks, Rs)
    average_system_cost_rs_wp: float = 55.0     # Rs per Wp installed
    battery_cost_rs_kwh: float = 28_000.0       # Rs per kWh storage
    maintenance_cost_rs_kw_year: float = 1_200.0

    # Panel & system constants
    solar_panel_wattage: int = 400              # Wp per panel
    solar_panel_footprint_m2: float = 2.0       # m² per panel (panel + spacing)
    grid_offset_factor: float = 0.85            # fraction of bill offset by solar

    # Financial assumptions
    inflation_rate: float = 0.045               # 4.5% Mauritius CPI
    discount_rate: float = 0.08                 # 8% WACC
    project_lifetime_years: int = 25

    # Contact form — email notifications (all optional; omit to disable email)
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    contact_email: str = ""   # destination address for contact notifications


def get_settings() -> Settings:
    return Settings()


settings = get_settings()
