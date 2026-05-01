import pytest
import pytest_asyncio
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_basic_calculation(client: AsyncClient):
    resp = await client.post("/api/v1/calculate", json={"monthly_kwh": 350})
    assert resp.status_code == 200
    data = resp.json()
    assert data["monthly_kwh"] == 350
    assert data["pv_kw"] > 0
    assert data["panel_count"] > 0
    assert data["battery_kwh"] is None
    assert data["monthly_bill_rs"] > 0
    assert data["monthly_savings_rs"] > 0
    assert data["payback_years"] > 0
    assert data["explanations"] is None


@pytest.mark.asyncio
async def test_limited_roof(client: AsyncClient):
    resp = await client.post(
        "/api/v1/calculate",
        json={"monthly_kwh": 350, "roof_area_m2": 10},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["roof"]["status"] == "limited"
    assert data["pv_kw"] < 3.0   # reduced from unconstrained ~2.81 kW


@pytest.mark.asyncio
async def test_with_battery(client: AsyncClient):
    resp = await client.post(
        "/api/v1/calculate",
        json={"monthly_kwh": 350, "include_battery": True},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["battery_kwh"] is not None
    assert data["battery_kwh"] > 0
    assert data["battery_cost_rs"] > 0
    assert data["total_cost_rs"] > data["system_cost_rs"]


@pytest.mark.asyncio
async def test_with_explanations(client: AsyncClient):
    resp = await client.post(
        "/api/v1/calculate",
        json={"monthly_kwh": 350, "include_explanations": True},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["explanations"] is not None
    expl = data["explanations"]
    assert "pv_kw" in expl
    assert "monthly_bill" in expl
    assert expl["pv_kw"]["formula"] != ""
    assert len(expl["pv_kw"]["steps"]) >= 1


# ── Validation / error cases ──────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_zero_kwh_rejected(client: AsyncClient):
    resp = await client.post("/api/v1/calculate", json={"monthly_kwh": 0})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_negative_kwh_rejected(client: AsyncClient):
    resp = await client.post("/api/v1/calculate", json={"monthly_kwh": -50})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_missing_monthly_kwh_rejected(client: AsyncClient):
    resp = await client.post("/api/v1/calculate", json={})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_non_numeric_kwh_rejected(client: AsyncClient):
    resp = await client.post("/api/v1/calculate", json={"monthly_kwh": "lots"})
    assert resp.status_code == 422


# ── Combined options ──────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_battery_plus_explanations(client: AsyncClient):
    resp = await client.post(
        "/api/v1/calculate",
        json={"monthly_kwh": 350, "include_battery": True, "include_explanations": True},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["battery_kwh"] is not None
    assert data["explanations"]["battery"]["result"] != "—"


@pytest.mark.asyncio
async def test_adequate_roof_status_ok(client: AsyncClient):
    resp = await client.post(
        "/api/v1/calculate",
        json={"monthly_kwh": 350, "roof_area_m2": 100},
    )
    assert resp.status_code == 200
    assert resp.json()["roof"]["status"] == "ok"


@pytest.mark.asyncio
async def test_response_has_all_required_fields(client: AsyncClient):
    resp = await client.post("/api/v1/calculate", json={"monthly_kwh": 200})
    assert resp.status_code == 200
    data = resp.json()
    required = {
        "monthly_kwh", "monthly_bill_rs", "pv_kw", "panel_count",
        "battery_kwh", "roof", "system_cost_rs", "battery_cost_rs",
        "total_cost_rs", "monthly_savings_rs", "annual_savings_rs",
        "payback_years", "roi_25yr_pct",
    }
    assert required.issubset(data.keys())
