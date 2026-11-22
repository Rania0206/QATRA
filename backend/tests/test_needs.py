"""A-04: daily irrigation need per farm (ET0 x Kc - effective rain) and GET /api/forecast/needs."""
import pytest
from fastapi.testclient import TestClient

from app.engine.farms import get_farm, list_farms
from app.engine.needs import (
    NeedsForecast,
    daily_need,
    forecast_dates,
    weather_for,
    kc_for,
    needs_forecast,
    water_need,
)
from app.main import app
from app.store import init_store

init_store()

FIRST_DAY = "2026-11-21"  # first day of the data pack forecast: ET0 2.68 mm, no rain


# ---------- the formula
@pytest.mark.parametrize("et0,kc,rain,area", [(3.0, 1.15, 0.0, 5.0), (2.68, 0.7, 0.1, 4.0), (7.0, 0.95, 0.0, 0.8)])
def test_need_m3_is_need_mm_times_area_times_10(et0, kc, rain, area):
    n = water_need(et0, kc, rain, area)
    assert n["etc_mm"] == pytest.approx(et0 * kc)
    assert n["effective_rain_mm"] == pytest.approx(0.7 * rain)
    assert n["need_mm"] == pytest.approx(max(0, et0 * kc - 0.7 * rain))
    assert n["need_m3"] == pytest.approx(n["need_mm"] * area * 10)


def test_rain_larger_than_etc_gives_zero():
    n = water_need(et0_mm=2.0, kc=1.0, rain_mm=10.0, area_ha=3.0)
    assert n["need_mm"] == 0 and n["need_m3"] == 0


def test_real_rainy_day_needs_nothing():
    # 2026-11-27: 5.1 mm of rain (3.57 mm effective) is more than any crop's ETc that day
    items = [i for i in needs_forecast(7) if i.date == "2026-11-27"]
    assert items and all(i.need_m3 == 0 for i in items)


# ---------- from the data pack
def test_daily_need_uses_the_forecast_and_crop_kc():
    b = get_farm("B")  # olive, 4 ha, Kc mid 0.70
    n = daily_need(b, FIRST_DAY)
    assert (n.et0_mm, n.kc) == (2.68, 0.7)
    assert n.etc_mm == pytest.approx(2.68 * 0.7, abs=0.01)
    assert n.need_m3 == pytest.approx(2.68 * 0.7 * 4 * 10, abs=0.1)


def test_blocked_crop_still_gets_a_need():
    c = get_farm("C")  # lettuce is blocked by law, but this module only computes the need
    assert daily_need(c, FIRST_DAY).need_m3 > 0


def test_kc_for():
    assert kc_for("olive") == 0.70 and kc_for("alfalfa") == 0.95
    assert kc_for("barley_fodder") == kc_for("barley") == 1.15  # alias: no row of its own in crop_kc
    assert kc_for("dragonfruit") is None


def test_unknown_crop_does_not_crash():
    farm = get_farm("A").model_copy(update={"crop": "dragonfruit"})
    n = daily_need(farm, FIRST_DAY)
    assert n.kc is None and n.need_m3 is None and n.et0_mm == 2.68


def test_not_a_date_returns_none():
    assert daily_need(get_farm("A"), "not-a-date") is None
    assert daily_need(get_farm("A"), "2026-02-29") is None  # no such day in 2026


# ---------- weather for any date (A-05e): forecast, else historical
def test_weather_source_forecast_summer_and_climate():
    a = get_farm("A")
    assert weather_for("2026-11-21")[2] == "forecast"
    assert weather_for("2026-08-26") == (7.88, 0.0, "historical")  # exact day of weather_summer2026_sousse
    clim = weather_for("2026-03-15")  # not in the forecast nor the summer file: 30-year average of 15 March
    assert clim[2] == "historical" and clim[0] > 0
    assert daily_need(a, "2026-11-21").weather_source == "forecast"
    assert daily_need(a, "2030-01-01").weather_source == "historical"


def test_summer_day_gives_real_needs_for_a_b_d():
    for fid, expected in (("A", 149.7), ("B", 220.6), ("D", 358.5)):  # ET0 7.88 mm x Kc x area x 10
        n = daily_need(get_farm(fid), "2026-08-26")
        assert n.need_m3 == pytest.approx(expected, abs=0.1) and n.weather_source == "historical"


def test_10_farms_x_7_days():
    items = needs_forecast(7)
    assert len(items) == 70
    assert len({(i.date, i.farm_id) for i in items}) == 70
    assert [i.date for i in items][0] == forecast_dates()[0]
    assert {i.farm_id for i in items} == {f.id for f in list_farms()}
    assert all(i.need_m3 is not None and i.need_m3 >= 0 for i in items)


def test_per_hectare_olive_needs_less_than_alfalfa_and_lettuce():
    per_ha = {f.id: daily_need(f, "2026-11-23").need_m3 / f.area_ha for f in list_farms()}
    assert per_ha["B"] < per_ha["A"] < per_ha["F"]  # olive < alfalfa < wheat


def test_days_and_farm_filters():
    assert len(needs_forecast(3)) == 30
    assert len(needs_forecast(7, farm_id="A")) == 7
    assert needs_forecast(7, farm_id="ZZ") == []
    late = needs_forecast(7, start="2026-11-25")  # 3 forecast days, then 4 historical days
    assert len(late) == 70
    assert [i.weather_source for i in late if i.farm_id == "A"] == ["forecast"] * 3 + ["historical"] * 4


# ---------- the endpoint
def test_endpoint_shape_matches_the_contract():
    with TestClient(app) as c:
        r = c.get("/api/forecast/needs")
    assert r.status_code == 200
    body = NeedsForecast.model_validate(r.json())
    assert body.start == forecast_dates()[0] and body.days == 7 and len(body.items) == 70
    assert body.tag.status == "PROJECTION"
    for key in ("date", "farm_id", "et0_mm", "kc", "need_m3"):  # the fields of contract row 12
        assert key in r.json()["items"][0]


def test_endpoint_filters_and_errors():
    with TestClient(app) as c:
        assert len(c.get("/api/forecast/needs?days=3").json()["items"]) == 30
        one = c.get("/api/forecast/needs?farm_id=D").json()
        assert {i["farm_id"] for i in one["items"]} == {"D"} and len(one["items"]) == 7
        assert c.get("/api/forecast/needs?farm_id=ZZ").status_code == 404
        far = c.get("/api/forecast/needs?start=2030-01-01&farm_id=A&days=2")
        assert far.status_code == 200 and {i["weather_source"] for i in far.json()["items"]} == {"historical"}
        assert c.get("/api/forecast/needs?start=nope").status_code == 404
        assert c.get("/api/forecast/needs?days=0").status_code == 422
